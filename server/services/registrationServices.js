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
          "/student/registration",
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
  }

  invitation.status = decision;
  await invitation.save();

  await notificationServices.notifyUser(
    invitation.inviter._id,
    `${invitation.invitee.name} da ${decision === "accepted" ? "chap nhan" : "tu choi"} loi moi vao nhom "${invitation.project.groupName || invitation.project.title}".`,
    "general",
    "/student/registration",
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

  if (project && !isSameId(project.student, studentId)) {
    throw new ErrorHandler(
      "Please preselect the group representative instead of a regular member",
      400,
    );
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
    "/student/registration",
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

const assignTeacherToProjectMembers = async ({ project, teacherId }) => {
  const teacher = await User.findById(teacherId);
  const memberIds = getProjectMemberIds(project);
  const futureLoad = new Set([
    ...(teacher.assignedStudents || []).map(String),
    ...memberIds.map(String),
  ]);

  if (futureLoad.size > teacher.maxStudent) {
    throw new ErrorHandler("Teacher capacity is not enough for this whole group", 400);
  }

  project.supervisor = teacherId;
  if (project.status === "pending") {
    project.status = "approved";
  }
  await project.save();

  await User.updateMany(
    { _id: { $in: memberIds } },
    {
      supervisor: teacherId,
      project: project._id,
    },
  );

  await User.findByIdAndUpdate(teacherId, {
    $addToSet: { assignedStudents: { $each: memberIds } },
  });

  await syncProjectMembers(project);
  return project;
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

  await TeacherPreselection.updateMany(
    {
      student: studentId,
      _id: { $ne: invitation._id },
      status: "pending",
    },
    {
      status: "cancelled",
      respondedAt: new Date(),
    },
  );

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
