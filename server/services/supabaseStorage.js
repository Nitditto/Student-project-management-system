import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { config } from "dotenv";

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET || "fyp-storage";

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    console.log("[Supabase Storage] Client initialized successfully.");
  } catch (err) {
    console.error("[Supabase Storage] Initialization error:", err.message);
  }
} else {
  console.log("[Supabase Storage] Credentials missing. Local fallback active.");
}

/**
 * Uploads a local file to Supabase Storage.
 * Deletes the local temp file upon successful upload.
 * 
 * @param {string} localFilePath - Path to the local temp file
 * @param {string} destinationPath - Path within the Supabase bucket
 * @param {string} mimetype - Content type of the file
 * @returns {Promise<string|null>} Public URL of the uploaded file, or null if failed/skipped
 */
export const uploadToCloud = async (localFilePath, destinationPath, mimetype) => {
  if (!supabase) {
    return null;
  }

  try {
    if (!fs.existsSync(localFilePath)) {
      console.warn(`[Supabase Storage] Local file does not exist: ${localFilePath}`);
      return null;
    }

    const fileBuffer = fs.readFileSync(localFilePath);
    
    console.log(`[Supabase Storage] Uploading ${localFilePath} to ${destinationPath}...`);
    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .upload(destinationPath, fileBuffer, {
        contentType: mimetype,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from(supabaseBucket)
      .getPublicUrl(destinationPath);

    console.log(`[Supabase Storage] Upload successful: ${publicUrlData.publicUrl}`);

    // Delete temporary file from local storage after successful upload
    fs.unlink(localFilePath, (unlinkErr) => {
      if (unlinkErr) {
        console.warn(`[Supabase Storage] Error deleting local temp file ${localFilePath}:`, unlinkErr.message);
      } else {
        console.log(`[Supabase Storage] Cleaned up local temp file: ${localFilePath}`);
      }
    });

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error(`[Supabase Storage] Upload failed for ${localFilePath}:`, err.message);
    return null;
  }
};
