import ErrorHandler from "../middleware/error.js";
import { Project } from "../models/project.js";
import { TeacherSchedule } from "../models/teacherSchedule.js";
import * as notificationServices from "./notificationServices.js";
import {
  ensureProjectEditable,
  ensureProjectMember,
  requireProjectByUser,
} from "./workflowProjectServices.js";
import {
  getProjectMemberIds,
  isSameId,
  toIdString,
} from "../utils/workflowHelpers.js";

const normalizeSlotInput = (slot) => {
  const startAt = new Date(slot.startAt);
  const endAt = new Date(slot.endAt);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new ErrorHandler("Each slot must include valid start and end time", 400);
  }

  if (endAt <= startAt) {
    throw new ErrorHandler("Slot end time must be after start time", 400);
  }

  return {
    startAt,
    endAt,
    location: slot.location || "",
    mode: slot.mode || "offline",
  };
};

const assignSlotToProject = async ({ schedule, slot, project, pickedBy }) => {
  slot.status = "booked";
  slot.project = project._id;
  slot.pickedBy = pickedBy;
  slot.pickedAt = new Date();

  project.selectedSchedule = {
    scheduleId: schedule._id,
    slotId: slot._id,
    teacherId: schedule.teacher,
    startAt: slot.startAt,
    endAt: slot.endAt,
    location: slot.location,
    mode: slot.mode,
    pickedBy,
    pickedAt: slot.pickedAt,
  };
  project.defenseStatus = "scheduled";

  await Promise.all([schedule.save(), project.save()]);
};

const releaseProjectSlot = async ({ schedule, slot, project }) => {
  slot.status = "available";
  slot.project = null;
  slot.pickedBy = null;
  slot.pickedAt = null;

  project.selectedSchedule = {
    scheduleId: null,
    slotId: null,
    teacherId: null,
    startAt: null,
    endAt: null,
    location: null,
    mode: null,
    pickedBy: null,
    pickedAt: null,
  };
  project.defenseStatus = "not_started";

  await Promise.all([schedule.save(), project.save()]);
};

const notifyTeam = async (project, message, type = "defense") => {
  const memberIds = getProjectMemberIds(project);
  await Promise.all(
    memberIds.map((memberId) =>
      notificationServices.notifyUser(
        memberId,
        message,
        type,
        "/student/defense",
        type === "warning" ? "high" : "medium",
      ),
    ),
  );
};

export const runAutoAssignmentForSchedule = async (scheduleId) => {
  const schedule = await TeacherSchedule.findById(scheduleId);
  if (!schedule) {
    throw new ErrorHandler("Schedule not found", 404);
  }

  const now = new Date();
  if (schedule.pickDeadline > now || schedule.deadlineProcessedAt) {
    return { schedule, assignedProjects: [], redFlags: [] };
  }

  const availableSlots = schedule.slots
    .filter((slot) => slot.status === "available")
    .sort((left, right) => left.startAt - right.startAt);

  const projects = await Project.find({
    supervisor: schedule.teacher,
    archiveLocked: false,
    status: { $in: ["approved", "completed"] },
    "selectedSchedule.slotId": null,
  })
    .sort({ createdAt: 1 })
    .populate("student", "name email")
    .populate("members", "name email");

  const assignedProjects = [];
  const redFlags = [];

  for (const project of projects) {
    const slot = availableSlots.shift();
    if (!slot) {
      redFlags.push(project);
      continue;
    }

    await assignSlotToProject({
      schedule,
      slot,
      project,
      pickedBy: project.student,
    });
    assignedProjects.push({ projectId: project._id, slotId: slot._id });

    await notifyTeam(
      project,
      `Deadline pick lich da het. He thong da tu dong gan slot ${new Date(slot.startAt).toLocaleString()} cho nhom ${project.groupName || project.title}.`,
    );
  }

  if (redFlags.length > 0) {
    await notificationServices.notifyUser(
      schedule.teacher,
      `${redFlags.length} nhom chua duoc gan lich sau deadline pick slot. Can xu ly thu cong.`,
      "warning",
      "/teacher/defense",
      "high",
    );
  }

  schedule.deadlineProcessedAt = now;
  await schedule.save();

  return { schedule, assignedProjects, redFlags };
};

