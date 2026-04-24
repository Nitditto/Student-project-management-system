import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const escapePdfText = (value = "") =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");

const wrapLines = (text = "", maxLength = 88) => {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

export const createSimplePdf = async ({ fileName, title, sections }) => {
  const outputDir = path.join(__dirname, "../uploads/reviewer-forms");
  fs.mkdirSync(outputDir, { recursive: true });

  const lines = [title, ""];
  for (const section of sections) {
    lines.push(`${section.label}:`);
    lines.push(...wrapLines(section.value || ""));
    lines.push("");
  }

  const pageHeight = 792;
  const top = 760;
  const lineGap = 16;
  let y = top;
  const commands = ["BT", "/F1 12 Tf"];

  for (const line of lines) {
    if (y < 60) break;
    commands.push(`72 ${y} Td (${escapePdfText(line)}) Tj`);
    y -= lineGap;
    commands.push(`0 -${lineGap} Td`);
  }
  commands.push("ET");

  const stream = commands.join("\n");
  const objects = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );
  objects.push(
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  );
  objects.push(
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj\n`,
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const finalPath = path.join(outputDir, fileName);
  await fs.promises.writeFile(finalPath, pdf, "binary");
  return finalPath;
};
