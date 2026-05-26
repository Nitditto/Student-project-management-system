import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { User } from "../models/user.js";
import { Project } from "../models/project.js";
import { SupervisorRequest } from "../models/supervisorRequest.js";
import * as userServices from "../services/userServices.js";
import * as projectServices from "../services/projectServices.js";
import * as notificationServices from "../services/notificationServices.js";
import * as registrationServices from "../services/registrationServices.js";

export const createStudent = asyncHandler(async (req, res, next) => {
  const { name, email, password, department } = req.body;
  if (!name || !email || !password || !department) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  const user = await userServices.createUser({
    name,
    email,
    password,
    department,
    role: "Student",
  });

  res.status(201).json({
    success: true,
    message: "Student created successfully",
    data: { user },
  });
});

export const updateStudent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  delete updateData.role;

  const user = await userServices.updateUser(id, updateData);
  if (!user) {
    return next(new ErrorHandler("Student not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Student updated successfully",
    data: { user },
  });
});

export const deleteStudent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userServices.getUserById(id);
  if (!user) {
    return next(new ErrorHandler("Student not found", 404));
  }
  if (user.role !== "Student") {
    return next(new ErrorHandler("User is not a student", 400));
  }

  await userServices.deleteUser(id);
  res.status(200).json({
    success: true,
    message: "Student deleted successfully",
  });
});

export const createTeacher = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    department,
    maxStudents,
    maxStudent,
    experties,
  } = req.body;

  if (
    !name ||
    !email ||
    !password ||
    !department ||
    !(maxStudent || maxStudents) ||
    !experties
  ) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  const user = await userServices.createUser({
    name,
    email,
    password,
    department,
    maxStudent: Number(maxStudent || maxStudents),
    experties: Array.isArray(experties)
      ? experties
      : typeof experties === "string" && experties.trim() !== ""
        ? experties.split(",").map((exp) => exp.trim())
        : [],
    role: "Teacher",
  });

  res.status(201).json({
    success: true,
    message: "Teacher created successfully",
    data: { user },
  });
});

export const updateTeacher = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  delete updateData.role;
  if (updateData.maxStudents && !updateData.maxStudent) {
    updateData.maxStudent = Number(updateData.maxStudents);
  }
  delete updateData.maxStudents;

  const user = await userServices.updateUser(id, updateData);
  if (!user) {
    return next(new ErrorHandler("Teacher not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Teacher updated successfully",
    data: { user },
  });
});

export const deleteTeacher = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userServices.getUserById(id);
  if (!user) {
    return next(new ErrorHandler("Teacher not found", 404));
  }
  if (user.role !== "Teacher") {
    return next(new ErrorHandler("User is not a teacher", 400));
  }

  await userServices.deleteUser(id);
  res.status(200).json({
    success: true,
    message: "Teacher deleted successfully",
  });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userServices.getAllUsers();
  res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: { users },
  });
});

export const assignSupervisor = asyncHandler(async (req, res, next) => {
  const { studentId, supervisorId, projectId } = req.body;
  if ((!studentId && !projectId) || !supervisorId) {
    return next(
      new ErrorHandler("Project or student ID and supervisor ID are required", 400),
    );
  }

  const project = projectId
    ? await Project.findById(projectId)
    : await Project.findOne({ student: studentId });

  if (!project) {
    return next(new ErrorHandler("Project not found", 404));
  }

  if (project.SupervisorRequest) {
    return next(new ErrorHandler("Supervisor already assigned", 400));
  }

  await registrationServices.assignSupervisorToProjectByAdmin({
    project,
    supervisorId,
  });

  const student = await User.findById(project.student);
  const supervisor = await User.findById(supervisorId);

  if (!student || !supervisor) {
    return next(new ErrorHandler("User not found", 404));
  }

  await notificationServices.notifyUser(
    project.student,
    `You have been assigned a supervisor ${supervisor.name}.`,
    "approval",
    "/student/supervisor",
    "low",
  );

  await notificationServices.notifyUser(
    supervisorId,
    `The student ${student.name} has been officially assigned to you.`,
    "general",
    "/teacher/assigned-students",
    "low",
  );

  res.status(200).json({
    success: true,
    data: { student, supervisor },
    message: "Supervisor assigned successfully",
  });
});

export const getAllProjects = asyncHandler(async (req, res) => {
  const projects = await projectServices.getAllProjects();
  res.json({
    success: true,
    message: "Projects fetched successfully",
    data: { projects },
  });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalStudents,
    totalTeachers,
    totalProjects,
    pendingRequests,
    completedProjects,
    rejectedProjects,
  ] = await Promise.all([
    User.countDocuments({ role: "Student" }),
    User.countDocuments({ role: "Teacher" }),
    Project.countDocuments(),
    SupervisorRequest.countDocuments({ status: "pending" }),
    Project.countDocuments({ status: "approved" }),
    Project.countDocuments({ status: "rejected" }),
  ]);

  res.status(200).json({
    success: true,
    message: "Admin Dashboard stats fetched successfully",
    data: {
      totalStudents,
      totalTeachers,
      totalProjects,
      pendingRequests,
      completedProjects,
      rejectedProjects,
    },
  });
});

export const getProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const project = await projectServices.getProjectById(id);
  if (!project) {
    return next(new ErrorHandler("Project not found", 404));
  }

  const user = req.user;
  const userRole = (user.role || "").toLowerCase();
  const userId = user._id?.toString() || user.id;
  const hasAccess =
    userRole === "admin" ||
    project.student._id.toString() === userId ||
    (project.supervisor && project.supervisor._id.toString() === userId);

  if (!hasAccess) {
    return next(new ErrorHandler("Not authorized to fetch this project", 403));
  }

  res.status(200).json({
    success: true,
    data: { project },
  });
});

export const updateProjectStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updatedData = req.body;
  const user = req.user;

  const project = await projectServices.getProjectById(id);
  if (!project) {
    return next(new ErrorHandler("Project not found", 404));
  }

  const userRole = (user.role || "").toLowerCase();
  const userId = user._id?.toString() || user.id;
  const hasAccess =
    userRole === "admin" ||
    project.student._id.toString() === userId ||
    (project.supervisor && project.supervisor._id.toString() === userId);

  if (!hasAccess) {
    return next(
      new ErrorHandler("Not authorized to update project status", 403),
    );
  }

  const updatedProject = await projectServices.updateProject(id, updatedData);
  res.status(200).json({
    success: true,
    message: "Project status updated successfully",
    data: {
      updatedProject,
    },
  });
});
