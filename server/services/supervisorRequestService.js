import mongoose from "mongoose";
import SupervisorRequest from "../models/supervisorRequest.js";
import RegistrationPeriod from "../models/registrationPeriod.js";
import { ProjectGroup } from "../models/projectGroup.js";
import { Project } from "../models/project.js";
import { User } from "../models/user.js";

/**
 * Check teacher exists and role is Teacher
 */
const ensureTeacher = async (teacherId) => {
  const teacher = await User.findById(teacherId);

  if (!teacher) {
    throw new Error("Teacher not found");
  }

  if (teacher.role !== "Teacher") {
    throw new Error("Selected user is not a teacher");
  }

  return teacher;
};

/**
 * Count assigned students for a teacher in a registration period
 * Count by group size from official projects
 */
const getTeacherAssignedStudentCount = async ({ registrationPeriodId, teacherId }) => {
  const projects = await Project.find({
    registrationPeriod: registrationPeriodId,
    supervisor: teacherId,
  }).populate("group");

  let totalStudents = 0;

  for (const project of projects) {
    if (project.group && Array.isArray(project.group.members)) {
      totalStudents += project.group.members.length;
    } else if (project.student) {
      totalStudents += 1;
    }
  }

  return totalStudents;
};

/**
 * Validate teacher quota
 */
const validateTeacherQuota = async ({ registrationPeriodId, teacherId, incomingGroupSize }) => {
  const period = await RegistrationPeriod.findById(registrationPeriodId);

  if (!period) {
    throw new Error("Registration period not found");
  }

  const teacher = await ensureTeacher(teacherId);

  const assignedStudents = await getTeacherAssignedStudentCount({
    registrationPeriodId,
    teacherId,
  });

  const maxAllowed = teacher.maxStudent || period.maxStudentsPerTeacher || 10;

  if (assignedStudents + incomingGroupSize > maxAllowed) {
    throw new Error("Teacher has reached maximum student capacity");
  }

  return {
    teacher,
    assignedStudents,
    maxAllowed,
  };
};

/**
 * Create supervisor request by group leader
 */
export const createSupervisorRequest = async ({
  registrationPeriodId,
  groupId,
  teacherId,
  requestedBy,
  note,
}) => {
  const period = await RegistrationPeriod.findById(registrationPeriodId);

  if (!period) {
    throw new Error("Registration period not found");
  }

  if (period.status !== "open") {
    throw new Error("Registration period is not open");
  }

  const group = await ProjectGroup.findById(groupId);

  if (!group) {
    throw new Error("Project group not found");
  }

  if (String(group.registrationPeriod) !== String(registrationPeriodId)) {
    throw new Error("Group does not belong to this registration period");
  }

  if (String(group.leader) !== String(requestedBy)) {
    throw new Error("Only the leader can submit supervisor request");
  }

  if (!["ready", "rejected", "forming"].includes(group.status)) {
    throw new Error("Group is not in a valid state for supervisor request");
  }

  const existingPendingRequest = await SupervisorRequest.findOne({
    registrationPeriod: registrationPeriodId,
    group: groupId,
    status: "pending",
  });

  if (existingPendingRequest) {
    throw new Error("This group already has a pending supervisor request");
  }

  await validateTeacherQuota({
    registrationPeriodId,
    teacherId,
    incomingGroupSize: group.members.length,
  });

  const request = await SupervisorRequest.create({
    registrationPeriod: registrationPeriodId,
    group: groupId,
    teacher: teacherId,
    requestedBy,
    note: note || "",
    status: "pending",
  });

  group.status = "submitted";
  await group.save();

  return await SupervisorRequest.findById(request._id)
    .populate("teacher", "name email department experties maxStudent")
    .populate("requestedBy", "name email")
    .populate({
      path: "group",
      populate: [
        { path: "leader", select: "name email" },
        { path: "members.student", select: "name email role" },
      ],
    });
};

/**
 * Approve request and create official project
 */
