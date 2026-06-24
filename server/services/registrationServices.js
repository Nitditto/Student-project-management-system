import mongoose from "mongoose";
import ErrorHandler from "../middleware/error.js";
import { GroupInvitation } from "../models/groupInvitation.js";
import { Project } from "../models/project.js";
import { RegistrationSetting } from "../models/registrationSetting.js";
import { TeacherPreselection } from "../models/teacherPreselection.js";
import { User } from "../models/user.js";
import * as notificationServices from "./notificationServices.js";
import { syncProjectMembers } from "./workflowProjectServices.js";
import { getProjectMemberIds, isSameId, toIdString } from "../utils/workflowHelpers.js";

const DEFAULT_SETTINGS = {
  key: "default",
  allowGroupProjects: true,
  minGroupSize: 1,
  maxGroupSize: 3,
  representativeMode: "leader_only",
  preselectPhaseEnabled: true,
  freePickOpen: false,
  proposalSubmissionOpen: true,
  notes: "",
  groupEditLocked: false,
  groupEditLockDate: null,
};

export const getRegistrationSettings = async () => {
  const existing = await RegistrationSetting.findOne({ key: "default" });
  if (existing) return existing;
  return RegistrationSetting.create(DEFAULT_SETTINGS);
};

export const updateRegistrationSettings = async (payload) => {
  const settings = await getRegistrationSettings();
  Object.assign(settings, {
    allowGroupProjects:
      payload.allowGroupProjects ?? settings.allowGroupProjects,
    minGroupSize: Number(payload.minGroupSize ?? settings.minGroupSize),
    maxGroupSize: Number(payload.maxGroupSize ?? settings.maxGroupSize),
    preselectPhaseEnabled:
      payload.preselectPhaseEnabled ?? settings.preselectPhaseEnabled,
    freePickOpen: payload.freePickOpen ?? settings.freePickOpen,
    proposalSubmissionOpen:
      payload.proposalSubmissionOpen ?? settings.proposalSubmissionOpen,
    notes: payload.notes ?? settings.notes,
    groupEditLocked: payload.groupEditLocked ?? settings.groupEditLocked,
    groupEditLockDate:
      payload.groupEditLockDate !== undefined
        ? payload.groupEditLockDate
        : settings.groupEditLockDate,
  });

  if (settings.minGroupSize > settings.maxGroupSize) {
    throw new ErrorHandler("Min group size cannot be greater than max group size", 400);
  }

  if (!settings.allowGroupProjects) {
    settings.minGroupSize = 1;
    settings.maxGroupSize = 1;
  }

  await settings.save();
  return settings;
};

/**
 * Global Lock Guard — checks if the system has frozen group editing.
 * Called by ALL student/teacher group-modification APIs.
 */
export const checkGroupEditLock = async () => {
  const settings = await RegistrationSetting.findOne({ key: "default" });
  if (!settings) return;

  const now = new Date();
  const isLockedByFlag = settings.groupEditLocked === true;
  const isLockedByDate =
    settings.groupEditLockDate && now >= new Date(settings.groupEditLockDate);

  if (isLockedByFlag || isLockedByDate) {
    throw new ErrorHandler(
      "Group editing is locked. The roster has been finalized by the administrator.",
      403,
    );
  }
};

const ensureStudentUser = async (userId) => {
  const student = await User.findOne({ _id: userId, role: "Student" });
  if (!student) {
    throw new ErrorHandler("Selected user is not a student", 400);
  }
  return student;
};

const ensureLeaderOwnsProject = (project, leaderId) => {
  if (!project || !isSameId(project.student, leaderId)) {
    throw new ErrorHandler("Only the group representative can perform this action", 403);
  }
};

const ensureUsersWithoutProject = async (memberIds) => {
  const count = await User.countDocuments({
    _id: { $in: memberIds },
    project: { $ne: null },
  });

  if (count > 0) {
    throw new ErrorHandler("One or more selected students already belong to another project", 400);
  }
};

const ensureTeacherCanTakeStudents = ({ teacher, studentIds, message }) => {
  const futureLoad = new Set([
    ...((teacher.assignedStudents || []).map(String)),
    ...(studentIds || []).map(String),
  ]);

  if (futureLoad.size > teacher.maxStudent) {
    throw new ErrorHandler(message, 400);
  }
};

