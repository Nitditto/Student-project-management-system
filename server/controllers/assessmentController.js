import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import * as templateService from "../services/assessmentTemplateService.js";
import * as assessmentService from "../services/projectAssessmentService.js";

// === Admin: Assessment Templates ===

export const createAssessmentTemplate = asyncHandler(async (req, res, next) => {
  const template = await templateService.createTemplate(req.body);
  res.status(201).json({
    success: true,
    message: "Assessment template created successfully",
    data: { template }
  });
});

export const getAssessmentTemplate = asyncHandler(async (req, res, next) => {
  const template = await templateService.getTemplateById(req.params.id);
  if (!template) return next(new ErrorHandler("Template not found", 404));
  
  res.status(200).json({
    success: true,
    data: { template }
  });
});

// === Teacher: Project Assessments ===

export const initializeProjectAssessment = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const assessment = await assessmentService.initializeProjectAssessment(projectId);
  res.status(201).json({
    success: true,
    message: "Project assessment initialized",
    data: { assessment }
  });
});

export const submitMilestoneAssessment = asyncHandler(async (req, res, next) => {
  const { projectId, milestoneCode } = req.params;
  const { role, cloEntries, overallComment } = req.body;
  
  const assessment = await assessmentService.submitMilestoneAssessment(
    projectId,
    milestoneCode,
    req.user._id,
    role,
    cloEntries,
    overallComment
  );
  
  res.status(200).json({
    success: true,
    message: "Assessment submitted successfully",
    data: { assessment }
  });
});

export const finalizeProjectAssessment = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  
  // Note: Only Chairman or Admin should be allowed. Middleware should enforce this.
  const assessment = await assessmentService.finalizeProjectAssessment(projectId, req.user._id);
  
  res.status(200).json({
    success: true,
    message: "Project assessment finalized",
    data: { assessment }
  });
});

export const getProjectAssessmentSummary = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const assessment = await assessmentService.getProjectAssessmentSummary(projectId);
  
  if (!assessment) return next(new ErrorHandler("Assessment not found", 404));
  
  res.status(200).json({
    success: true,
    data: { assessment }
  });
});

export const submitPeerEvaluation = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const { targetStudentId, cloEntries, overallComment } = req.body;
  
  const studentAssessment = await assessmentService.submitPeerEvaluation(
    projectId,
    req.user._id,
    targetStudentId,
    cloEntries,
    overallComment
  );
  
  res.status(200).json({
    success: true,
    message: "Peer evaluation submitted successfully",
    data: { studentAssessment }
  });
});

export const getStudentAssessmentBoard = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  
  const board = await assessmentService.getStudentAssessmentBoard(projectId, req.user._id);
  
  res.status(200).json({
    success: true,
    data: board
  });
});

