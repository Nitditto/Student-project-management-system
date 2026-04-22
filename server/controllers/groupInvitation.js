import mongoose from "mongoose";
import { ProjectGroup } from "../models/projectGroup.js";
import { User } from "../models/user.js";
import RegistrationPeriod from "../models/registrationPeriod.js";
import GroupInvitation from "./groupInvitation.js";

/**
 * Check registration period exists and is open
 */
const getOpenRegistrationPeriod = async (registrationPeriodId) => {
  const period = await RegistrationPeriod.findById(registrationPeriodId);

  if (!period) {
    throw new Error("Registration period not found");
  }

  if (period.status !== "open") {
    throw new Error("Registration period is not open");
  }

  return period;
};

/**
 * Ensure a student is not already in another group in the same registration period
 */
const ensureStudentNotInAnotherGroup = async (registrationPeriodId, studentId) => {
  const existedGroup = await ProjectGroup.findOne({
    registrationPeriod: registrationPeriodId,
    "members.student": studentId,
  });

  if (existedGroup) {
    throw new Error("Student is already in another group in this registration period");
  }
};

/**
 * Ensure the user is a student
 */
const ensureStudentRole = async (studentId) => {
  const student = await User.findById(studentId);

  if (!student) {
    throw new Error("Student not found");
  }

  if (student.role !== "Student") {
    throw new Error("Only students can join groups");
  }

  return student;
};

/**
 * Create a new project group
 * Leader is automatically included in members by schema pre-validate hook
 */
export const createGroup = async ({ registrationPeriodId, name, leaderId }) => {
  const period = await getOpenRegistrationPeriod(registrationPeriodId);

  if (!period.allowGroup) {
    throw new Error("This registration period does not allow group registration");
  }

  await ensureStudentRole(leaderId);
  await ensureStudentNotInAnotherGroup(registrationPeriodId, leaderId);

  const group = await ProjectGroup.create({
    registrationPeriod: registrationPeriodId,
    name,
    leader: leaderId,
    members: [],
    status: period.minGroupSize <= 1 ? "ready" : "forming",
  });

  return await ProjectGroup.findById(group._id)
    .populate("leader", "name email role")
    .populate("members.student", "name email role");
};

/**
 * Invite a student to join a group
 */
export const inviteMember = async ({ groupId, leaderId, studentId }) => {
  const group = await ProjectGroup.findById(groupId).populate("registrationPeriod");

  if (!group) {
    throw new Error("Project group not found");
  }

  if (String(group.leader) !== String(leaderId)) {
    throw new Error("Only the group leader can invite members");
  }

  if (group.status === "submitted" || group.status === "approved") {
    throw new Error("Cannot invite members after the group has been submitted/approved");
  }

  await ensureStudentRole(studentId);
  await ensureStudentNotInAnotherGroup(group.registrationPeriod._id, studentId);

  const alreadyInGroup = group.members.some(
    (member) => String(member.student) === String(studentId)
  );

  if (alreadyInGroup) {
    throw new Error("Student is already in this group");
  }

  const existingInvitation = await GroupInvitation.findOne({
    group: groupId,
    student: studentId,
    status: "pending",
  });

  if (existingInvitation) {
    throw new Error("This student already has a pending invitation");
  }

  if (group.members.length >= group.registrationPeriod.maxGroupSize) {
    throw new Error("Group has reached max member limit");
  }

  const invitation = await GroupInvitation.create({
    group: groupId,
    student: studentId,
    invitedBy: leaderId,
    status: "pending",
  });

  return invitation;
};

/**
 * Accept invitation
 */
