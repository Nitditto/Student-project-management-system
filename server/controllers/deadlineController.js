import fs from "fs";
import path from "path";
import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { Deadline } from "../models/deadline.js";
import { Project } from "../models/project.js";
import { Submission } from "../models/submission.js";
import { Notification } from "../models/notification.js";

const getStudentProject = async (userId) => {
  return Project.findOne({ $or: [{ student: userId }, { members: userId }] });
};

export const createDeadline = asyncHandler(async (req, res, next) => {
  const { title, description, startDate, endDate, semesterId, maxGroups } = req.body;
  if (!title || !startDate || !endDate) return next(new ErrorHandler("Title, start date and end date are required", 400));

  const deadline = await Deadline.create({
    teacherId: req.user._id,
    createdBy: req.user._id,
    semesterId: semesterId || null,
    title,
    name: title,
    description: description || "",
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    dueDate: new Date(endDate),
    maxGroups: maxGroups || null,
  });

  const projects = await Project.find({ supervisor: req.user._id }).select("members student");
  const studentIds = [...new Set(projects.flatMap((p) => [p.student, ...(p.members || [])].map((id) => id?.toString()).filter(Boolean)))];
  if (studentIds.length) {
    await Notification.insertMany(studentIds.map((id) => ({ user: id, type: "deadline", priority: "high", message: `Deadline mới: ${title}`, link: "/student/deadlines" })));
  }

  res.status(201).json({ success: true, message: "Deadline created successfully", data: { deadline } });
});

export const getTeacherDeadlines = asyncHandler(async (req, res) => {
  const deadlines = await Deadline.find({ teacherId: req.user._id }).sort({ endDate: 1 });
  res.json({ success: true, data: { deadlines } });
});

export const getStudentDeadlines = asyncHandler(async (req, res, next) => {
  const project = await getStudentProject(req.user._id);
  if (!project || !project.supervisor) return next(new ErrorHandler("Bạn chưa có giảng viên hướng dẫn", 400));

  const deadlines = await Deadline.find({ teacherId: project.supervisor }).sort({ endDate: 1 }).lean();
  const submissions = await Submission.find({ deadlineId: { $in: deadlines.map((d) => d._id) }, groupId: project._id }).lean();
  const map = new Map(submissions.map((s) => [s.deadlineId.toString(), s]));
  const now = new Date();
  const enriched = deadlines.map((d) => {
    const sub = map.get(d._id.toString());
    const locked = now > new Date(d.endDate);
    return {
      ...d,
      submission: sub || null,
      status: sub?.status || (locked ? "MISSED" : "PENDING"),
      locked,
    };
  });
  res.json({ success: true, data: { deadlines: enriched, projectId: project._id } });
});

export const submitDeadline = asyncHandler(async (req, res, next) => {
  const { deadlineId } = req.params;
  const deadline = await Deadline.findById(deadlineId);
  if (!deadline) return next(new ErrorHandler("Deadline not found", 404));
  if (new Date() > new Date(deadline.endDate)) return next(new ErrorHandler("Đã quá hạn nộp bài", 400));
  if (!req.file) return next(new ErrorHandler("File upload is required", 400));

  const project = await getStudentProject(req.user._id);
  if (!project) return next(new ErrorHandler("Project not found", 404));

  const existed = await Submission.findOne({ deadlineId, groupId: project._id, status: "SUBMITTED" });
  if (existed) return next(new ErrorHandler("Nhóm đã nộp bài", 400));

  const submission = await Submission.create({
    deadlineId,
    groupId: project._id,
    submittedBy: req.user._id,
    fileUrl: `/uploads/temp/${req.file.filename}`,
    fileName: req.file.originalname,
    status: "SUBMITTED",
    submittedAt: new Date(),
  });
  res.json({ success: true, message: "Nộp bài thành công", data: { submission } });
});

export const unsubmitDeadline = asyncHandler(async (req, res, next) => {
  const { deadlineId } = req.params;
  const deadline = await Deadline.findById(deadlineId);
  if (!deadline) return next(new ErrorHandler("Deadline not found", 404));
  if (new Date() > new Date(deadline.endDate)) return next(new ErrorHandler("Đã quá hạn nộp bài", 400));

  const project = await getStudentProject(req.user._id);
  const submission = await Submission.findOne({ deadlineId, groupId: project?._id, status: "SUBMITTED" });
  if (!submission) return next(new ErrorHandler("Không tìm thấy bài nộp", 404));

  if (submission.fileUrl) {
    const localPath = path.join(process.cwd(), "server", submission.fileUrl.replace(/^\//, ""));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  }
  await Submission.findByIdAndDelete(submission._id);
  res.json({ success: true, message: "Đã hủy nộp bài" });
});

export const getTeacherMatrix = asyncHandler(async (req, res) => {
  const deadlines = await Deadline.find({ teacherId: req.user._id }).sort({ endDate: 1 }).lean();
  const groups = await Project.find({ supervisor: req.user._id }).populate("student", "name").lean();
  const submissions = await Submission.find({ deadlineId: { $in: deadlines.map((d) => d._id) }, groupId: { $in: groups.map((g) => g._id) }, status: "SUBMITTED" }).lean();
  const key = new Map(submissions.map((s) => [`${s.groupId}-${s.deadlineId}`, s]));
  const rows = groups.map((g) => ({
    groupId: g._id,
    groupName: g.groupName || g.title || g.student?.name,
    cells: deadlines.map((d) => ({ deadlineId: d._id, submission: key.get(`${g._id}-${d._id}`) || null })),
  }));
  res.json({ success: true, data: { deadlines, rows } });
});