export const createProjectProposalWithGroup = async ({
  studentId,
  title,
  description,
  groupName,
  memberIds = [],
}) => {
  const settings = await getRegistrationSettings();
  if (!settings.proposalSubmissionOpen) {
    throw new ErrorHandler("Project proposal submission is currently closed", 400);
  }

  const existingProject = await Project.findOne({
    $or: [{ student: studentId }, { members: studentId }],
    status: { $ne: "rejected" },
  });

  if (existingProject) {
    throw new ErrorHandler(
      "You already belong to an active project and cannot create another one",
      400,
    );
  }

  const uniqueMemberIds = Array.from(new Set((memberIds || []).map(String))).filter(
    (id) => id !== toIdString(studentId),
  );

  if (!settings.allowGroupProjects && uniqueMemberIds.length > 0) {
    throw new ErrorHandler("Group projects are disabled in the current registration period", 400);
  }

  const proposedGroupSize = 1 + uniqueMemberIds.length;
  if (proposedGroupSize < settings.minGroupSize || proposedGroupSize > settings.maxGroupSize) {
    throw new ErrorHandler(
      `Group size must be between ${settings.minGroupSize} and ${settings.maxGroupSize}`,
      400,
    );
  }

  await Promise.all(uniqueMemberIds.map((memberId) => ensureStudentUser(memberId)));
  await ensureUsersWithoutProject(uniqueMemberIds);

  const project = await Project.create({
    student: studentId,
    title,
    description,
    groupName: groupName || title,
    projectMode: uniqueMemberIds.length > 0 ? "group" : "individual",
    members: [studentId],
  });

  await User.findByIdAndUpdate(studentId, { project: project._id });

  if (uniqueMemberIds.length > 0) {
    await GroupInvitation.insertMany(
      uniqueMemberIds.map((invitee) => ({
        project: project._id,
        inviter: studentId,
        invitee,
      })),
    );

    await Promise.all(
      uniqueMemberIds.map((invitee) =>
        notificationServices.notifyUser(
          invitee,
          `Ban vua duoc moi vao nhom do an "${project.groupName}".`,
          "general",
          "/student/submit-proposal",
          "medium",
        ),
      ),
    );
  }

  return project;
};

export const getGroupCandidates = async (studentId) => {
  const currentProject = await Project.findOne({
    $or: [{ student: studentId }, { members: studentId }],
    status: { $ne: "rejected" },
  });

  const excludedIds = [studentId];
  if (currentProject) {
    excludedIds.push(...getProjectMemberIds(currentProject));
  }

  return User.find({
    role: "Student",
    _id: { $nin: excludedIds },
    project: null,
  })
    .select("name email department")
    .sort({ name: 1 });
};

export const getStudentRegistrationSetup = async (studentId) => {
  const settings = await getRegistrationSettings();
  const project = await Project.findOne({
    $or: [{ student: studentId }, { members: studentId }],
  })
    .sort({ createdAt: -1 })
    .populate("student", "name email")
    .populate("supervisor", "name email department")
    .populate("members", "name email department");

  const invitations = await GroupInvitation.find({
    $or: [{ invitee: studentId }, { inviter: studentId }],
  })
    .populate("project", "groupName title student members projectMode")
    .populate("inviter", "name email")
    .populate("invitee", "name email")
    .sort({ createdAt: -1 });

  const preselections = await TeacherPreselection.find({ student: studentId })
    .populate("teacher", "name email department experties")
    .sort({ createdAt: -1 });

  return {
    settings,
    project,
    invitations,
    preselections,
  };
};

