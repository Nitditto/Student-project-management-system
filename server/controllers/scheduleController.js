import { asyncHandler } from "../middleware/asyncHandler.js";
import * as scheduleServices from "../services/scheduleServices.js";

export const getTeacherSchedules = asyncHandler(async (req, res) => {
  const schedules = await scheduleServices.getTeacherSchedules(req.user._id);
  res.status(200).json({
    success: true,
    data: { schedules },
  });
});

export const createTeacherSchedule = asyncHandler(async (req, res) => {
  const schedule = await scheduleServices.createTeacherSchedule(
    req.user._id,
    req.body,
  );
  res.status(201).json({
    success: true,
    message: "Teacher schedule created successfully",
    data: { schedule },
  });
});

export const addSlotsToSchedule = asyncHandler(async (req, res) => {
  const schedule = await scheduleServices.addSlotsToSchedule(
    req.user._id,
    req.params.scheduleId,
    req.body.slots,
  );
  res.status(200).json({
    success: true,
    message: "Slots added successfully",
    data: { schedule },
  });
});

export const runAutoAssign = asyncHandler(async (req, res) => {
  const result = await scheduleServices.runAutoAssignmentForSchedule(
    req.params.scheduleId,
  );
  res.status(200).json({
    success: true,
    message: "Deadline processing completed",
    data: result,
  });
});

export const getStudentScheduleBoard = asyncHandler(async (req, res) => {
  const data = await scheduleServices.getStudentScheduleBoard(req.user._id);
  res.status(200).json({
    success: true,
    data,
  });
});

export const pickScheduleSlot = asyncHandler(async (req, res) => {
  const data = await scheduleServices.pickScheduleSlot({
    studentId: req.user._id,
    scheduleId: req.params.scheduleId,
    slotId: req.params.slotId,
  });
  res.status(200).json({
    success: true,
    message: "Schedule slot picked successfully",
    data,
  });
});

export const rescheduleProjectSlot = asyncHandler(async (req, res) => {
  const data = await scheduleServices.rescheduleProjectSlot({
    studentId: req.user._id,
    scheduleId: req.params.scheduleId,
    slotId: req.params.slotId,
    reason: req.body.reason,
  });
  res.status(200).json({
    success: true,
    message: "Schedule slot released. Please pick a new slot.",
    data,
  });
});
