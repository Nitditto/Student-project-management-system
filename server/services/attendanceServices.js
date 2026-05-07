import ErrorHandler from "../middleware/error.js";
import { AttendanceSession } from "../models/attendanceSession.js";
import * as notificationServices from "./notificationServices.js";
import {
  ensureProjectEditable,
  ensureProjectMember,
  ensureTeacherOwnsProject,
  requireProjectByUser,
} from "./workflowProjectServices.js";
import {
  computeAttendanceRate,
  generateQrToken,
  generateSixDigitCode,
  getProjectMemberIds,
  isSameId,
  roundScore,
  toIdString,
} from "../utils/workflowHelpers.js";
import * as projectServices from "./projectServices.js";

const buildEvidenceFiles = (files = []) =>
  files.map((file) => ({
    fileType: file.mimetype,
    fileUrl: file.path,
    originalName: file.originalname,
    uploadedAt: new Date(),
  }));

const populateSessionQuery = () =>
  AttendanceSession.find()
    .populate("teacher", "name email")
    .populate("project", "title groupName student members supervisor")
    .populate("records.student", "name email")
    .populate("records.leaveRequest.reviewedBy", "name email");

const syncSessionStatus = async (session) => {
  const now = new Date();
  let changed = false;

  if (
    session.status !== "closed" &&
    now >= new Date(session.checkInOpensAt) &&
    now <= new Date(session.checkInClosesAt)
  ) {
    session.status = "active";
    changed = true;
  }

  if (session.status !== "closed" && now > new Date(session.checkInClosesAt)) {
    session.status = "closed";
    changed = true;

    for (const record of session.records) {
      if (record.status === "pending") {
        record.status =
          record.leaveRequest?.status === "approved" ? "excused" : "absent";
        changed = true;
      }
    }
  }

  if (changed) {
    await session.save();
  }

  return session;
};

const buildStudentAttendanceSummary = (sessions, studentId) => {
  const history = [];

  for (const session of sessions) {
    const record = session.records.find((item) =>
      isSameId(item.student, studentId),
    );
    if (!record) continue;

    history.push({
      _id: session._id,
      title: session.title,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      status: record.status,
      checkedInAt: record.checkedInAt,
      checkInMethod: record.checkInMethod,
      leaveRequest: record.leaveRequest,
    });
  }

  const totalSessions = history.length;
  const presentSessions = history.filter((item) => item.status === "present").length;
  const absentSessions = history.filter((item) => item.status === "absent").length;
  const excusedSessions = history.filter((item) => item.status === "excused").length;
  const attendanceRate = computeAttendanceRate({
    totalSessions,
    presentSessions,
    excusedSessions,
  });

  return {
    totalSessions,
    presentSessions,
    absentSessions,
    excusedSessions,
    attendanceRate,
    warning: attendanceRate < 70,
    formula:
      "Ty le chuyen can = (so buoi present + so buoi excused) / tong so buoi * 100",
    history: history.sort(
      (left, right) => new Date(left.startsAt) - new Date(right.startsAt),
    ),
  };
};

export const createAttendanceSession = async (teacherId, payload) => {
  const project = await projectServices.getProjectById(payload.projectId);
  ensureTeacherOwnsProject(project, teacherId);
  ensureProjectEditable(project);

  const memberIds = getProjectMemberIds(project);
  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(payload.endsAt);
  const windowMinutes = Number(payload.windowMinutes || 15);
  const checkInOpensAt = payload.checkInOpensAt
    ? new Date(payload.checkInOpensAt)
    : new Date(startsAt.getTime() - 15 * 60 * 1000);
  const checkInClosesAt = payload.checkInClosesAt
    ? new Date(payload.checkInClosesAt)
    : new Date(startsAt.getTime() + windowMinutes * 60 * 1000);

  if (!payload.title?.trim()) {
    throw new ErrorHandler("Attendance session title is required", 400);
  }
  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    Number.isNaN(checkInOpensAt.getTime()) ||
    Number.isNaN(checkInClosesAt.getTime())
  ) {
    throw new ErrorHandler("Attendance session time is invalid", 400);
  }
  if (endsAt <= startsAt) {
    throw new ErrorHandler("Attendance session end time must be after start time", 400);
  }

  const session = await AttendanceSession.create({
    teacher: teacherId,
    project: project._id,
    title: payload.title.trim(),
    startsAt,
    endsAt,
    checkInOpensAt,
    checkInClosesAt,
    accessCode: generateSixDigitCode(),
    qrToken: generateQrToken(),
    status: new Date() >= checkInOpensAt ? "active" : "draft",
    records: memberIds.map((studentId) => ({
      student: studentId,
      status: "pending",
    })),
  });

  await Promise.all(
    memberIds.map((studentId) =>
      notificationServices.notifyUser(
        studentId,
        `Giao vien vua tao buoi diem danh "${session.title}". Ma check-in se co hieu luc trong thoi gian mo phong.`,
        "attendance",
        "/student/defense",
        "medium",
      ),
    ),
  );

  return AttendanceSession.findById(session._id)
    .populate("records.student", "name email")
    .populate("project", "title groupName");
};