export const respondGroupInvitation = async ({
  studentId,
  invitationId,
  decision,
}) => {
  const invitation = await GroupInvitation.findById(invitationId)
    .populate("project")
    .populate("inviter", "name")
    .populate("invitee", "name");

  if (!invitation || !isSameId(invitation.invitee, studentId)) {
    throw new ErrorHandler("Group invitation not found", 404);
  }
  if (invitation.status !== "pending") {
    throw new ErrorHandler("This invitation has already been processed", 400);
  }

  if (!["accepted", "rejected"].includes(decision)) {
    throw new ErrorHandler("Decision must be accepted or rejected", 400);
  }

  if (decision === "accepted") {
    const settings = await getRegistrationSettings();
    const project = await Project.findById(invitation.project._id);

    if (["completed", "done"].includes(project.status)) {
      throw new ErrorHandler(
        "Cannot join a project that is already completed",
        400,
      );
    }

    const currentProject = await Project.findOne({
      $or: [{ student: studentId }, { members: studentId }],
      _id: { $ne: project._id },
      status: { $ne: "rejected" },
    });

    if (currentProject) {
      throw new ErrorHandler("You already belong to another active project", 400);
    }

    if ((project.members || []).length >= settings.maxGroupSize) {
      throw new ErrorHandler("This group has reached the maximum size", 400);
    }

    if (project.supervisor) {
      const teacher = await User.findById(project.supervisor).select(
        "role maxStudent assignedStudents",
      );

      if (!teacher || teacher.role !== "Teacher") {
        throw new ErrorHandler("Assigned supervisor is invalid", 400);
      }

      ensureTeacherCanTakeStudents({
        teacher,
        studentIds: [studentId],
        message:
          "Teacher capacity is not enough to add another student to this supervised group",
      });
    }

    project.projectMode = "group";
    project.groupName = project.groupName || project.title;
    project.members = Array.from(
      new Set([...(project.members || []).map(String), String(studentId)]),
    );
    await project.save();

    await User.findByIdAndUpdate(studentId, {
      project: project._id,
      supervisor: project.supervisor || null,
    });

    if (project.supervisor) {
      await User.findByIdAndUpdate(project.supervisor, {
        $addToSet: { assignedStudents: studentId },
      });
    }

    await TeacherPreselection.updateMany(
      {
        student: studentId,
        status: "pending",
      },
      {
        status: "cancelled",
        respondedAt: new Date(),
      },
    );
  }

  invitation.status = decision;
  await invitation.save();

  await notificationServices.notifyUser(
    invitation.inviter._id,
    `${invitation.invitee.name} da ${decision === "accepted" ? "chap nhan" : "tu choi"} loi moi vao nhom "${invitation.project.groupName || invitation.project.title}".`,
    "general",
    "/student/submit-proposal",
    decision === "accepted" ? "low" : "medium",
  );

  return invitation;
};

export const getTeacherPreselectionCandidates = async (teacherId) => {
  const teacher = await User.findById(teacherId);
  if (!teacher) {
    throw new ErrorHandler("Teacher not found", 404);
  }

  const candidates = await User.find({
    role: "Student",
    supervisor: null,
  })
    .select("name email department project")
    .populate("project", "title groupName student projectMode")
    .sort({ name: 1 });

  return candidates.filter((student) => {
    if (!student.project) return true;
    return isSameId(student.project.student, student._id);
  });
};

export const createTeacherPreselection = async ({
  teacherId,
  studentId,
  note,
}) => {
  const settings = await getRegistrationSettings();
  if (!settings.preselectPhaseEnabled) {
    throw new ErrorHandler("Teacher preselection phase is disabled", 400);
  }

  const teacher = await User.findById(teacherId);
  const student = await ensureStudentUser(studentId);

  if (!teacher.hasCapacity()) {
    throw new ErrorHandler("Teacher has reached capacity", 400);
  }
  if (student.supervisor) {
    throw new ErrorHandler("Student already has a supervisor", 400);
  }

  const project = await Project.findOne({
    $or: [{ student: studentId }, { members: studentId }],
    status: { $ne: "rejected" },
  });

  if (project) {
    if (["completed", "done"].includes(project.status)) {
      throw new ErrorHandler(
        "Cannot preselect for a project that is already completed",
        400,
      );
    }
    if (!isSameId(project.student, studentId)) {
      throw new ErrorHandler(
        "Please preselect the group representative instead of a regular member",
        400,
      );
    }
  }

  const invitation = await TeacherPreselection.create({
    teacher: teacherId,
    student: studentId,
    note: note || "",
  });

  await notificationServices.notifyUser(
    studentId,
    `${teacher.name} da chon ban vao danh sach uu tien huong dan. Truong nhom co the chap nhan loi moi nay trong giai doan preselect.`,
    "general",
    "/student/supervisor",
    "medium",
  );

  return invitation;
};

