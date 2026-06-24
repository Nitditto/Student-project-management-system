import fs from "fs";
import { createRequire } from "module";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

/**
 * Parses local files (PDF, DOCX, TXT) and returns their plain text content.
 * @param {string} filePath 
 * @returns {Promise<string>} Clean text content
 */
export const parseDocument = async (filePath) => {
  let buffer;
  let ext;

  try {
    if (filePath && (filePath.startsWith("http://") || filePath.startsWith("https://"))) {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from remote URL: ${filePath}`);
      }
      buffer = Buffer.from(await response.arrayBuffer());
      ext = filePath.split("?")[0].split(".").pop().toLowerCase();
    } else {
      if (!filePath || !fs.existsSync(filePath)) {
        console.warn(`File path empty or does not exist: ${filePath}`);
        return "";
      }
      buffer = fs.readFileSync(filePath);
      ext = filePath.split(".").pop().toLowerCase();
    }
    return parseBufferByExt(buffer, ext, filePath);
  } catch (error) {
    console.error(`Error parsing document at ${filePath}:`, error.message);
    return "";
  }
};

/**
 * Parses a Buffer (e.g. from multer memoryStorage) by extension.
 * @param {Buffer} buffer 
 * @param {string} originalname  - Original filename (used to determine extension)
 * @returns {Promise<string>}
 */
export const parseDocumentBuffer = async (buffer, originalname) => {
  if (!buffer || !buffer.length) return "";
  const ext = (originalname || "").split(".").pop().toLowerCase();
  return parseBufferByExt(buffer, ext, originalname);
};

// ─── Shared parsing logic ────────────────────────────────────────────────────
const parseBufferByExt = async (buffer, ext, label) => {
  if (ext === "pdf") {
    try {
      if (typeof pdf === "function") {
        const data = await pdf(buffer);
        return data.text || "";
      } else if (pdf && typeof pdf.PDFParse === "function") {
        const parser = new pdf.PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy().catch(() => {});
        return result.text || "";
      } else {
        throw new Error("No valid PDF parse constructor or function found.");
      }
    } catch (pdfErr) {
      console.warn(`[AI Parser] pdf-parse failed for ${label}. Falling back to raw text. Error: ${pdfErr.message}`);
      return buffer.toString("utf-8");
    }
  } else if (ext === "docx") {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } catch (docxErr) {
      console.warn(`[AI Parser] mammoth failed for ${label}. Falling back to raw text. Error: ${docxErr.message}`);
      return buffer.toString("utf-8");
    }
  } else if (ext === "txt") {
    return buffer.toString("utf-8");
  }

  console.warn(`Unsupported file extension: .${ext}. Text extraction skipped.`);
  return "";
};
