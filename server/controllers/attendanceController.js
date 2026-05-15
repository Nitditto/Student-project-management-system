import { asyncHandler } from "../middleware/asyncHandler.js";
import * as attendanceServices from "../services/attendanceServices.js";

export const getNgrokUrl = asyncHandler(async (req, res) => {
  try {
    const response = await fetch("http://ngrok:4040/api/tunnels");
    const data = await response.json();
    const tunnel = (data.tunnels || []).find((t) => t.proto === "https") || data.tunnels?.[0];
    const publicUrl = tunnel?.public_url || null;
    res.status(200).json({ success: true, data: { publicUrl } });
  } catch {
    res.status(200).json({ success: true, data: { publicUrl: null } });
  }
});

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

export const updateAttendanceSession = asyncHandler(async (req, res) => {
  const session = await attendanceServices.updateAttendanceSession(
    req.user._id,
    req.params.sessionId,
    req.body,
  );
  res.status(200).json({
    success: true,
    message: "Attendance session updated successfully",
    data: { session },
  });
});

export const deleteAttendanceSession = asyncHandler(async (req, res) => {
  const session = await attendanceServices.deleteAttendanceSession(
    req.user._id,
    req.params.sessionId,
  );
  res.status(200).json({
    success: true,
    message: "Attendance session deleted successfully",
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
  const session = await attendanceServices.studentCheckInWithAccessCode({
    studentId: req.user._id,
    sessionId: req.params.sessionId,
    accessCode: req.body.accessCode,
  });
  res.status(200).json({
    success: true,
    message: "Attendance confirmed successfully",
    data: { session },
  });
});

export const studentQrCheckIn = asyncHandler(async (req, res) => {
  const session = await attendanceServices.studentCheckInWithQrToken({
    studentId: req.user._id,
    token: req.body.token,
  });
  res.status(200).json({
    success: true,
    message: "Attendance confirmed successfully",
    data: { session },
  });
});

export const studentCodeCheckIn = asyncHandler(async (req, res) => {
  const session = await attendanceServices.studentCheckInWithCodeOnly({
    studentId: req.user._id,
    accessCode: req.body.accessCode,
  });
  res.status(200).json({
    success: true,
    message: "Attendance confirmed successfully",
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
