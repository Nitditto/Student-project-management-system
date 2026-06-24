import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);
const ws = require("ws");

// ─── WebSocket stub (only needed for environments without native WS) ──────────
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = ws;
}

// ─── Supabase JS Client ───────────────────────────────────────────────────────
let _supabase = null;

const getSupabaseClient = () => {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      throw new Error(
        "Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SECRET_KEY in .env"
      );
    }

    _supabase = createClient(url, key, {
      auth: { persistSession: false },
      realtime: { transport: ws },
    });
  }
  return _supabase;
};

const BUCKET = () => process.env.SUPABASE_BUCKET || "Student_Management";

// Build the public URL for a given storage path
const buildPublicUrl = (destPath) => {
  const url = process.env.SUPABASE_URL || "";
  const bucket = BUCKET();
  return `${url}/storage/v1/object/public/${bucket}/${destPath}`;
};

/**
 * Upload a file buffer to Supabase Storage via JS client.
 * @param {Buffer} buffer   - File contents
 * @param {string} mimetype - MIME type (e.g. "application/pdf")
 * @param {string} destPath - Storage path inside the bucket
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export const uploadToSupabase = async (buffer, mimetype, destPath) => {
  const supabase = getSupabaseClient();
  const bucket = BUCKET();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(destPath, buffer, {
      contentType: mimetype,
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return buildPublicUrl(destPath);
};

/**
 * Delete a file from Supabase Storage.
 * @param {string} destPath - Same path used during upload
 */
export const deleteFromSupabase = async (destPath) => {
  try {
    const supabase = getSupabaseClient();
    const bucket = BUCKET();
    const { error } = await supabase.storage.from(bucket).remove([destPath]);
    if (error) {
      console.warn(
        `Supabase delete warning for "${destPath}": ${error.message}`
      );
    }
  } catch (err) {
    console.warn(`Supabase delete warning for "${destPath}": ${err.message}`);
  }
};

/**
 * Delete a file from Supabase Storage by its public URL.
 * @param {string} fileUrl - Public URL of the file
 */
export const deleteFileByUrl = async (fileUrl) => {
  if (!fileUrl) return;
  try {
    const bucket = BUCKET();
    const token = `/storage/v1/object/public/${bucket}/`;
    const idx = fileUrl.indexOf(token);
    if (idx !== -1) {
      const destPath = decodeURIComponent(fileUrl.substring(idx + token.length));
      await deleteFromSupabase(destPath);
    } else {
      // Fallback: match by "/storage/v1/object/public/" and take the next part
      const genericToken = "/storage/v1/object/public/";
      const genIdx = fileUrl.indexOf(genericToken);
      if (genIdx !== -1) {
        const remaining = fileUrl.substring(genIdx + genericToken.length);
        const parts = remaining.split("/");
        if (parts.length > 1) {
          const destPath = decodeURIComponent(parts.slice(1).join("/"));
          await deleteFromSupabase(destPath);
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to delete file by URL "${fileUrl}":`, err.message);
  }
};


/**
 * Build a sanitised, unique storage path.
 * @param {string} folder   - e.g. "projects", "submissions", "messages"
 * @param {string} id       - e.g. projectId, groupId
 * @param {string} filename - Original filename
 * @returns {string}
 */
export const buildStoragePath = (folder, id, filename) => {
  const ext = path.extname(filename) || "";
  const base = path
    .basename(filename, ext)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  return `${folder}/${id}/${base}-${uniqueSuffix}${ext}`;
};