export const getTeacherPreselections = async (teacherId) => {
  return TeacherPreselection.find({ teacher: teacherId })
    .populate("teacher", "name email")
    .populate("student", "name email department")
    .sort({ createdAt: -1 });
};

export const updateTeacherPreselection = async ({ teacherId, preselectionId, note }) => {
  const invitation = await TeacherPreselection.findOne({
    _id: preselectionId,
    teacher: teacherId,
    status: "pending",
  });

  if (!invitation) {
    throw new ErrorHandler("Pending preselection invitation not found", 404);
  }

  invitation.note = note || "";
  await invitation.save();
  return invitation;
};

export const deleteTeacherPreselection = async ({ teacherId, preselectionId }) => {
  const invitation = await TeacherPreselection.findOne({
    _id: preselectionId,
    teacher: teacherId,
    status: "pending",
  });

  if (!invitation) {
    throw new ErrorHandler("Pending preselection invitation not found", 404);
  }

  await TeacherPreselection.findByIdAndDelete(preselectionId);
  return { message: "Preselection invitation cancelled successfully" };
};

const assignTeacherToProjectMembers = async ({ project, teacherId }) => {
  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.role !== "Teacher") {
    throw new ErrorHandler("Selected supervisor is invalid", 400);
  }

  if (project.supervisor) {
    throw new ErrorHandler("Project already has a supervisor", 400);
  }

  const memberIds = getProjectMemberIds(project);
  ensureTeacherCanTakeStudents({
    teacher,
    studentIds: memberIds,
    message: "Teacher capacity is not enough for this whole group",
  });

  const projectUpdate = {
    supervisor: teacherId,
  };
  if (project.status === "pending") {
    projectUpdate.status = "approved";
  }

  const assignedProject = await Project.findOneAndUpdate(
    {
      _id: project._id,
      supervisor: null,
    },
    { $set: projectUpdate },
    { new: true },
  );

  if (!assignedProject) {
    throw new ErrorHandler("Project already has a supervisor", 400);
  }

  await User.updateMany(
    { _id: { $in: memberIds } },
    {
      supervisor: teacherId,
      project: assignedProject._id,
    },
  );

  await User.findByIdAndUpdate(teacherId, {
    $addToSet: { assignedStudents: { $each: memberIds } },
  });

  await TeacherPreselection.updateMany(
    {
      student: { $in: memberIds },
      status: "pending",
    },
    {
      status: "cancelled",
      respondedAt: new Date(),
    },
  );

  await syncProjectMembers(assignedProject);
  return assignedProject;
};

export const acceptTeacherPreselection = async ({
  studentId,
  preselectionId,
}) => {
  const settings = await getRegistrationSettings();
  if (!settings.preselectPhaseEnabled) {
    throw new ErrorHandler("Teacher preselection phase is disabled", 400);
  }

  const invitation = await TeacherPreselection.findById(preselectionId)
    .populate("teacher", "name email assignedStudents maxStudent")
    .populate("student", "name email");

  if (!invitation || !isSameId(invitation.student, studentId)) {
    throw new ErrorHandler("Teacher preselection invitation not found", 404);
  }
  if (invitation.status !== "pending") {
    throw new ErrorHandler("This invitation has already been processed", 400);
  }

  const project = await Project.findOne({
    student: studentId,
    status: { $ne: "rejected" },
  });

  if (!project) {
    throw new ErrorHandler(
      "Only the group representative can accept preselection after creating a project proposal",
      400,
    );
  }
  if (project.supervisor) {
    throw new ErrorHandler("Project already has a supervisor", 400);
  }

  await assignTeacherToProjectMembers({
    project,
    teacherId: invitation.teacher._id,
  });

  invitation.status = "accepted";
  invitation.respondedAt = new Date();
  await invitation.save();

  await Promise.all(
    getProjectMemberIds(project).map((memberId) =>
      notificationServices.notifyUser(
        memberId,
        `Nhom "${project.groupName || project.title}" da duoc gan voi giang vien huong dan ${invitation.teacher.name} theo luong preselect.`,
        "approval",
        "/student/supervisor",
        "low",
      ),
    ),
  );

  return invitation;
};