export const getTeacherAttendanceSessions = async (teacherId) => {
  const sessions = await AttendanceSession.find({ teacher: teacherId })
    .populate("project", "title groupName members student")
    .populate("records.student", "name email")
    .sort({ startsAt: -1 });

  for (const session of sessions) {
    await syncSessionStatus(session);
  }

  return AttendanceSession.find({ teacher: teacherId })
    .populate("project", "title groupName members student")
    .populate("records.student", "name email")
    .sort({ startsAt: -1 });
};

export const updateAttendanceSession = async (teacherId, sessionId, payload) => {
  const session = await AttendanceSession.findById(sessionId)
    .populate("project", "title groupName supervisor");

  if (!session) {
    throw new ErrorHandler("Attendance session not found", 404);
  }

  const project = await projectServices.getProjectById(session.project._id);
  ensureTeacherOwnsProject(project, teacherId);

  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(payload.endsAt);
  const windowMinutes = Number(payload.windowMinutes || 15);
  const checkInOpensAt = new Date(startsAt.getTime() - 15 * 60 * 1000);
  const checkInClosesAt = new Date(startsAt.getTime() + windowMinutes * 60 * 1000);

  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime())
  ) {
    throw new ErrorHandler("Invalid session times", 400);
  }

  if (endsAt <= startsAt) {
    throw new ErrorHandler("End time must be after start time", 400);
  }

  session.startsAt = startsAt;
  session.endsAt = endsAt;
  session.checkInOpensAt = checkInOpensAt;
  session.checkInClosesAt = checkInClosesAt;
  if (payload.title?.trim()) {
    session.title = payload.title.trim();
  }

  // Recompute status based on new times
  const now = new Date();
  if (now >= checkInOpensAt && now <= checkInClosesAt) {
    session.status = "active";
  } else if (now > checkInClosesAt) {
    session.status = "closed";
  } else {
    session.status = "draft";
  }

  await session.save();

  return AttendanceSession.findById(session._id)
    .populate("project", "title groupName")
    .populate("records.student", "name email");
};

const finalizeStudentCheckIn = async ({ session, studentId, method }) => {
  const record = session.records.find((item) => isSameId(item.student, studentId));
  if (!record) {
    throw new ErrorHandler("Attendance record not found for this student", 404);
  }

  if (record.status === "present") {
    throw new ErrorHandler("Attendance already confirmed", 400);
  }

  if (record.status === "excused") {
    throw new ErrorHandler("Attendance was already marked as excused", 400);
  }

  record.status = "present";
  record.checkedInAt = new Date();
  record.checkInMethod = method;
  record.manualOverride = false;
  await session.save();

  return AttendanceSession.findById(session._id)
    .populate("project", "title groupName")
    .populate("records.student", "name email");
};

export const studentCheckInWithAccessCode = async ({
  studentId,
  sessionId,
  accessCode,
}) => {
  const project = await requireProjectByUser(studentId);
  ensureProjectMember(project, studentId);

  const session = await AttendanceSession.findById(sessionId)
    .populate("project", "title groupName members student")
    .populate("records.student", "name email");

  if (!session || !isSameId(session.project._id, project._id)) {
    throw new ErrorHandler("Attendance session not found", 404);
  }

  await syncSessionStatus(session);

  if (session.status !== "active") {
    throw new ErrorHandler("Attendance session is not active", 400);
  }

  if (!accessCode?.trim() || accessCode.trim() !== session.accessCode) {
    throw new ErrorHandler("Attendance code is invalid", 400);
  }

  return finalizeStudentCheckIn({
    session,
    studentId,
    method: "code",
  });
};

export const studentCheckInWithQrToken = async ({ studentId, token }) => {
  const project = await requireProjectByUser(studentId);
  ensureProjectMember(project, studentId);

  if (!token?.trim()) {
    throw new ErrorHandler("Attendance QR token is required", 400);
  }

  const session = await AttendanceSession.findOne({ qrToken: token.trim() })
    .populate("project", "title groupName members student")
    .populate("records.student", "name email");

  if (!session || !isSameId(session.project._id, project._id)) {
    throw new ErrorHandler("Attendance session not found", 404);
  }

  await syncSessionStatus(session);

  if (session.status !== "active") {
    throw new ErrorHandler("Attendance QR is expired or not active", 400);
  }

  return finalizeStudentCheckIn({
    session,
    studentId,
    method: "qr",
  });
};

export const studentCheckInWithCodeOnly = async ({ studentId, accessCode }) => {
  if (!accessCode?.trim()) {
    throw new ErrorHandler("Attendance code is required", 400);
  }

  const project = await requireProjectByUser(studentId);
  ensureProjectMember(project, studentId);

  const sessions = await AttendanceSession.find({
    project: project._id,
    accessCode: accessCode.trim(),
  })
    .populate("project", "title groupName members student")
    .populate("records.student", "name email");

  if (!sessions.length) {
    throw new ErrorHandler("No session found with this code", 404);
  }

  let targetSession = null;
  for (const session of sessions) {
    await syncSessionStatus(session);
    if (session.status === "active") {
      targetSession = session;
      break;
    }
  }

  if (!targetSession) {
    throw new ErrorHandler("No active session found with this code", 400);
  }

  return finalizeStudentCheckIn({
    session: targetSession,
    studentId,
    method: "code",
  });
};