export const getTeacherSchedules = async (teacherId) => {
  const schedules = await TeacherSchedule.find({ teacher: teacherId })
    .populate("teacher", "name email")
    .populate("slots.project", "title groupName")
    .sort({ createdAt: -1 });

  for (const schedule of schedules) {
    await runAutoAssignmentForSchedule(schedule._id);
  }

  return TeacherSchedule.find({ teacher: teacherId })
    .populate("teacher", "name email")
    .populate("slots.project", "title groupName")
    .sort({ createdAt: -1 });
};

export const createTeacherSchedule = async (teacherId, payload) => {
  const slots = (payload.slots || []).map(normalizeSlotInput);
  const pickDeadline = new Date(payload.pickDeadline);

  if (slots.length === 0) {
    throw new ErrorHandler("Schedule must contain at least one slot", 400);
  }

  if (Number.isNaN(pickDeadline.getTime())) {
    throw new ErrorHandler("Pick deadline is invalid", 400);
  }

  if (!payload.title?.trim()) {
    throw new ErrorHandler("Schedule title is required", 400);
  }

  return TeacherSchedule.create({
    teacher: teacherId,
    title: payload.title.trim(),
    description: payload.description || "",
    pickDeadline,
    rescheduleWindowHours: payload.rescheduleWindowHours || 24,
    autoAssignEnabled: payload.autoAssignEnabled ?? true,
    slots,
  });
};

export const addSlotsToSchedule = async (teacherId, scheduleId, slotsInput) => {
  const schedule = await TeacherSchedule.findById(scheduleId);
  if (!schedule) {
    throw new ErrorHandler("Schedule not found", 404);
  }
  if (!isSameId(schedule.teacher, teacherId)) {
    throw new ErrorHandler("Not authorized to edit this schedule", 403);
  }

  const slots = (slotsInput || []).map(normalizeSlotInput);
  schedule.slots.push(...slots);
  await schedule.save();
  return schedule;
};

export const getStudentScheduleBoard = async (studentId) => {
  const project = await requireProjectByUser(studentId);
  ensureProjectMember(project, studentId);

  if (!project.supervisor) {
    throw new ErrorHandler("Project does not have a supervisor yet", 400);
  }

  const schedules = await TeacherSchedule.find({ teacher: project.supervisor._id })
    .populate("teacher", "name email")
    .sort({ createdAt: -1 });

  for (const schedule of schedules) {
    await runAutoAssignmentForSchedule(schedule._id);
  }

  const refreshed = await TeacherSchedule.find({ teacher: project.supervisor._id })
    .populate("teacher", "name email")
    .sort({ createdAt: -1 });

  const visibleSchedules = refreshed.map((schedule) => ({
    ...schedule.toObject(),
    slots: schedule.slots.filter((slot) => {
      if (slot.status === "available") return true;
      if (project.selectedSchedule?.slotId && isSameId(slot._id, project.selectedSchedule.slotId)) {
        return true;
      }
      return false;
    }),
  }));

  return { project, schedules: visibleSchedules };
};

