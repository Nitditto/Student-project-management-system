import { asyncHandler } from "../middleware/asyncHandler.js";
import * as registrationServices from "../services/registrationServices.js";
import { User } from "../models/user.js";

export const getRegistrationSettings = asyncHandler(async (req, res) => {
  const settings = await registrationServices.getRegistrationSettings();
  res.status(200).json({
    success: true,
    data: { settings },
  });
});

export const updateRegistrationSettings = asyncHandler(async (req, res) => {
  const settings = await registrationServices.updateRegistrationSettings(req.body);
  res.status(200).json({
    success: true,
    message: "Registration settings updated successfully",
    data: { settings },
  });
});

export const getStudentRegistrationSetup = asyncHandler(async (req, res) => {
  const data = await registrationServices.getStudentRegistrationSetup(req.user._id);
  res.status(200).json({
    success: true,
    data,
  });
});

export const getGroupCandidates = asyncHandler(async (req, res) => {
  const students = await registrationServices.getGroupCandidates(req.user._id);
  res.status(200).json({
    success: true,
    data: { students },
  });
});

export const respondGroupInvitation = asyncHandler(async (req, res) => {
  const invitation = await registrationServices.respondGroupInvitation({
    studentId: req.user._id,
    invitationId: req.params.invitationId,
    decision: req.body.decision,
  });
  res.status(200).json({
    success: true,
    message: "Group invitation updated successfully",
    data: { invitation },
  });
});

export const getTeacherPreselectionCandidates = asyncHandler(async (req, res) => {
  const students = await registrationServices.getTeacherPreselectionCandidates(
    req.user._id,
  );
  res.status(200).json({
    success: true,
    data: { students },
  });
});

export const createTeacherPreselection = asyncHandler(async (req, res) => {
  const invitation = await registrationServices.createTeacherPreselection({
    teacherId: req.user._id,
    studentId: req.body.studentId,
    note: req.body.note,
  });
  res.status(201).json({
    success: true,
    message: "Teacher preselection sent successfully",
    data: { invitation },
  });
});

export const getTeacherPreselections = asyncHandler(async (req, res) => {
  const invitations = await registrationServices.getTeacherPreselections(req.user._id);
  res.status(200).json({
    success: true,
    data: { invitations },
  });
});

export const getTeacherDirectory = asyncHandler(async (req, res) => {
  const teachers = await User.find({ role: "Teacher" })
    .select("name email department")
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: { teachers },
  });
});

export const acceptTeacherPreselection = asyncHandler(async (req, res) => {
  const invitation = await registrationServices.acceptTeacherPreselection({
    studentId: req.user._id,
    preselectionId: req.params.preselectionId,
  });
  res.status(200).json({
    success: true,
    message: "Teacher preselection accepted successfully",
    data: { invitation },
  });
});

export const rejectTeacherPreselection = asyncHandler(async (req, res) => {
  const invitation = await registrationServices.rejectTeacherPreselection({
    studentId: req.user._id,
    preselectionId: req.params.preselectionId,
  });
  res.status(200).json({
    success: true,
    message: "Teacher preselection rejected successfully",
    data: { invitation },
  });
});

// =============================================
// STUDENT GROUP MANAGEMENT
// =============================================

export const transferLeadership = asyncHandler(async (req, res) => {
  const project = await registrationServices.transferLeadership({
    projectId: req.params.projectId,
    currentLeaderId: req.user._id,
    newLeaderId: req.body.newLeaderId,
  });
  res.status(200).json({
    success: true,
    message: "Leadership transferred successfully",
    data: { project },
  });
});

export const kickMember = asyncHandler(async (req, res) => {
  const project = await registrationServices.kickMember({
    projectId: req.params.projectId,
    leaderId: req.user._id,
    memberId: req.body.memberId,
  });
  res.status(200).json({
    success: true,
    message: "Member removed successfully",
    data: { project },
  });
});

export const disbandGroup = asyncHandler(async (req, res) => {
  const result = await registrationServices.disbandGroup({
    projectId: req.params.projectId,
    leaderId: req.user._id,
  });
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

// =============================================
// TEACHER GROUP CONTROLS
// =============================================

export const teacherAddMember = asyncHandler(async (req, res) => {
  const project = await registrationServices.addMemberToProject({
    projectId: req.params.projectId,
    teacherId: req.user._id,
    studentId: req.body.studentId,
  });
  res.status(200).json({
    success: true,
    message: "Member added to project successfully",
    data: { project },
  });
});

export const teacherRemoveMember = asyncHandler(async (req, res) => {
  const project = await registrationServices.removeMemberFromProject({
    projectId: req.params.projectId,
    teacherId: req.user._id,
    memberId: req.body.memberId,
  });
  res.status(200).json({
    success: true,
    message: "Member removed from project successfully",
    data: { project },
  });
});

export const teacherChangeLeader = asyncHandler(async (req, res) => {
  const project = await registrationServices.forceChangeLeader({
    projectId: req.params.projectId,
    teacherId: req.user._id,
    newLeaderId: req.body.newLeaderId,
  });
  res.status(200).json({
    success: true,
    message: "Leader reassigned successfully",
    data: { project },
  });
});

export const teacherSplitProject = asyncHandler(async (req, res) => {
  const result = await registrationServices.splitProject({
    projectId: req.params.projectId,
    teacherId: req.user._id,
    memberIdsForNewProject: req.body.memberIds,
    newTitle: req.body.newTitle,
  });
  res.status(200).json({
    success: true,
    message: "Project split successfully",
    data: result,
  });
});

// =============================================
// ADMIN MASTER CONTROLS
// =============================================

export const forceMergeStudents = asyncHandler(async (req, res) => {
  const project = await registrationServices.forceMergeStudents({
    studentIds: req.body.studentIds,
    title: req.body.title,
    description: req.body.description,
    supervisorId: req.body.supervisorId,
  });
  res.status(201).json({
    success: true,
    message: "Students merged into project successfully",
    data: { project },
  });
});
