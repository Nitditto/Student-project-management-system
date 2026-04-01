import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { User } from "../models/user.js";
import { generateForgotPasswordEmailTemplate } from "../utils/emailTemplates.js";
import { generateToken } from "../utils/generateToken.js";
import crypto from "crypto";
import { sendEmail } from "../services/emailService.js";
import * as userServices from "../services/userServices.js";

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
    data: {
      user,
    },
  });
});

export const updateStudent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  delete updateData.role; // Prevent role updates through this route
  const user = await userServices.updateUser(id, updateData);
  if (!user) {
    return next(new ErrorHandler("Student not found", 404));
  }
  res.status(200).json({
    success: true,
    message: "Student updated successfully",
    data: {
      user,
    },
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
  const { name, email, password, department, maxStudents, experties } =
    req.body;
  if (
    !name ||
    !email ||
    !password ||
    !department ||
    !maxStudents ||
    !experties
  ) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }
  const user = await userServices.createUser({
    name,
    email,
    password,
    department,
    maxStudents,
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
    data: {
      user,
    },
  });
});

export const updateTeacher = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  delete updateData.role; // Prevent role updates through this route
  const user = await userServices.updateUser(id, updateData);
  if (!user) {
    return next(new ErrorHandler("Teacher not found", 404));
  }
  res.status(200).json({
    success: true,
    message: "Teacher updated successfully",
    data: {
      user,
    },
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

export const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await userServices.getAllUsers();
  res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: {
      users,
    },
  });
});

export const assinSupervisor = asyncHandler(async (req, res, next) => {});

export const getAllProject = asyncHandler(async (req, res, next) => {});

export const getDashboardStats = asyncHandler(async (req, res, next) => {});
