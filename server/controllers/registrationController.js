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
