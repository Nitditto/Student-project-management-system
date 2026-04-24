import { asyncHandler } from "../middleware/asyncHandler.js";
import * as attendanceServices from "../services/attendanceServices.js";

export const createAttendanceSession = asyncHandler(async (req, res) => {
  const session = await attendanceServices.createAttendanceSession(
    req.user._id,
    req.body,
  );
  res.status(201).json({
    success: true,
    message: "Attendance session created successfully",
    data: { session },
  });
});

export const getTeacherAttendanceSessions = asyncHandler(async (req, res) => {
  const sessions = await attendanceServices.getTeacherAttendanceSessions(
    req.user._id,
  );
  res.status(200).json({
    success: true,
    data: { sessions },
  });
});

export const manualMarkAttendance = asyncHandler(async (req, res) => {
  const session = await attendanceServices.manualMarkAttendance({
    teacherId: req.user._id,
    sessionId: req.params.sessionId,
    studentId: req.params.studentId,
    status: req.body.status,
  });
  res.status(200).json({
    success: true,
    message: "Attendance updated successfully",
    data: { session },
  });
});

export const reviewLeaveRequest = asyncHandler(async (req, res) => {
  const session = await attendanceServices.reviewLeaveRequest({
    teacherId: req.user._id,
    sessionId: req.params.sessionId,
    studentId: req.params.studentId,
    decision: req.body.decision,
    note: req.body.note,
  });
  res.status(200).json({
    success: true,
    message: "Leave request reviewed successfully",
    data: { session },
  });
});

export const getStudentAttendanceBoard = asyncHandler(async (req, res) => {
  const data = await attendanceServices.getStudentAttendanceBoard(req.user._id);
  res.status(200).json({
    success: true,
    data,
  });
});

export const studentCheckIn = asyncHandler(async (req, res) => {
  const session = await attendanceServices.studentCheckIn({
    studentId: req.user._id,
    sessionId: req.params.sessionId,
    credential: req.body.credential,
  });
  res.status(200).json({
    success: true,
    message: "Check-in successful",
    data: { session },
  });
});

export const requestLeave = asyncHandler(async (req, res) => {
  const session = await attendanceServices.requestLeave({
    studentId: req.user._id,
    sessionId: req.params.sessionId,
    reason: req.body.reason,
    note: req.body.note,
    files: req.files || [],
  });
  res.status(200).json({
    success: true,
    message: "Leave request submitted successfully",
    data: { session },
  });
});
