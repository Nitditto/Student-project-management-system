import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ErrorHandler from "../middleware/error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const streamDownload = (filePath, res, originalName) => {
  try {
    let absolutePath = filePath;
    if (!fs.existsSync(absolutePath)) {
      // If not found, it might be a root-relative URL path like '/uploads/temp/file.ext'
      // Resolve it against the server root directory
      const serverRoot = path.join(__dirname, "..");
      const relativePath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
      absolutePath = path.join(serverRoot, relativePath);
    }

    if (!fs.existsSync(absolutePath)) {
      throw new ErrorHandler("File not found", 404);
    }
    res.download(absolutePath, originalName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ success: false, message: "Error downloading file" });
      }
    });
  } catch (error) {
    if (error instanceof ErrorHandler) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Error downloading file",
    });
  }
};