export const rejectTeacherPreselection = async ({
  studentId,
  preselectionId,
}) => {
  const invitation = await TeacherPreselection.findById(preselectionId)
    .populate("teacher", "name")
    .populate("student", "name");

  if (!invitation || !isSameId(invitation.student, studentId)) {
    throw new ErrorHandler("Teacher preselection invitation not found", 404);
  }
  if (invitation.status !== "pending") {
    throw new ErrorHandler("This invitation has already been processed", 400);
  }

  invitation.status = "rejected";
  invitation.respondedAt = new Date();
  await invitation.save();

  await notificationServices.notifyUser(
    invitation.teacher._id,
    `${invitation.student.name} da tu choi loi moi huong dan preselect.`,
    "general",
    "/teacher/preselect",
    "medium",
  );

  return invitation;
};

export const assignSupervisorToProjectByAdmin = async ({
  project,
  supervisorId,
}) => {
  return assignTeacherToProjectMembers({ project, teacherId: supervisorId });
};

// =============================================
// STUDENT GROUP MANAGEMENT
// =============================================

/**
 * Transfer leadership from current leader to another member.
 * Allowed at any project status (leader might need to hand off).
 */
export const transferLeadership = async ({ projectId, currentLeaderId, newLeaderId }) => {
  await checkGroupEditLock();

  const project = await Project.findById(projectId);
  if (!project) throw new ErrorHandler("Project not found", 404);

  if (!isSameId(project.student, currentLeaderId)) {
    throw new ErrorHandler("Only the current leader can transfer leadership", 403);
  }

  if (isSameId(currentLeaderId, newLeaderId)) {
    throw new ErrorHandler("New leader must be a different member", 400);
  }

  const isMember = (project.members || []).some((m) => isSameId(m, newLeaderId));
  if (!isMember) {
    throw new ErrorHandler("New leader must be an existing member of the project", 400);
  }

  if (["completed", "done", "defended"].includes(project.status)) {
    throw new ErrorHandler("Cannot transfer leadership on a completed/defended project", 400);
  }

  project.student = newLeaderId;
  await project.save();

  const newLeader = await User.findById(newLeaderId).select("name");
  const memberIds = getProjectMemberIds(project);
  await Promise.all(
    memberIds.map((memberId) =>
      notificationServices.notifyUser(
        memberId,
        `Leadership of project "${project.groupName || project.title}" has been transferred to ${newLeader?.name || "a new member"}.`,
        "general",
        "/student/submit-proposal",
        "medium",
      ),
    ),
  );

  return Project.findById(projectId)
    .populate("student", "name email")
    .populate("members", "name email")
    .populate("supervisor", "name email");
};

/**
 * Leader kicks a member from the project.
 * Files are kept as they belong to the project, not the individual.
 * Only allowed before supervisor is assigned.
 */
