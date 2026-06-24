import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ErrorHandler from "../middleware/error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const streamDownload = async (filePath, res, originalName) => {
  try {
    // ── Supabase (or any external) public URL ────────────────────────────────
    if (filePath && (filePath.startsWith("http://") || filePath.startsWith("https://"))) {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new ErrorHandler("Failed to fetch file from cloud storage", response.status);
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(originalName || "download")}"`);
      
      const { Readable } = await import("stream");
      if (response.body) {
        Readable.fromWeb(response.body).pipe(res);
      } else {
        res.status(500).json({ success: false, message: "Response body is empty" });
      }
      return;
    }

    // ── Legacy: file stored on local disk ────────────────────────────────────
    let absolutePath = filePath;
    if (!fs.existsSync(absolutePath)) {
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