export const pickScheduleSlot = async ({
  studentId,
  scheduleId,
  slotId,
}) => {
  const project = await requireProjectByUser(studentId);
  ensureProjectMember(project, studentId);
  ensureProjectEditable(project);
  if (!isSameId(project.student, studentId)) {
    throw new ErrorHandler(
      "Only the group representative can pick a defense slot",
      403,
    );
  }

  if (!project.supervisor) {
    throw new ErrorHandler("Project does not have a supervisor yet", 400);
  }

  if (project.selectedSchedule?.slotId) {
    throw new ErrorHandler(
      "Project already has a booked slot. Please reschedule before picking another slot.",
      400,
    );
  }

  const schedule = await TeacherSchedule.findOne({
    _id: scheduleId,
    teacher: project.supervisor._id,
  });

  if (!schedule) {
    throw new ErrorHandler("Teacher schedule not found", 404);
  }

  await runAutoAssignmentForSchedule(schedule._id);

  const now = new Date();
  if (schedule.pickDeadline < now) {
    throw new ErrorHandler(
      "Deadline for picking slots has passed. Teacher/admin must handle this schedule now.",
      400,
    );
  }

  const bookedAt = new Date();
  const lockedSchedule = await TeacherSchedule.findOneAndUpdate(
    {
      _id: scheduleId,
      teacher: project.supervisor._id,
      pickDeadline: { $gte: now },
      slots: {
        $elemMatch: {
          _id: slotId,
          status: "available",
        },
      },
    },
    {
      $set: {
        "slots.$.status": "booked",
        "slots.$.project": project._id,
        "slots.$.pickedBy": studentId,
        "slots.$.pickedAt": bookedAt,
      },
    },
    { new: true },
  );

  if (!lockedSchedule) {
    throw new ErrorHandler("Selected slot is no longer available", 409);
  }

  const slot = lockedSchedule.slots.id(slotId);

  try {
    project.selectedSchedule = {
      scheduleId: lockedSchedule._id,
      slotId: slot._id,
      teacherId: lockedSchedule.teacher,
      startAt: slot.startAt,
      endAt: slot.endAt,
      location: slot.location,
      mode: slot.mode,
      pickedBy: studentId,
      pickedAt: bookedAt,
    };
    project.defenseStatus = "scheduled";
    await project.save();
  } catch (error) {
    await TeacherSchedule.findOneAndUpdate(
      {
        _id: lockedSchedule._id,
        "slots._id": slotId,
        "slots.project": project._id,
      },
      {
        $set: {
          "slots.$.status": "available",
          "slots.$.project": null,
          "slots.$.pickedBy": null,
          "slots.$.pickedAt": null,
        },
      },
    );
    throw error;
  }

  await notifyTeam(
    project,
    `Nhom da chon lich bao cao vao ${new Date(slot.startAt).toLocaleString()}. Slot nay da duoc khoa cho ca nhom.`,
  );

  return { project, schedule: lockedSchedule, slot };
};

export const rescheduleProjectSlot = async ({
  studentId,
  scheduleId,
  slotId,
  reason,
}) => {
  const project = await requireProjectByUser(studentId);
  ensureProjectMember(project, studentId);
  ensureProjectEditable(project);
  if (!isSameId(project.student, studentId)) {
    throw new ErrorHandler(
      "Only the group representative can request a reschedule",
      403,
    );
  }

  if (!project.selectedSchedule?.slotId || !isSameId(project.selectedSchedule.slotId, slotId)) {
    throw new ErrorHandler("Project is not booked into this slot", 400);
  }

  const schedule = await TeacherSchedule.findById(scheduleId);
  if (!schedule) {
    throw new ErrorHandler("Schedule not found", 404);
  }

  const slot = schedule.slots.id(slotId);
  if (!slot || !isSameId(slot.project, project._id)) {
    throw new ErrorHandler("Booked slot not found", 404);
  }

  const hoursUntilDefense =
    (new Date(slot.startAt).getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilDefense < schedule.rescheduleWindowHours) {
    throw new ErrorHandler(
      `Reschedule is locked within ${schedule.rescheduleWindowHours} hours before defense. Please contact the teacher directly.`,
      400,
    );
  }

  await releaseProjectSlot({ schedule, slot, project });

  await notifyTeam(
    project,
    `Nhom da huy lich bao cao de doi slot khac. Ly do: ${reason || "Khong cung cap"}.`,
  );
  await notificationServices.notifyUser(
    toIdString(project.supervisor),
    `Nhom ${project.groupName || project.title} vua huy lich bao cao va yeu cau doi lich.`,
    "defense",
    "/teacher/defense",
    "medium",
  );

  return { project, schedule };
};
