import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ErrorHandler from "../middleware/error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Stream / redirect a file download.
 *
 * - If `filePath` is a full HTTP(S) URL (Supabase public URL) → redirect the
 *   browser directly to that URL; the file streams from Supabase without
 *   going through the Express server.
 * - Otherwise fall back to legacy local-disk download (for files uploaded
 *   before the Supabase migration that still live on disk).
 */
export const streamDownload = (filePath, res, originalName) => {
  try {
    // ── Supabase (or any external) public URL ────────────────────────────────
    if (filePath && (filePath.startsWith("http://") || filePath.startsWith("https://"))) {
      // Tell the browser to download it with the original filename
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(originalName || "download")}"`
      );
      return res.redirect(filePath);
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