import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import path from "path";

// ─── S3 Client (Supabase S3-compatible) ──────────────────────────────────────
let _client = null;

const getClient = () => {
  if (!_client) {
    const endpoint = process.env.SUPABASE_S3_ENDPOINT;
    const accessKeyId = process.env.SUPABASE_S3_ACCESS_KEY;
    const secretAccessKey = process.env.SUPABASE_S3_SECRET_KEY;
    const region = process.env.SUPABASE_S3_REGION || "ap-southeast-2";

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Supabase S3 is not configured. Please set SUPABASE_S3_ENDPOINT, SUPABASE_S3_ACCESS_KEY, and SUPABASE_S3_SECRET_KEY in .env"
      );
    }

    _client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true, // required for Supabase S3
    });
  }
  return _client;
};

const BUCKET = () => process.env.SUPABASE_BUCKET || "project-files";

// Build the public URL from the endpoint
// endpoint: https://<ref>.storage.supabase.co/storage/v1/s3
// public:   https://<ref>.storage.supabase.co/storage/v1/object/public/<bucket>/<path>
const buildPublicUrl = (destPath) => {
  const endpoint = process.env.SUPABASE_S3_ENDPOINT || "";
  // Replace /s3 suffix with /object/public/<bucket>/<path>
  const base = endpoint.replace(/\/s3\/?$/, "");
  return `${base}/object/public/${BUCKET()}/${destPath}`;
};

/**
 * Upload a file buffer to Supabase Storage via S3-compatible API.
 * @param {Buffer} buffer   - File contents
 * @param {string} mimetype - MIME type (e.g. "application/pdf")
 * @param {string} destPath - Storage path inside the bucket (e.g. "projects/abc123/report-123.pdf")
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export const uploadToSupabase = async (buffer, mimetype, destPath) => {
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: destPath,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  return buildPublicUrl(destPath);
};

/**
 * Delete a file from Supabase Storage.
 * @param {string} destPath - Same key used during upload
 */
export const deleteFromSupabase = async (destPath) => {
  try {
    const client = getClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: BUCKET(), Key: destPath })
    );
  } catch (err) {
    console.warn(`Supabase delete warning for "${destPath}": ${err.message}`);
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
    .slice(0, 80); // cap length
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  return `${folder}/${id}/${base}-${uniqueSuffix}${ext}`;
};
