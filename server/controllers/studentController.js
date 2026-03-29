import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { User } from "../models/user.js";
import * as userServices from "../services/userServices.js";
import * as projectService from "../services/projectServices.js";
import * as requestServices from "../services/requestServices.js";
import * as notificationService from "../services/notificationServices.js";

export const getStudentProject = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const project = await projectService.getStudentProject(studentId);
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

  const existingProject = await projectService.getStudentProject(studentId);
  if (existingProject && existingProject.status !== "rejected") {
    return next(
      new ErrorHandler(
        "You already have an active project. You can only submit a new project after your current project is rejected.",
        400,
      ),
    );
  }
  const projectData = {
    student: studentId,
    title,
    description,
  };
  const project = await projectService.createProject(projectData);
  await User.findByIdAndUpdate(studentId, { project: project._id });
  res.status(201).json({
    success: true,
    data: { project },
    message: "Project proposal submitted successfully",
  });
});

export const updateFiles = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const studentId = req.user._id;
  const project = await projectService.getProjectById(projectId);

  if (!project || project.student.toString() !== studentId.toString()) {
    return next(
      new ErrorHandler("Not authorized to upload files to this project", 403),
    );
  }
  if (!req.files || req.files.length === 0) {
    return next(new ErrorHandler("No files uploaded", 400));
  }
  const updatedProject = await projectService.addFilesToProject(
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
  if (!student.supervisor) {
    return next(new ErrorHandler("Supervisor not found", 404));
  }
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

  if (student.maxStudents === supervisor.assignedStudents.length) {
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

  await notificationService.notifyUser(
    teacherId,
    `${student.name} has request ${supervisor.name} to be their supervisor.`,
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
