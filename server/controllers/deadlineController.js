import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { Deadline } from "../models/deadline.js";
import { Submission } from "../models/submission.js";
import { Project } from "../models/project.js";
import mongoose from "mongoose";

// Create a new deadline (Teacher)
export const createDeadline = asyncHandler(async (req, res, next) => {
  const { title, description, endDate, startDate } = req.body;

  if (!title || !description || !endDate) {
    return next(new ErrorHandler("Title, description, and end date are required", 400));
  }

  const deadlineData = {
    title,
    description,
    endDate: new Date(endDate),
    teacherId: req.user._id,
  };

  if (startDate) {
    deadlineData.startDate = new Date(startDate);
  }

  const deadline = await Deadline.create(deadlineData);

  res.status(201).json({
    success: true,
    message: "Deadline created successfully",
    data: { deadline },
  });
});

// Update a deadline (Teacher)
export const updateDeadline = asyncHandler(async (req, res, next) => {
  console.log("UPDATE DEADLINE CALLED", req.params, req.body, req.user);
  const { deadlineId } = req.params;
  const { title, description, endDate, startDate } = req.body;

  let deadline = await Deadline.findById(deadlineId);

  if (!deadline) {
    return next(new ErrorHandler("Deadline not found", 404));
  }

  // Ensure only the creator or Admin can update
  if (deadline.teacherId.toString() !== req.user._id.toString() && req.user.role !== "Admin") {
    console.error("Update Deadline: Not authorized", { teacherId: deadline.teacherId, userId: req.user._id, role: req.user.role });
    return next(new ErrorHandler("Not authorized to update this deadline", 403));
  }

  const updateData = { title, description };
  if (endDate) updateData.endDate = new Date(endDate);
  if (startDate) updateData.startDate = new Date(startDate);

  try {
    deadline = await Deadline.findByIdAndUpdate(deadlineId, updateData, {
      new: true,
      runValidators: true,
    });
  } catch (error) {
    console.error("Error updating deadline in DB:", error);
    return next(new ErrorHandler("Failed to update deadline in database", 500));
  }

  res.status(200).json({
    success: true,
    message: "Deadline updated successfully",
    data: { deadline },
  });
});

// Delete a deadline (Teacher)
export const deleteDeadline = asyncHandler(async (req, res, next) => {
  console.log("DELETE DEADLINE CALLED", req.params, req.user);
  const { deadlineId } = req.params;

  const deadline = await Deadline.findById(deadlineId);

  if (!deadline) {
    return next(new ErrorHandler("Deadline not found", 404));
  }

  // Ensure only the creator or Admin can delete
  if (deadline.teacherId.toString() !== req.user._id.toString() && req.user.role !== "Admin") {
    console.error("Delete Deadline: Not authorized", { teacherId: deadline.teacherId, userId: req.user._id, role: req.user.role });
    return next(new ErrorHandler("Not authorized to delete this deadline", 403));
  }

  // Optionally delete related submissions
  await Submission.deleteMany({ deadlineId: deadline._id });
  
  await deadline.deleteOne();

  res.status(200).json({
    success: true,
    message: "Deadline deleted successfully",
  });
});

// Get deadlines for a teacher
export const getTeacherDeadlines = asyncHandler(async (req, res, next) => {
  const deadlines = await Deadline.find({ teacherId: req.user._id }).sort({ endDate: 1 });

  res.status(200).json({
    success: true,
    data: { deadlines },
  });
});

// Get deadlines for a student
export const getStudentDeadlines = asyncHandler(async (req, res, next) => {
  const project = await Project.findOne({
    $or: [{ student: req.user._id }, { members: req.user._id }],
    status: "approved"
  });

  if (!project || !project.supervisor) {
    return res.status(200).json({
      success: true,
      data: { deadlines: [] },
    });
  }

  const deadlines = await Deadline.find({ teacherId: project.supervisor }).sort({ endDate: 1 });
  
  // Find submissions for this project
  const submissions = await Submission.find({ groupId: project._id });
  const submissionMap = submissions.reduce((acc, sub) => {
    acc[sub.deadlineId.toString()] = sub;
    return acc;
  }, {});

  const deadlinesWithStatus = deadlines.map((dl) => {
    const submission = submissionMap[dl._id.toString()];
    const isOverdue = new Date() > new Date(dl.endDate);
    
    let currentStatus = "PENDING";
    if (submission) {
      currentStatus = submission.status;
    } else if (isOverdue) {
      currentStatus = "MISSED";
    }

    return {
      ...dl.toObject(),
      submissionStatus: currentStatus,
      submission: submission || null,
      isOverdue,
    };
  });

  res.status(200).json({
    success: true,
    data: { deadlines: deadlinesWithStatus, project },
  });
});

