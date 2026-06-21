import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { createSimplePdf } from "../utils/simplePdf.js";

test("createSimplePdf compiles single-page and multi-page PDFs on disk cleanly", async () => {
  const metadata = {
    "Project Code": "DT-2025-09",
    "Group Name": "Alpha-Tech",
    "Advisor": "Dr. Nguyen Van Huong",
    "Meeting Date": "25/05/2026",
  };

  const sections = [
    { label: "Meeting Content", value: "The group completed the database schema design on MongoDB and set up the Express API backend structure." },
    { label: "Progress Achieved", value: "100% completed secure user authentication JWT endpoints." },
    {
      type: "table",
      headers: ["Council Member", "Weight", "Score", "Evaluation & Comments"],
      rows: [
        ["Dr. Nguyen Van Huong", "Chairman", "1.5", "92", "Excellent database schema design and Express boilerplate foundation. Safe authentication hooks."],
        ["Assoc. Prof. Tran Hung", "Secretary", "1.0", "90", "Secure JWT token structures, clean repository architectural patterns. Add more integration tests next week."],
        ["Dr. Pham Gia", "Member", "1.0", "88", "Very solid check-in mechanism proposal. Needs clean performance validation on large traffic flows."],
      ],
    },
    {
      label: "Next Week's Plan (Long text to trigger pagination)",
      value: "1. Integrate real-time Socket.io chat room for local communication.\n" +
             "2. Build the reviewer management module, assigning councils to protect projects.\n" +
             "3. Complete the dynamic QR code generation module for secure 15-minute check-ins.\n" +
             "4. Write comprehensive test case specifications and run automated test suites.\n" +
             "5. Design CLO QA evaluation forms M1-M6 with evidence upload flags.\n" +
             "6. Package the full service suite with Docker Compose for seamless deployment.\n" +
             "7. Verify MongoDB performance under high simulated concurrent student traffic.",
    },
  ];

  const fileName = `test-output-${Date.now()}.pdf`;
  const title = "PROJECT PROGRESS MEETING MINUTES - WEEK 5";

  const pdfPath = await createSimplePdf({
    fileName,
    title,
    sections,
    metadata,
  });

  // Verify file has been successfully written on disk
  const fileExists = fs.existsSync(pdfPath);
  assert.equal(fileExists, true);

  const stats = fs.statSync(pdfPath);
  assert.ok(stats.size > 1000); // Check that it is not empty and has structural contents

  // Read file to verify PDF header signature
  const fileContent = fs.readFileSync(pdfPath, "utf8");
  assert.equal(fileContent.startsWith("%PDF-1.4"), true);
  assert.equal(fileContent.endsWith("%%EOF"), true);

  // Clean up test file
  fs.unlinkSync(pdfPath);
});
