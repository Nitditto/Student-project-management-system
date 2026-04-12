import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { User } from "../models/user.js";
import * as userServices from "../services/userServices.js";
import * as projectServices from "../services/projectServices.js";
import * as requestServices from "../services/requestServices.js";
import * as notificationServices from "../services/notificationServices.js";
import { Project } from "../models/project.js";
import { Notification } from "../models/notification.js";
import * as fileServices from "../services/fileServices.js";

export const getStudentProject = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const project = await projectServices.getStudentProject(studentId);
  if (!project) {
    return res.status(200).json({
      success: true,
      data: { project: null },
      message: "No project found for this student",
    });
  }
  res.status(200).json({
    success: true,
    data: { project },
  });
});

export const submitProposal = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const { title, description } = req.body;

  const existingProject = await projectServices.getStudentProject(studentId);
  if (existingProject && existingProject.status !== "rejected") {
    return next(
      new ErrorHandler(
        "You already have an active project. You can only submit a new project after your current project is rejected.",
        400,
      ),
    );
  }

  if (existingProject && existingProject.status === "rejected") {
    await Project.findByIdAndDelete(existingProject._id);
  }
  const projectData = {
    student: studentId,
    title,
    description,
  };
  const project = await projectServices.createProject(projectData);
  await User.findByIdAndUpdate(studentId, { project: project._id });
  res.status(201).json({
    success: true,
    data: { project },
    message: "Project proposal submitted successfully",
  });
});

export const uploadFiles = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const studentId = req.user._id;
  const project = await projectServices.getProjectById(projectId);

  if (
    !project ||
    project.student._id.toString() !== studentId.toString() ||
    project.status === "rejected"
  ) {
    return next(
      new ErrorHandler("Not authorized to upload files to this project", 403),
    );
  }
  if (!req.files || req.files.length === 0) {
    return next(new ErrorHandler("No files uploaded", 400));
  }
  const updatedProject = await projectServices.addFilesToProject(
    projectId,
    req.files,
  );
  res.status(200).json({
    success: true,
    data: { project: updatedProject },
    message: "Project files updated successfully",
  });
});

export const getAvailableSupervisors = asyncHandler(async (req, res, next) => {
  const supervisors = await User.find({ role: "Teacher" })
    .select("name email department experties")
    .lean();
  res.status(200).json({
    success: true,
    data: { supervisors },
    message: "Available supervisors fetched successfully",
  });
});

export const getSupervisor = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const student = await User.findById(studentId).populate(
    "supervisor",
    "name email department experties",
  );
  // if (!student.supervisor) {
  //   return next(new ErrorHandler("Supervisor not found", 404));
  // }
  if (!student.supervisor) {
    return res.status(200).json({
      success: true,
      data: { supervisor: null },
      message: "No supervisor assigned yet",
    });
  }
  res.status(200).json({
    success: true,
    data: { supervisor: student.supervisor },
  });
});

export const requestSupervisor = asyncHandler(async (req, res, next) => {
  const { teacherId, message } = req.body;
  const studentId = req.user._id;

  const student = await User.findById(studentId);
  if (student.supervisor) {
    return next(new ErrorHandler("You have a supervisor assigned", 400));
  }

  const supervisor = await User.findById(teacherId);
  if (!supervisor || supervisor.role !== "Teacher") {
    return next(new ErrorHandler("Invalid supervisor selected", 400));
  }

  if (supervisor.maxStudent <= supervisor.assignedStudents.length) {
    return next(
      new ErrorHandler(
        "Selected supervisor has reached maximum number of students",
        400,
      ),
    );
  }

  const requestData = {
    student: studentId,
    supervisor: teacherId,
    message,
  };

  const request = await requestServices.createRequest(requestData);

  await notificationServices.notifyUser(
    teacherId,
    `${student.name} has requested you to be their supervisor.`,
    "request",
    "/teacher/requests",
    "medium",
  );

  res.status(201).json({
    success: true,
    data: { request },
    message: "Supervisor request submitted successfully",
  });
});

export const getDashboardStats = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const project = await Project.findOne({ student: studentId })
    .sort({ createdAt: -1 })
    .populate("supervisor", "name")
    .lean();

  const now = new Date();
  const upcomingDeadlines = await Project.find({
    student: studentId,
    deadline: { $gte: now },
  })
    .select("title description deadline")
    .sort({ deadline: 1 })
    .limit(3)
    .lean();

  const notifications = await Notification.find({
    user: studentId,
  })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const feedbackNotification =
    project?.feedback && project?.feedback.length > 0
      ? project.feedback
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 2)
      : [];

  const supervisorName = project?.supervisor?.name || null;

  res.status(200).json({
    success: true,
    data: {
      project,
      upcomingDeadlines,
      notifications,
      feedbackNotification,
      supervisorName,
    },
    message: "Dashboard stats fetched successfully",
  });
});

export const getFeedback = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const studentId = req.user._id;

  const project = await projectServices.getProjectById(projectId);

  if (!project || project.student._id.toString() !== studentId.toString()) {
    return next(
      new ErrorHandler("Not authorized to view feedback for this project", 403),
    );
  }

  const sortedFeedback = project.feedback
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((f) => ({
      _id: f._id,
      type: f.type,
      title: f.title,
      message: f.message,
      createdAt: f.createdAt,
      supervisorName: f.supervisorId?.name,
      supervisorEmail: f.supervisorId?.email,
    }));

  res.status(200).json({
    success: true,
    data: { feedback: sortedFeedback },
  });
});

export const downloadFile = asyncHandler(async (req, res, next) => {
  const { projectId, fileId } = req.params;
  const studentId = req.user._id;

  const project = await projectServices.getProjectById(projectId);
  if (project.student._id.toString() !== studentId.toString()) {
    return next(new ErrorHandler("Not authorized to download file", 403));
  }

  const file = project.files.id(fileId);

  if (!file) {
    return next(new ErrorHandler("File not found", 404));
  }

  fileServices.streamDownload(file.fileUrl, res, file.originalName);
});