// Submit a deadline
export const submitDeadline = asyncHandler(async (req, res, next) => {
  const { deadlineId } = req.params;
  const deadline = await Deadline.findById(deadlineId);

  if (!deadline) {
    return next(new ErrorHandler("Deadline not found", 404));
  }

  if (new Date() > new Date(deadline.endDate)) {
    return next(new ErrorHandler("Đã quá hạn nộp bài", 400));
  }

  const project = await Project.findOne({
    $or: [{ student: req.user._id }, { members: req.user._id }],
    status: "approved"
  });

  if (!project) {
    return next(new ErrorHandler("You are not part of an approved project group", 400));
  }

  if (!req.file) {
    return next(new ErrorHandler("Please upload a file", 400));
  }

  // Find existing submission or create new
  let submission = await Submission.findOne({ deadlineId, groupId: project._id });

  if (submission) {
    submission.fileUrl = `/uploads/temp/${req.file.filename}`; // Or adjust based on your path
    submission.fileName = req.file.originalname;
    submission.status = "SUBMITTED";
    submission.submittedBy = req.user._id;
    submission.submittedAt = new Date();
    await submission.save();
  } else {
    submission = await Submission.create({
      deadlineId,
      groupId: project._id,
      submittedBy: req.user._id,
      fileUrl: `/uploads/temp/${req.file.filename}`,
      fileName: req.file.originalname,
      status: "SUBMITTED",
      submittedAt: new Date(),
    });
  }

  res.status(200).json({
    success: true,
    message: "Submitted successfully",
    data: { submission },
  });
});

// Unsubmit a deadline
export const unsubmitDeadline = asyncHandler(async (req, res, next) => {
  const { deadlineId } = req.params;
  const deadline = await Deadline.findById(deadlineId);

  if (!deadline) {
    return next(new ErrorHandler("Deadline not found", 404));
  }

  if (new Date() > new Date(deadline.endDate)) {
    return next(new ErrorHandler("Đã quá hạn nộp bài, không thể hủy", 400));
  }

  const project = await Project.findOne({
    $or: [{ student: req.user._id }, { members: req.user._id }],
    status: "approved"
  });

  if (!project) {
    return next(new ErrorHandler("Project not found", 400));
  }

  let submission = await Submission.findOne({ deadlineId, groupId: project._id });

  if (!submission) {
    return next(new ErrorHandler("No submission found", 404));
  }

  // Actually we should delete or mark as PENDING
  submission.status = "PENDING";
  submission.fileUrl = null;
  submission.fileName = null;
  await submission.save();

  res.status(200).json({
    success: true,
    message: "Submission cancelled successfully",
  });
});

// Get Matrix for Teacher
export const getTeacherMatrix = asyncHandler(async (req, res, next) => {
  const teacherId = req.user._id;

  // 1. Get all deadlines for this teacher
  const deadlines = await Deadline.find({ teacherId }).sort({ endDate: 1 });

  // 2. Get all projects supervised by this teacher
  const projects = await Project.find({ supervisor: teacherId, status: "approved" }).populate("student members", "name email");

  // 3. Get all submissions for these projects
  const projectIds = projects.map(p => p._id);
  const submissions = await Submission.find({ groupId: { $in: projectIds } });

  // 4. Build Matrix
  const matrix = projects.map(project => {
    const projectSubmissions = {};
    
    deadlines.forEach(dl => {
      const sub = submissions.find(s => s.deadlineId.toString() === dl._id.toString() && s.groupId.toString() === project._id.toString());
      const isOverdue = new Date() > new Date(dl.endDate);
      
      let status = "PENDING";
      if (sub) {
        status = sub.status;
      } else if (isOverdue) {
        status = "MISSED";
      }

      projectSubmissions[dl._id.toString()] = {
        status,
        submission: sub || null,
        isOverdue,
      };
    });

    return {
      project: {
        _id: project._id,
        title: project.title,
        groupName: project.groupName,
        members: project.members,
      },
      submissions: projectSubmissions,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      deadlines,
      matrix,
    },
  });
});