export const kickMember = async ({ projectId, leaderId, memberId }) => {
  await checkGroupEditLock();

  const project = await Project.findById(projectId);
  if (!project) throw new ErrorHandler("Project not found", 404);

  if (!isSameId(project.student, leaderId)) {
    throw new ErrorHandler("Only the leader can remove members", 403);
  }

  if (isSameId(leaderId, memberId)) {
    throw new ErrorHandler("Leader cannot remove themselves. Transfer leadership first or disband the group.", 400);
  }

  if (project.supervisor) {
    throw new ErrorHandler(
      "Cannot modify team after a supervisor has been assigned. Contact your supervisor or admin.",
      400,
    );
  }

  const memberIndex = (project.members || []).findIndex((m) => isSameId(m, memberId));
  if (memberIndex === -1) {
    throw new ErrorHandler("Student is not a member of this project", 400);
  }

  // Remove from project members
  project.members.splice(memberIndex, 1);

  // If only 1 member left → switch to individual
  if (project.members.length <= 1) {
    project.projectMode = "individual";
  }

  await project.save();

  // Clear the kicked user's references
  await User.findByIdAndUpdate(memberId, { project: null, supervisor: null });

  // Cancel any pending invitations for this user on this project
  await GroupInvitation.updateMany(
    { project: projectId, invitee: memberId, status: "pending" },
    { status: "cancelled" },
  );

  const kickedUser = await User.findById(memberId).select("name");
  await notificationServices.notifyUser(
    memberId,
    `You have been removed from project "${project.groupName || project.title}".`,
    "general",
    "/student/submit-proposal",
    "high",
  );

  // Notify remaining members
  const remainingIds = getProjectMemberIds(project).filter((id) => !isSameId(id, memberId));
  await Promise.all(
    remainingIds.map((id) =>
      notificationServices.notifyUser(
        id,
        `${kickedUser?.name || "A member"} has been removed from the project.`,
        "general",
        "/student/submit-proposal",
        "low",
      ),
    ),
  );

  return Project.findById(projectId)
    .populate("student", "name email")
    .populate("members", "name email")
    .populate("supervisor", "name email");
};

/**
 * Leader disbands the entire group.
 * Uses MongoDB transaction for ACID compliance.
 * Deletes the project, clears all user references, cancels invitations.
 */
export const disbandGroup = async ({ projectId, leaderId }) => {
  await checkGroupEditLock();

  const project = await Project.findById(projectId);
  if (!project) throw new ErrorHandler("Project not found", 404);

  if (!isSameId(project.student, leaderId)) {
    throw new ErrorHandler("Only the leader can disband the group", 403);
  }

  if (project.supervisor) {
    throw new ErrorHandler(
      "Cannot disband a project that already has a supervisor assigned. Contact your supervisor or admin.",
      400,
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const memberIds = (project.members || []).map(String);

    // Clear all members' user records
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $set: { project: null, supervisor: null } },
      { session },
    );

    // Cancel all invitations for this project
    await GroupInvitation.deleteMany({ project: projectId }, { session });

    // Delete the project document
    await Project.findByIdAndDelete(projectId, { session });

    await session.commitTransaction();
    return { message: "Group has been disbanded successfully." };
  } catch (error) {
    await session.abortTransaction();
    throw new ErrorHandler(
      "A system error occurred while disbanding the group. Data has been preserved.",
      500,
    );
  } finally {
    session.endSession();
  }
};

// =============================================
// TEACHER GROUP CONTROLS
// =============================================

/**
 * Teacher adds an orphan student (no project) to a supervised project.
 */
export const addMemberToProject = async ({ projectId, teacherId, studentId }) => {
  await checkGroupEditLock();

  const project = await Project.findById(projectId);
  if (!project) throw new ErrorHandler("Project not found", 404);

  if (!isSameId(project.supervisor, teacherId)) {
    throw new ErrorHandler("You are not the supervisor of this project", 403);
  }

  const student = await ensureStudentUser(studentId);
  if (student.project) {
    throw new ErrorHandler("This student already belongs to another project", 400);
  }

  const settings = await getRegistrationSettings();
  if ((project.members || []).length >= settings.maxGroupSize) {
    throw new ErrorHandler(
      `Group has reached the maximum size of ${settings.maxGroupSize} members`,
      400,
    );
  }

  // Add member
  project.members = Array.from(
    new Set([...(project.members || []).map(String), String(studentId)]),
  );
  project.projectMode = project.members.length > 1 ? "group" : "individual";
  await project.save();

  // Update user record
  await User.findByIdAndUpdate(studentId, {
    project: project._id,
    supervisor: teacherId,
  });

  // Add to teacher's assignedStudents
  await User.findByIdAndUpdate(teacherId, {
    $addToSet: { assignedStudents: studentId },
  });

  await notificationServices.notifyUser(
    studentId,
    `You have been added to project "${project.groupName || project.title}" by your supervisor.`,
    "general",
    "/student/submit-proposal",
    "medium",
  );

  return Project.findById(projectId)
    .populate("student", "name email")
    .populate("members", "name email")
    .populate("supervisor", "name email");
};

/**
 * Teacher removes a member from a supervised project.
 */