export const acceptInvitation = async ({ invitationId, studentId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invitation = await GroupInvitation.findById(invitationId)
      .populate({
        path: "group",
        populate: { path: "registrationPeriod" },
      })
      .session(session);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (String(invitation.student) !== String(studentId)) {
      throw new Error("You are not allowed to accept this invitation");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been processed");
    }

    const group = invitation.group;
    const period = group.registrationPeriod;

    const existedGroup = await ProjectGroup.findOne({
      registrationPeriod: period._id,
      "members.student": studentId,
    }).session(session);

    if (existedGroup) {
      throw new Error("Student is already in another group");
    }

    if (group.members.length >= period.maxGroupSize) {
      throw new Error("Group is already full");
    }

    group.members.push({
      student: studentId,
      joinedAt: new Date(),
    });

    group.status = group.members.length >= period.minGroupSize ? "ready" : "forming";

    invitation.status = "accepted";
    invitation.respondedAt = new Date();

    await group.save({ session });
    await invitation.save({ session });

    await session.commitTransaction();
    session.endSession();

    return await ProjectGroup.findById(group._id)
      .populate("leader", "name email role")
      .populate("members.student", "name email role");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Reject invitation
 */
export const rejectInvitation = async ({ invitationId, studentId }) => {
  const invitation = await GroupInvitation.findById(invitationId);

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (String(invitation.student) !== String(studentId)) {
    throw new Error("You are not allowed to reject this invitation");
  }

  if (invitation.status !== "pending") {
    throw new Error("Invitation has already been processed");
  }

  invitation.status = "rejected";
  invitation.respondedAt = new Date();

  await invitation.save();

  return invitation;
};

/**
 * Remove a member from group
 * Only leader can remove, but cannot remove themselves
 */
export const removeMember = async ({ groupId, leaderId, studentId }) => {
  const group = await ProjectGroup.findById(groupId).populate("registrationPeriod");

  if (!group) {
    throw new Error("Project group not found");
  }

  if (String(group.leader) !== String(leaderId)) {
    throw new Error("Only the leader can remove members");
  }

  if (String(studentId) === String(leaderId)) {
    throw new Error("Leader cannot remove themselves");
  }

  if (group.status === "submitted" || group.status === "approved") {
    throw new Error("Cannot remove members after submission/approval");
  }

  const beforeCount = group.members.length;

  group.members = group.members.filter(
    (member) => String(member.student) !== String(studentId)
  );

  if (group.members.length === beforeCount) {
    throw new Error("Member not found in group");
  }

  group.status =
    group.members.length >= group.registrationPeriod.minGroupSize ? "ready" : "forming";

  await group.save();

  return await ProjectGroup.findById(group._id)
    .populate("leader", "name email role")
    .populate("members.student", "name email role");
};

/**
 * Get current user's group in a registration period
 */
export const getMyGroup = async ({ registrationPeriodId, studentId }) => {
  return await ProjectGroup.findOne({
    registrationPeriod: registrationPeriodId,
    "members.student": studentId,
  })
    .populate("leader", "name email role")
    .populate("members.student", "name email role");
};

/**
 * Get invitation list for current student
 */
export const getMyInvitations = async ({ studentId }) => {
  return await GroupInvitation.find({
    student: studentId,
    status: "pending",
  })
    .populate({
      path: "group",
      populate: [
        { path: "leader", select: "name email" },
        { path: "registrationPeriod", select: "name semester academicYear status" },
      ],
    })
    .sort({ createdAt: -1 });
};

/**
 * Submit group to start supervisor selection phase
 * Optional: if you want separate submit step before sending supervisor request
 */
export const submitGroup = async ({ groupId, leaderId }) => {
  const group = await ProjectGroup.findById(groupId).populate("registrationPeriod");

  if (!group) {
    throw new Error("Project group not found");
  }

  if (String(group.leader) !== String(leaderId)) {
    throw new Error("Only the leader can submit the group");
  }

  if (group.status === "approved") {
    throw new Error("Group is already approved");
  }

  if (group.members.length < group.registrationPeriod.minGroupSize) {
    throw new Error("Group does not meet minimum member requirement");
  }

  group.status = "ready";
  await group.save();

  return group;
};