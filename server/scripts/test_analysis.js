import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Project } from "../models/project.js";
import { Submission } from "../models/submission.js";
import { SubmissionAnalysis } from "../models/submissionAnalysis.js";
import { User } from "../models/user.js";
import { Deadline } from "../models/deadline.js";
import { SubmissionChunk } from "../models/submissionChunk.js";
import { analyzeSubmission } from "../services/submissionAnalysisService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {
    file: null,
    milestone: "M4",
    debug: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      parsed.file = args[i + 1];
      i++;
    } else if (args[i] === "--milestone" && args[i + 1]) {
      parsed.milestone = args[i + 1];
      i++;
    } else if (args[i] === "--debug") {
      parsed.debug = true;
    }
  }

  return parsed;
};

const run = async () => {
  const options = parseArgs();
  
  if (!options.file) {
    console.error("Lỗi: Vui lòng cung cấp đường dẫn file bằng tham số --file.");
    console.log("Cách dùng: node scripts/test_analysis.js --file <path_to_pdf_or_docx> --milestone <M1-M4> [--debug]");
    process.exit(1);
  }

  const absoluteFilePath = path.isAbsolute(options.file)
    ? options.file
    : path.resolve(process.cwd(), options.file);

  if (!fs.existsSync(absoluteFilePath)) {
    console.error(`Lỗi: Không tìm thấy file tại đường dẫn: ${absoluteFilePath}`);
    process.exit(1);
  }

  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error("Lỗi: Không tìm thấy MONGO_URL trong .env");
      process.exit(1);
    }

    console.log("Đang kết nối cơ sở dữ liệu MongoDB...");
    await mongoose.connect(mongoUrl);
    console.log("Đã kết nối thành công!");

    // 1. Find a student user to run mock submission
    let student = await User.findOne({ role: "Student" });
    if (!student) {
      console.log("Không tìm thấy sinh viên nào trong DB. Đang tạo sinh viên giả lập...");
      student = await User.create({
        name: "Test Student AI",
        email: "student_ai_test@gmail.com",
        password: "password123",
        role: "Student"
      });
    }

    // 2. Find a project
    let project = await Project.findOne();
    if (!project) {
      console.log("Không tìm thấy đề tài nào trong DB. Đang tạo đề tài giả lập...");
      project = await Project.create({
        title: "Xây dựng hệ thống quản lý học tập thông minh dựa trên AI",
        description: "Đề tài tập trung vào việc nghiên cứu và tích hợp các công nghệ Generative AI để hỗ trợ quản lý dự án học tập, chấm điểm tự động và phản hồi Rubrics.",
        student: student._id,
        members: [student._id],
        status: "in_progress",
        embedding: Array(768).fill(0.01) // Mock baseline embedding
      });
    }

    // 3. Find/Create a deadline
    let deadline = await Deadline.findOne();
    if (!deadline) {
      let teacher = await User.findOne({ role: "Teacher" });
      if (!teacher) {
        teacher = await User.create({
          name: "Teacher Advisor AI",
          email: "teacher_ai_test@gmail.com",
          password: "password123",
          role: "Teacher"
        });
      }
      deadline = await Deadline.create({
        title: "Mock AI Thesis Submission Deadline",
        description: "Hạn nộp báo cáo thử nghiệm để AI đánh giá thử.",
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teacherId: teacher._id,
        assignedGroups: [project._id]
      });
    }

    // 4. Create a mock Submission
    console.log("Đang dọn dẹp các bản nộp cũ nếu trùng lặp...");
    await Submission.deleteOne({ deadlineId: deadline._id, groupId: project._id });

    console.log("Đang thiết lập bản nộp thử nghiệm (Mock Submission)...");
    const mockSubmission = await Submission.create({
      deadlineId: deadline._id,
      groupId: project._id,
      submittedBy: student._id,
      fileName: path.basename(absoluteFilePath),
      fileUrl: `/uploads/temp/test_${Date.now()}_${path.basename(absoluteFilePath)}`,
      status: "SUBMITTED",
      submittedAt: new Date()
    });

    // Copy file to expected upload temp directory
    const uploadTempDir = path.join(__dirname, "../uploads/temp");
    if (!fs.existsSync(uploadTempDir)) {
      fs.mkdirSync(uploadTempDir, { recursive: true });
    }
    const targetPath = path.join(uploadTempDir, path.basename(mockSubmission.fileUrl));
    fs.copyFileSync(absoluteFilePath, targetPath);
    console.log(`Đã sao chép tệp tạm vào: ${targetPath}`);

    console.log(`\n========================================`);
    console.log(`BẮT ĐẦU CHẠY PIPELINE PHÂN TÍCH AI SUBMISSION`);
    console.log(`- File nộp: ${path.basename(absoluteFilePath)}`);
    console.log(`- Milestone: ${options.milestone}`);
    console.log(`- Debug: ${options.debug ? "ON" : "OFF"}`);
    console.log(`========================================\n`);

    const result = await analyzeSubmission(mockSubmission._id, targetPath, options.milestone);

    console.log(`\n================ KẾT QUẢ AI ================\n`);
    console.log(`Trạng thái: ${result.status}`);
    console.log(`Thời gian xử lý: ${result.processingTimeMs}ms`);
    console.log(`Tỷ lệ trùng lặp (Plagiarism): ${Math.round(result.plagiarismResult.overallSimilarity * 100)}%`);
    console.log(`Mức độ rủi ro: ${result.plagiarismResult.riskLevel.toUpperCase()}`);
    console.log(`Tổng số đoạn bị nghi ngờ trùng lặp: ${result.plagiarismResult.suspiciousChunks.length}`);
    console.log(`Dùng RAG tìm kiếm context: ${result.scoreEstimate.usedRag ? "CÓ" : "KHÔNG"}`);
    console.log(`\n--- ƯỚC TÍNH ĐIỂM SỐ ---`);
    console.log(`Điểm ước tính (Thang 10): ${result.scoreEstimate.estimatedScore10}`);
    console.log(`Điểm ước tính (Thang 5): ${result.scoreEstimate.estimatedScore5}`);
    console.log(`Độ tự tin đánh giá: ${Math.round(result.scoreEstimate.confidence * 100)}%`);
    
    console.log(`\nChi tiết điểm CLO:`);
    result.scoreEstimate.cloBreakdown.forEach(clo => {
      console.log(`  - ${clo.cloCode}: ${clo.estimatedScore}/5 | Rationale: ${clo.rationale}`);
    });

    console.log(`\n--- PHẢN HỒI HỌC THUẬT ---`);
    console.log(`Nhận xét chung: ${result.feedback.overallComment}`);
    console.log(`\nĐiểm mạnh:`);
    result.feedback.strengths.forEach(s => console.log(`  + ${s}`));
    console.log(`\nĐiểm yếu:`);
    result.feedback.weaknesses.forEach(w => console.log(`  - ${w}`));
    console.log(`\nĐề xuất cải tiến:`);
    result.feedback.suggestions.forEach(s => console.log(`  * ${s}`));
    console.log(`\n============================================\n`);

    // Clean up mock entries
    console.log("Đang dọn dẹp dữ liệu giả lập...");
    await SubmissionAnalysis.deleteOne({ submission: mockSubmission._id });
    await Submission.deleteOne({ _id: mockSubmission._id });
    await SubmissionChunk.deleteMany({ submissionRef: mockSubmission._id });
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    console.log("Đã dọn dẹp hoàn tất.");

  } catch (error) {
    console.error("Lỗi khi chạy thử nghiệm phân tích:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Đã ngắt kết nối cơ sở dữ liệu.");
  }
};

void run();