export const removeMemberFromProject = async ({ projectId, teacherId, memberId }) => {
  await checkGroupEditLock();

  const project = await Project.findById(projectId);
  if (!project) throw new ErrorHandler("Project not found", 404);

  if (!isSameId(project.supervisor, teacherId)) {
    throw new ErrorHandler("You are not the supervisor of this project", 403);
  }

  if (isSameId(project.student, memberId)) {
    throw new ErrorHandler(
      "Cannot remove the project leader. Transfer leadership first.",
      400,
    );
  }

  if ((project.members || []).length <= 1) {
    throw new ErrorHandler("Cannot remove the sole member of a project", 400);
  }

  const memberIndex = (project.members || []).findIndex((m) => isSameId(m, memberId));
  if (memberIndex === -1) {
    throw new ErrorHandler("Student is not a member of this project", 400);
  }

  project.members.splice(memberIndex, 1);
  if (project.members.length <= 1) {
    project.projectMode = "individual";
  }
  await project.save();

  await User.findByIdAndUpdate(memberId, { project: null, supervisor: null });
  await User.findByIdAndUpdate(teacherId, {
    $pull: { assignedStudents: memberId },
  });

  await notificationServices.notifyUser(
    memberId,
    `You have been removed from project "${project.groupName || project.title}" by the supervisor.`,
    "general",
    "/student/submit-proposal",
    "high",
  );

  return Project.findById(projectId)
    .populate("student", "name email")
    .populate("members", "name email")
    .populate("supervisor", "name email");
};

/**
 * Teacher forces a leadership change on a supervised project.
 */
export const forceChangeLeader = async ({ projectId, teacherId, newLeaderId }) => {
  await checkGroupEditLock();

  const project = await Project.findById(projectId);
  if (!project) throw new ErrorHandler("Project not found", 404);

  if (!isSameId(project.supervisor, teacherId)) {
    throw new ErrorHandler("You are not the supervisor of this project", 403);
  }

  const isMember = (project.members || []).some((m) => isSameId(m, newLeaderId));
  if (!isMember) {
    throw new ErrorHandler("New leader must be an existing member of the project", 400);
  }

  if (isSameId(project.student, newLeaderId)) {
    throw new ErrorHandler("This student is already the leader", 400);
  }

  project.student = newLeaderId;
  await project.save();

  const newLeader = await User.findById(newLeaderId).select("name");
  const memberIds = getProjectMemberIds(project);
  await Promise.all(
    memberIds.map((memberId) =>
      notificationServices.notifyUser(
        memberId,
        `The supervisor has reassigned leadership of project "${project.groupName || project.title}" to ${newLeader?.name || "a new member"}.`,
        "general",
        "/student/submit-proposal",
        "medium",
      ),
    ),
  );

  return Project.findById(projectId)
    .populate("student", "name email")
    .populate("members", "name email")
    .populate("supervisor", "name email");
};

/**
 * Teacher splits a project into two sub-projects.
 * The original project keeps the remaining members.
 * A new project is created with the specified subset.
 */