export const requestLeave = async ({
  studentId,
  sessionId,
  reason,
  note,
  files,
}) => {
  const project = await requireProjectByUser(studentId);
  ensureProjectMember(project, studentId);

  const session = await AttendanceSession.findById(sessionId)
    .populate("project", "title groupName members student supervisor")
    .populate("records.student", "name email");

  if (!session || !isSameId(session.project._id, project._id)) {
    throw new ErrorHandler("Attendance session not found", 404);
  }

  if (new Date(session.startsAt) <= new Date()) {
    throw new ErrorHandler("Leave request must be submitted before the meeting starts", 400);
  }

  const record = session.records.find((item) => isSameId(item.student, studentId));
  if (!record) {
    throw new ErrorHandler("Attendance record not found for this student", 404);
  }

  record.leaveRequest = {
    status: "pending",
    reason: reason || "",
    note: note || "",
    requestedAt: new Date(),
    evidenceFiles: buildEvidenceFiles(files),
  };

  await session.save();

  await notificationServices.notifyUser(
    toIdString(session.teacher),
    `Co yeu cau xin vang cho buoi "${session.title}" tu nhom ${session.project.groupName || session.project.title}.`,
    "leave",
    "/teacher/defense",
    "medium",
  );

  return session;
};

export const reviewLeaveRequest = async ({
  teacherId,
  sessionId,
  studentId,
  decision,
  note,
}) => {
  const session = await AttendanceSession.findById(sessionId)
    .populate("project", "title groupName supervisor")
    .populate("records.student", "name email");

  if (!session) {
    throw new ErrorHandler("Attendance session not found", 404);
  }

  const project = await projectServices.getProjectById(session.project._id);
  ensureTeacherOwnsProject(project, teacherId);

  const record = session.records.find((item) => isSameId(item.student, studentId));
  if (!record) {
    throw new ErrorHandler("Attendance record not found", 404);
  }

  if (!["approved", "rejected"].includes(decision)) {
    throw new ErrorHandler("Decision must be approved or rejected", 400);
  }

  record.leaveRequest.status = decision;
  record.leaveRequest.note = note || "";
  record.leaveRequest.reviewedAt = new Date();
  record.leaveRequest.reviewedBy = teacherId;
  record.status = decision === "approved" ? "excused" : record.status;

  await session.save();

  await notificationServices.notifyUser(
    studentId,
    `Yeu cau xin vang cho buoi "${session.title}" da duoc ${decision === "approved" ? "phe duyet" : "tu choi"}.`,
    "leave",
    "/student/defense",
    decision === "approved" ? "low" : "high",
  );

  return session;
};

export const manualMarkAttendance = async ({
  teacherId,
  sessionId,
  studentId,
  status,
}) => {
  const session = await AttendanceSession.findById(sessionId)
    .populate("project", "title groupName supervisor")
    .populate("records.student", "name email");

  if (!session) {
    throw new ErrorHandler("Attendance session not found", 404);
  }

  const project = await projectServices.getProjectById(session.project._id);
  ensureTeacherOwnsProject(project, teacherId);

  if (!["present", "absent", "excused"].includes(status)) {
    throw new ErrorHandler("Manual attendance status is invalid", 400);
  }

  const record = session.records.find((item) => isSameId(item.student, studentId));
  if (!record) {
    throw new ErrorHandler("Attendance record not found", 404);
  }

  record.status = status;
  record.manualOverride = true;
  record.checkInMethod = "manual";
  record.checkedInAt = status === "present" ? new Date() : record.checkedInAt;
  await session.save();

  return session;
};

export const getStudentAttendanceBoard = async (studentId) => {
  const project = await requireProjectByUser(studentId);
  ensureProjectMember(project, studentId);

  const sessions = await AttendanceSession.find({ project: project._id })
    .populate("project", "title groupName")
    .populate("records.student", "name email")
    .sort({ startsAt: 1 });

  for (const session of sessions) {
    await syncSessionStatus(session);
  }

  const refreshed = await AttendanceSession.find({ project: project._id })
    .populate("project", "title groupName")
    .populate("records.student", "name email")
    .sort({ startsAt: 1 });

  const summary = buildStudentAttendanceSummary(refreshed, studentId);
  return {
    project,
    summary,
    sessions: refreshed,
  };
};

export const getAttendanceDownloadInfo = async ({ sessionId, teacherId, studentId }) => {
  const session = await AttendanceSession.findById(sessionId)
    .populate("project", "title supervisor")
    .populate("records.student", "name email");

  if (!session) {
    throw new ErrorHandler("Attendance session not found", 404);
  }

  const project = await projectServices.getProjectById(session.project._id);
  if (teacherId) {
    ensureTeacherOwnsProject(project, teacherId);
  }
  if (studentId) {
    ensureProjectMember(project, studentId);
  }

  return session;
};
