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
import { ensureProjectEditable } from "../services/workflowProjectServices.js";
import { isProjectMember } from "../utils/workflowHelpers.js";
import * as registrationServices from "../services/registrationServices.js";

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
  const { title, description, groupName, memberIds } = req.body;

  const existingProject = await projectServices.getStudentProject(studentId);
  if (existingProject && existingProject.status === "rejected") {
    await Project.findByIdAndDelete(existingProject._id);
    await User.updateMany(
      { _id: { $in: existingProject.members || [studentId] } },
      {
        project: null,
        supervisor: null,
      },
    );
  }

  const project = await registrationServices.createProjectProposalWithGroup({
    studentId,
    title,
    description,
    groupName,
    memberIds,
  });
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
  ensureProjectEditable(project);

  if (
    !project ||
    project.student._id.toString() !== studentId.toString() ||
    project.status === "rejected"
  ) {
    throw new ErrorHandler(
      "Only the group representative can upload official project files",
      403,
    );
  }
  if (!req.files || req.files.length === 0) {
    throw new ErrorHandler("No files uploaded", 400);
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
  const settings = await registrationServices.getRegistrationSettings();
  if (!settings.freePickOpen) {
    return res.status(200).json({
      success: true,
      data: { supervisors: [] },
      message: "Free-pick supervisor phase is currently closed",
    });
  }

  const project = await projectServices.getStudentProject(req.user._id);
  if (project && project.student?._id?.toString() !== req.user._id.toString()) {
    return res.status(200).json({
      success: true,
      data: { supervisors: [] },
      message: "Only the group representative can browse and request supervisors",
    });
  }

  const supervisors = await User.find({ role: "Teacher" })
    .select("name email department experties maxStudent assignedStudents")
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
  const settings = await registrationServices.getRegistrationSettings();
  if (!settings.freePickOpen) {
    throw new ErrorHandler(
      "Free-pick supervisor phase is closed. Please wait for preselection or admin opening.",
      400,
    );
  }

  const project = await projectServices.getStudentProject(studentId);
  if (!project) {
    throw new ErrorHandler("Please create a project proposal first", 400);
  }
  if (project.student._id.toString() !== studentId.toString()) {
    throw new ErrorHandler(
      "Only the group representative can request a supervisor for the team",
      403,
    );
  }

  const student = await User.findById(studentId);
  if (student.supervisor) {
    throw new ErrorHandler("You have a supervisor assigned", 400);
  }

  const supervisor = await User.findById(teacherId);
  if (!supervisor || supervisor.role !== "Teacher") {
    throw new ErrorHandler("Invalid supervisor selected", 400);
  }

  if (supervisor.maxStudent <= supervisor.assignedStudents.length) {
    throw new ErrorHandler(
      "Selected supervisor has reached maximum number of students",
      400,
    );
  }

  const requestData = {
    student: studentId,
    supervisor: teacherId,
    message,
    project: project._id,
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
  const project = await Project.findOne({
    $or: [{ student: studentId }, { members: studentId }],
  })
    .sort({ createdAt: -1 })
    .populate("supervisor", "name")
    .populate("members", "name email")
    .lean();

  const now = new Date();
  const upcomingDeadlines = await Project.find({
    $or: [{ student: studentId }, { members: studentId }],
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

  if (!project || !isProjectMember(project, studentId)) {
    throw new ErrorHandler("Not authorized to view feedback for this project", 403);
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
  if (!isProjectMember(project, studentId)) {
    throw new ErrorHandler("Not authorized to download file", 403);
  }

  const file = project.files.id(fileId);

  if (!file) {
    throw new ErrorHandler("File not found", 404);
  }

  fileServices.streamDownload(file.fileUrl, res, file.originalName);
});
