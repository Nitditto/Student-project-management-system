import { asyncHandler } from "../middleware/asyncHandler.js";
import * as councilServices from "../services/councilServices.js";
import * as fileServices from "../services/fileServices.js";

export const createCouncil = asyncHandler(async (req, res) => {
  const council = await councilServices.createCouncil(req.body);
  res.status(201).json({
    success: true,
    message: "Council created successfully",
    data: { council },
  });
});

export const getAdminCouncils = asyncHandler(async (req, res) => {
  const councils = await councilServices.getAdminCouncils();
  res.status(200).json({
    success: true,
    data: { councils },
  });
});

export const assignProjectToCouncil = asyncHandler(async (req, res) => {
  const council = await councilServices.assignProjectToCouncil({
    councilId: req.params.councilId,
    projectId: req.body.projectId,
  });
  res.status(200).json({
    success: true,
    message: "Project assigned to council successfully",
    data: { council },
  });
});

export const assignReviewerByChairman = asyncHandler(async (req, res) => {
  const council = await councilServices.assignReviewerByChairman({
    teacherId: req.user._id,
    councilId: req.params.councilId,
    projectId: req.params.projectId,
    reviewerId: req.body.reviewerId,
    reviewerWeight: req.body.reviewerWeight,
  });
  res.status(200).json({
    success: true,
    message: "Reviewer assigned successfully",
    data: { council },
  });
});

export const getTeacherCouncils = asyncHandler(async (req, res) => {
  const councils = await councilServices.getTeacherCouncils(req.user._id);
  res.status(200).json({
    success: true,
    data: { councils },
  });
});

export const submitCouncilScore = asyncHandler(async (req, res) => {
  const council = await councilServices.submitCouncilScore({
    teacherId: req.user._id,
    councilId: req.params.councilId,
    projectId: req.params.projectId,
    score: req.body.score,
    comment: req.body.comment,
  });
  res.status(200).json({
    success: true,
    message: "Score submitted successfully",
    data: { council },
  });
});

export const submitReviewerForm = asyncHandler(async (req, res) => {
  const council = await councilServices.submitReviewerForm({
    teacherId: req.user._id,
    councilId: req.params.councilId,
    projectId: req.params.projectId,
    summary: req.body.summary,
    strengths: req.body.strengths,
    concerns: req.body.concerns,
    recommendation: req.body.recommendation,
  });
  res.status(200).json({
    success: true,
    message: "Reviewer form exported to PDF successfully",
    data: { council },
  });
});

export const finalizeCouncilProject = asyncHandler(async (req, res) => {
  const council = await councilServices.finalizeCouncilProject({
    teacherId: req.user._id,
    councilId: req.params.councilId,
    projectId: req.params.projectId,
    chairComment: req.body.chairComment,
  });
  res.status(200).json({
    success: true,
    message: "Final score locked successfully",
    data: { council },
  });
});

export const getStudentCouncilBoard = asyncHandler(async (req, res) => {
  const data = await councilServices.getStudentCouncilBoard(req.user._id);
  res.status(200).json({
    success: true,
    data,
  });
});

export const downloadReviewerForm = asyncHandler(async (req, res) => {
  const file = await councilServices.getReviewerFormDownload({
    councilId: req.params.councilId,
    projectId: req.params.projectId,
    teacherId: req.user.role === "Teacher" ? req.user._id : null,
    studentId: req.user.role === "Student" ? req.user._id : null,
  });

  fileServices.streamDownload(file.filePath, res, file.fileName);
});