export const approveSupervisorRequest = async ({
  requestId,
  teacherId,
  projectPayload = {},
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await SupervisorRequest.findById(requestId)
      .populate("group")
      .session(session);

    if (!request) {
      throw new Error("Supervisor request not found");
    }

    if (String(request.teacher) !== String(teacherId)) {
      throw new Error("You are not allowed to approve this request");
    }

    if (request.status !== "pending") {
      throw new Error("Supervisor request is no longer pending");
    }

    const group = request.group;

    await validateTeacherQuota({
      registrationPeriodId: request.registrationPeriod,
      teacherId,
      incomingGroupSize: group.members.length,
    });

    const existingProject = await Project.findOne({
      registrationPeriod: request.registrationPeriod,
      group: group._id,
    }).session(session);

    if (existingProject) {
      throw new Error("This group already has an official project");
    }

    request.status = "approved";
    request.reviewedBy = teacherId;
    request.reviewedAt = new Date();

    group.status = "approved";

    const fallbackStudentId =
      group.members?.length > 0 ? group.members[0].student : group.leader;

    const [project] = await Project.create(
      [
        {
          registrationPeriod: request.registrationPeriod,
          group: group._id,
          supervisor: teacherId,
          createdFromRequest: request._id,
          student: fallbackStudentId, // compatibility field
          title: projectPayload.title || group.name,
          description: projectPayload.description || "Project created from approved supervisor request",
          type: projectPayload.type || "capstone",
          status: "created",
        },
      ],
      { session }
    );

    // Optional backward compatibility updates on User
    const teacher = await User.findById(teacherId).session(session);
    if (teacher) {
      const newAssignedStudents = group.members.map((m) => m.student);
      teacher.assignedStudents = [
        ...new Set([
          ...teacher.assignedStudents.map((id) => String(id)),
          ...newAssignedStudents.map((id) => String(id)),
        ]),
      ];
      await teacher.save({ session });
    }

    await User.updateMany(
      { _id: { $in: group.members.map((m) => m.student) } },
      {
        $set: {
          supervisor: teacherId,
          project: project._id,
        },
      },
      { session }
    );

    await request.save({ session });
    await group.save({ session });

    // Cancel other pending requests of same group
    await SupervisorRequest.updateMany(
      {
        _id: { $ne: request._id },
        group: group._id,
        status: "pending",
      },
      {
        $set: {
          status: "cancelled",
          reviewedBy: teacherId,
          reviewedAt: new Date(),
        },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return {
      request,
      project,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Reject request
 */
export const rejectSupervisorRequest = async ({
  requestId,
  teacherId,
  reason,
}) => {
  const request = await SupervisorRequest.findById(requestId).populate("group");

  if (!request) {
    throw new Error("Supervisor request not found");
  }

  if (String(request.teacher) !== String(teacherId)) {
    throw new Error("You are not allowed to reject this request");
  }

  if (request.status !== "pending") {
    throw new Error("Supervisor request is no longer pending");
  }

  request.status = "rejected";
  request.reviewedBy = teacherId;
  request.reviewedAt = new Date();
  request.rejectionReason = reason || "No reason provided";

  request.group.status = "rejected";

  await request.save();
  await request.group.save();

  return request;
};

/**
 * Teacher request queue
 */
export const getTeacherRequests = async ({ teacherId, status }) => {
  const filter = { teacher: teacherId };

  if (status) {
    filter.status = status;
  }

  return await SupervisorRequest.find(filter)
    .populate("teacher", "name email department")
    .populate("requestedBy", "name email")
    .populate({
      path: "group",
      populate: [
        { path: "leader", select: "name email" },
        { path: "members.student", select: "name email role" },
      ],
    })
    .sort({ createdAt: -1 });
};

/**
 * Student/leader request history by group
 */
export const getRequestsByGroup = async ({ groupId, requesterId }) => {
  const group = await ProjectGroup.findById(groupId);

  if (!group) {
    throw new Error("Project group not found");
  }

  const isMember = group.members.some(
    (member) => String(member.student) === String(requesterId)
  );

  if (!isMember) {
    throw new Error("You are not allowed to view this group's requests");
  }

  return await SupervisorRequest.find({ group: groupId })
    .populate("teacher", "name email department experties")
    .populate("requestedBy", "name email")
    .sort({ createdAt: -1 });
};

/**
 * Cancel pending request by leader
 */
export const cancelSupervisorRequest = async ({
  requestId,
  requesterId,
}) => {
  const request = await SupervisorRequest.findById(requestId).populate("group");

  if (!request) {
    throw new Error("Supervisor request not found");
  }

  if (String(request.requestedBy) !== String(requesterId)) {
    throw new Error("Only the requester can cancel this request");
  }

  if (request.status !== "pending") {
    throw new Error("Only pending requests can be cancelled");
  }

  request.status = "cancelled";
  await request.save();

  request.group.status = "ready";
  await request.group.save();

  return request;
};