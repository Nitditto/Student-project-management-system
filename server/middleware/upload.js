import multer from "multer";
import path from "path";

// ─── Memory storage (files arrive as Buffer in req.file.buffer) ─────────────
// Files are uploaded directly to Supabase Storage from the controller/service
// layer, so we never need to write them to disk.
const storage = multer.memoryStorage();

// ─── File type filter ────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/x-zip-compressed",
    "application/x-rar-compressed",
    "application/x-rar",
    "application/vnd.rar",
    "application/octet-stream",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/gif",
    "text/plain",
    "application/javascript",
    "text/css",
    "text/html",
    "application/json",
  ];
  const allowedExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".zip",
    ".rar",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".xls",
    ".xlsx",
    ".txt",
    ".js",
    ".css",
    ".html",
    ".json",
  ];

  const fileExt = path.extname(file.originalname).toLowerCase();
  if (
    allowedTypes.includes(file.mimetype) ||
    allowedExtensions.includes(fileExt)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, DOCX, PPTX, ZIP, RAR, images and code files are allowed",
      ),
      false,
    );
  }
};

// ─── Multer instance ─────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 10,
  },
});

// ─── Error handler middleware ─────────────────────────────────────────────────
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum file size is 50MB",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files uploaded. Maximum file count is 10",
      });
    }
  }
  if (err?.message?.includes("Invalid file type")) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
};

// ─── Filename decoder middleware ──────────────────────────────────────────────
// With memoryStorage, originalname encoding still needs fixing for Vietnamese names.
const decodeFilenameMiddleware = (req, res, next) => {
  const decode = (f) => {
    try {
      f.originalname = Buffer.from(f.originalname, "latin1").toString("utf-8");
    } catch (_) { /* keep original */ }
  };
  if (req.file) decode(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(decode);
    } else {
      Object.values(req.files).flat().forEach(decode);
    }
  }
  next();
};

import { uploadToCloud } from "../services/supabaseStorage.js";

const uploadToCloudMiddleware = async (req, res, next) => {
  // If no files uploaded, continue
  if (!req.file && !req.files) {
    return next();
  }

  try {
    // Handle single file (multer upload.single())
    if (req.file) {
      const destination = `uploads/${Date.now()}-${req.file.filename}`;
      const cloudUrl = await uploadToCloud(req.file.path, destination, req.file.mimetype);
      if (cloudUrl) {
        req.file.path = cloudUrl; // Replace local path with cloud URL!
      }
    }

    // Handle multiple files (multer upload.array() or upload.fields())
    if (req.files) {
      if (Array.isArray(req.files)) {
        await Promise.all(
          req.files.map(async (file) => {
            const destination = `uploads/${Date.now()}-${file.filename}`;
            const cloudUrl = await uploadToCloud(file.path, destination, file.mimetype);
            if (cloudUrl) {
              file.path = cloudUrl; // Replace local path with cloud URL!
            }
          })
        );
      } else {
        // Multi-fields object (e.g. { files: [...], evidence: [...] })
        const keys = Object.keys(req.files);
        await Promise.all(
          keys.map(async (key) => {
            await Promise.all(
              req.files[key].map(async (file) => {
                const destination = `uploads/${Date.now()}-${file.filename}`;
                const cloudUrl = await uploadToCloud(file.path, destination, file.mimetype);
                if (cloudUrl) {
                  file.path = cloudUrl; // Replace local path with cloud URL!
                }
              })
            );
          })
        );
      }
    }
  } catch (err) {
    console.error("[uploadToCloudMiddleware] Cloud upload failed:", err.message);
  }

  next();
};

// Redefine standard multer methods to automatically chain the cloud upload middleware
const originalSingle = upload.single;
const originalArray = upload.array;
const originalFields = upload.fields;

upload.single = function (...args) {
  return [originalSingle.apply(upload, args), uploadToCloudMiddleware];
};

upload.array = function (...args) {
  return [originalArray.apply(upload, args), uploadToCloudMiddleware];
};

upload.fields = function (...args) {
  return [originalFields.apply(upload, args), uploadToCloudMiddleware];
};

export { upload, handleUploadError, decodeFilenameMiddleware, uploadToCloudMiddleware };
