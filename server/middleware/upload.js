import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    if (req.route.path.includes("/upload/:projectId")) {
      uploadPath = path.join(
        __dirname,
        "../uploads/projects",
        req.params.projectId,
      );
    } else if (req.route.path.includes("/assessments/")) {
      uploadPath = path.join(
        __dirname,
        "../uploads/assessments",
        req.params.projectId || "general",
        req.params.milestoneCode || "misc",
      );
    } else if (req.route.path.includes("/peer-evaluations")) {
      uploadPath = path.join(
        __dirname,
        "../uploads/assessments",
        req.params.projectId || "general",
        "M6",
      );
    } else if (req.route.path.includes("/upload/:userId")) {
      uploadPath = path.join(__dirname, "../uploads/users", req.params.userId);
    } else {
      uploadPath = path.join(__dirname, "../uploads/temp");
    }
    ensureDirExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const decodedName = Buffer.from(file.originalname, "latin1").toString("utf-8");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(decodedName);
    const baseName = path
      .basename(decodedName, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

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

  const fieExt = path.extname(file.originalname).toLowerCase();
  if (
    allowedTypes.includes(file.mimetype) ||
    allowedExtensions.includes(fieExt)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, DOCX, PPTX, ZIP, RAR, IMAGES and code files are allowed",
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10,
  },
});

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
    if (err.message && err.message.includes("Invalid file type")) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }
  next(err);
};

const decodeFilenameMiddleware = (req, res, next) => {
  if (req.file) {
    try {
      req.file.originalname = Buffer.from(req.file.originalname, "latin1").toString("utf-8");
    } catch (e) {
      console.warn("Filename decoding failed", e);
    }
  }
  if (req.files) {
    try {
      if (Array.isArray(req.files)) {
        req.files.forEach(f => {
          f.originalname = Buffer.from(f.originalname, "latin1").toString("utf-8");
        });
      } else {
        Object.keys(req.files).forEach(key => {
          req.files[key].forEach(f => {
            f.originalname = Buffer.from(f.originalname, "latin1").toString("utf-8");
          });
        });
      }
    } catch (e) {
      console.warn("Files decoding failed", e);
    }
  }
  next();
};

export { upload, handleUploadError, decodeFilenameMiddleware };
