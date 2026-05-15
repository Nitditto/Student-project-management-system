import { asyncHandler } from "../middleware/asyncHandler.js";
import * as assessmentTemplateService from "../services/assessmentTemplateService.js";
import * as projectAssessmentService from "../services/projectAssessmentService.js";

const parseCloEntries = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
};

export const listAssessmentTemplates = asyncHandler(async (req, res) => {
  const templates = await assessmentTemplateService.listAssessmentTemplates();
  res.status(200).json({
    success: true,
    data: { templates },
  });
});

export const createAssessmentTemplate = asyncHandler(async (req, res) => {
  const template = await assessmentTemplateService.createAssessmentTemplate(req.body);
  res.status(201).json({
    success: true,
    message: "Assessment template created successfully",
    data: { template },
  });
});

export const getAssessmentTemplate = asyncHandler(async (req, res) => {
  const template = await assessmentTemplateService.getAssessmentTemplateById(
    req.params.templateId,
  );
  res.status(200).json({
    success: true,
    data: { template },
  });
});

export const submitTeacherAssessmentSubmission = asyncHandler(async (req, res) => {
  const summary = await projectAssessmentService.submitTeacherMilestoneSubmission({
    projectId: req.params.projectId,
    milestoneCode: req.params.milestoneCode,
    teacherId: req.user._id,
    cloEntries: parseCloEntries(req.body.cloEntries),
    overallComment: req.body.overallComment,
    files: req.files || [],
  });

  res.status(200).json({
    success: true,
    message: "Assessment submission saved successfully",
    data: { assessment: summary },
  });
});

export const updateTeacherAssessmentSubmission = asyncHandler(async (req, res) => {
  const summary = await projectAssessmentService.updateTeacherMilestoneSubmission({
    projectId: req.params.projectId,
    milestoneCode: req.params.milestoneCode,
    submissionId: req.params.submissionId,
    teacherId: req.user._id,
    cloEntries: parseCloEntries(req.body.cloEntries),
    overallComment: req.body.overallComment,
    approvalStatus: req.body.approvalStatus,
    files: req.files || [],
  });

  res.status(200).json({
    success: true,
    message: "Assessment submission updated successfully",
    data: { assessment: summary },
  });
});

export const submitTeacherM5Submission = asyncHandler(async (req, res) => {
  const summary = await projectAssessmentService.submitTeacherMilestoneSubmission({
    projectId: req.params.projectId,
    milestoneCode: "M5",
    teacherId: req.user._id,
    cloEntries: parseCloEntries(req.body.cloEntries),
    overallComment: req.body.overallComment,
    files: req.files || [],
  });

  res.status(200).json({
    success: true,
    message: "M5 CLO rubric submitted successfully",
    data: { assessment: summary },
  });
});

export const submitStudentPeerEvaluation = asyncHandler(async (req, res) => {
  const summary = await projectAssessmentService.submitStudentPeerEvaluation({
    studentId: req.user._id,
    projectId: req.params.projectId,
    cloEntries: parseCloEntries(req.body.cloEntries),
    overallComment: req.body.overallComment,
    files: req.files || [],
  });

  res.status(200).json({
    success: true,
    message: "Peer/ICS submission saved successfully",
    data: { assessment: summary },
  });
});

export const finalizeCloAssessment = asyncHandler(async (req, res) => {
  const summary = await projectAssessmentService.finalizeProjectAssessment({
    projectId: req.params.projectId,
    councilId: req.params.councilId,
    teacherId: req.user._id,
    chairComment: req.body.chairComment,
  });

  res.status(200).json({
    success: true,
    message: "CLO assessment finalized successfully",
    data: { assessment: summary },
  });
});

export const getTeacherProjectAssessmentSummary = asyncHandler(async (req, res) => {
  const summary = await projectAssessmentService.getProjectAssessmentSummary({
    projectId: req.params.projectId,
  });
  res.status(200).json({
    success: true,
    data: { assessment: summary },
  });
});

export const getStudentAssessmentBoard = asyncHandler(async (req, res) => {
  const data = await projectAssessmentService.getStudentAssessmentBoardByProject({
    studentId: req.user._id,
    projectId: req.params.projectId || null,
  });
  res.status(200).json({
    success: true,
    data,
  });
});

export const getAdminQaDashboard = asyncHandler(async (req, res) => {
  const dashboard = await projectAssessmentService.getAdminQaDashboard();
  res.status(200).json({
    success: true,
    data: { dashboard },
  });
});