export const splitProject = async ({ projectId, teacherId, memberIdsForNewProject, newTitle }) => {
  await checkGroupEditLock();

  const project = await Project.findById(projectId);
  if (!project) throw new ErrorHandler("Project not found", 404);

  if (!isSameId(project.supervisor, teacherId)) {
    throw new ErrorHandler("You are not the supervisor of this project", 403);
  }

  if (!memberIdsForNewProject || memberIdsForNewProject.length === 0) {
    throw new ErrorHandler("Must specify at least one member for the new project", 400);
  }

  const currentMemberStrings = (project.members || []).map(String);
  const newGroupStrings = memberIdsForNewProject.map(String);

  // Validate all specified members are actually in this project
  for (const id of newGroupStrings) {
    if (!currentMemberStrings.includes(id)) {
      throw new ErrorHandler(`Student ${id} is not a member of this project`, 400);
    }
  }

  const remainingMembers = currentMemberStrings.filter((id) => !newGroupStrings.includes(id));
  if (remainingMembers.length === 0) {
    throw new ErrorHandler("Cannot move all members out. At least one must stay in the original project.", 400);
  }

  // If the leader is being moved to the new group, auto-transfer leadership first
  if (newGroupStrings.includes(String(project.student))) {
    // Pick the first remaining member as the new leader of the original project
    project.student = remainingMembers[0];
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update original project
    project.members = remainingMembers;
    project.projectMode = remainingMembers.length > 1 ? "group" : "individual";
    await project.save({ session });

    // Create new project
    const newProject = await Project.create(
      [
        {
          student: newGroupStrings[0], // First member in new group becomes leader
          title: newTitle || `${project.title} (Split)`,
          description: project.description,
          groupName: newTitle || `${project.groupName || project.title} (Split)`,
          projectMode: newGroupStrings.length > 1 ? "group" : "individual",
          members: newGroupStrings,
          supervisor: project.supervisor,
          status: project.status,
        },
      ],
      { session },
    );

    const createdProject = newProject[0];

    // Update user records for new group
    await User.updateMany(
      { _id: { $in: newGroupStrings } },
      { project: createdProject._id },
      { session },
    );

    await session.commitTransaction();

    // Notify everyone
    const allMembers = [...remainingMembers, ...newGroupStrings];
    await Promise.all(
      allMembers.map((memberId) =>
        notificationServices.notifyUser(
          memberId,
          `Project "${project.title}" has been split by the supervisor. Please check your project details.`,
          "general",
          "/student/submit-proposal",
          "high",
        ),
      ),
    );

    return {
      originalProject: await Project.findById(projectId)
        .populate("student", "name email")
        .populate("members", "name email")
        .populate("supervisor", "name email"),
      newProject: await Project.findById(createdProject._id)
        .populate("student", "name email")
        .populate("members", "name email")
        .populate("supervisor", "name email"),
    };
  } catch (error) {
    await session.abortTransaction();
    throw new ErrorHandler(
      error.message || "A system error occurred while splitting the project.",
      500,
    );
  } finally {
    session.endSession();
  }
};

// =============================================
// ADMIN MASTER CONTROLS
// =============================================

/**
 * Admin forces orphan students into a single project.
 */
export const forceMergeStudents = async ({ studentIds, title, description, supervisorId }) => {
  if (!studentIds || studentIds.length === 0) {
    throw new ErrorHandler("Must specify at least one student", 400);
  }

  // Verify all students exist and have no project
  const students = await User.find({
    _id: { $in: studentIds },
    role: "Student",
  }).select("name email project");

  if (students.length !== studentIds.length) {
    throw new ErrorHandler("One or more student IDs are invalid", 400);
  }

  const studentsWithProject = students.filter((s) => s.project);
  if (studentsWithProject.length > 0) {
    throw new ErrorHandler(
      `Students already in a project: ${studentsWithProject.map((s) => s.name).join(", ")}`,
      400,
    );
  }

  const leaderId = studentIds[0];
  const projectData = {
    student: leaderId,
    title: title || "Merged Project",
    description: description || "Project created via admin force merge.",
    groupName: title || "Merged Group",
    projectMode: studentIds.length > 1 ? "group" : "individual",
    members: studentIds,
    status: "created",
  };

  if (supervisorId) {
    const supervisor = await User.findById(supervisorId);
    if (!supervisor || supervisor.role !== "Teacher") {
      throw new ErrorHandler("Invalid supervisor", 400);
    }
    projectData.supervisor = supervisorId;
    projectData.status = "approved";
  }

  const project = await Project.create(projectData);

  // Update all students
  await User.updateMany(
    { _id: { $in: studentIds } },
    {
      project: project._id,
      supervisor: supervisorId || null,
    },
  );

  if (supervisorId) {
    await User.findByIdAndUpdate(supervisorId, {
      $addToSet: { assignedStudents: { $each: studentIds } },
    });
  }

  await Promise.all(
    studentIds.map((sid) =>
      notificationServices.notifyUser(
        sid,
        `You have been assigned to project "${project.title}" by the administrator.`,
        "general",
        "/student/submit-proposal",
        "high",
      ),
    ),
  );

  return Project.findById(project._id)
    .populate("student", "name email")
    .populate("members", "name email")
    .populate("supervisor", "name email");
};
