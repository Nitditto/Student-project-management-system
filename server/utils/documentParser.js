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
  if (!filePath || !fs.existsSync(filePath)) {
    console.warn(`File path empty or does not exist: ${filePath}`);
    return "";
  }

  try {
    const ext = filePath.split(".").pop().toLowerCase();
    const buffer = fs.readFileSync(filePath);

    if (ext === "pdf") {
      // Clean parsing using pdf-parse
      const data = await pdf(buffer);
      return data.text || "";
    } else if (ext === "docx") {
      // Mammoth extracts raw text from docx
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } else if (ext === "txt") {
      // Simply read TXT file content
      return buffer.toString("utf-8");
    }

    console.warn(`Unsupported file extension: .${ext}. Text extraction skipped.`);
    return "";
  } catch (error) {
    console.error(`Error parsing document at ${filePath}:`, error.message);
    return "";
  }
};
