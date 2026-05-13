import { ProjectAssessment } from "../models/projectAssessment.js";
import { StudentAssessment } from "../models/studentAssessment.js";
import { Project } from "../models/project.js";
import { AssessmentTemplate } from "../models/assessmentTemplate.js";
import { aggregateMilestoneCloScores, scale5To10, calculateFinalCloScores, calculateTeamFinalScore, evaluatePassStatus } from "./assessmentScoringService.js";
import ErrorHandler from "../middleware/error.js";

export const initializeProjectAssessment = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new ErrorHandler("Project not found", 404);

  // Default track to capstone for now, or get from project.type
  const track = project.type || "capstone";
  const template = await AssessmentTemplate.findOne({ track, isActive: true }).sort({ createdAt: -1 });
  if (!template) throw new ErrorHandler(`No active assessment template found for track: ${track}`, 400);

  // Prevent multiple initializations
  const existing = await ProjectAssessment.findOne({ projectId });
  if (existing) return existing;

  const milestones = template.milestones.map(m => ({
    code: m.code,
    weight: m.weight,
    status: "pending",
    assessorSubmissions: []
  }));

  const assessment = await ProjectAssessment.create({
    templateVersion: template.version,
    projectId,
    milestones
  });

  // Initialize student assessments
  for (const memberId of project.members) {
    await StudentAssessment.create({
      studentId: memberId,
      projectId,
      peerSubmissionsReceived: []
    });
  }

  return assessment;
};

export const submitMilestoneAssessment = async (projectId, milestoneCode, assessorId, role, cloEntries, overallComment) => {
  const assessment = await ProjectAssessment.findOne({ projectId });
  if (!assessment) throw new ErrorHandler("Project assessment not initialized", 404);

  const milestone = assessment.milestones.find(m => m.code === milestoneCode);
  if (!milestone) throw new ErrorHandler("Milestone not found in template", 400);

  // Check if assessor already submitted
  const existingSubmission = milestone.assessorSubmissions.find(s => s.assessorId.toString() === assessorId.toString());
  if (existingSubmission) {
    throw new ErrorHandler("Assessor has already submitted for this milestone", 400);
  }

  milestone.assessorSubmissions.push({
    assessorId,
    role,
    cloEntries,
    overallComment,
    submittedAt: new Date()
  });

  milestone.status = "in_progress";

  // Re-calculate the milestone aggregation
  const aggregatedMap = aggregateMilestoneCloScores(milestone.assessorSubmissions);
  milestone.aggregatedCloScores = aggregatedMap;

  // Simple average of aggregated CLOs to get component score 5
  let totalScore5 = 0;
  let count = 0;
  aggregatedMap.forEach((val) => {
    totalScore5 += val;
    count++;
  });
  
  if (count > 0) {
    milestone.componentScore5 = totalScore5 / count;
    milestone.componentScore10 = scale5To10(milestone.componentScore5);
  }

  await assessment.save();
  return assessment;
};

export const finalizeProjectAssessment = async (projectId, chairmanId) => {
  const assessment = await ProjectAssessment.findOne({ projectId });
  if (!assessment) throw new ErrorHandler("Project assessment not found", 404);

  const template = await AssessmentTemplate.findOne({ version: assessment.templateVersion });
  if (!template) throw new ErrorHandler("Template not found", 404);

  // Calculate final CLOs
  assessment.cloResults = calculateFinalCloScores(assessment.milestones, template.cloMatrix, template.passingRules.minCloScore);
  
  // Calculate final Team score
  assessment.teamFinalScore = calculateTeamFinalScore(assessment.milestones);
  
  // Evaluate pass status
  assessment.teamPassStatus = evaluatePassStatus(assessment.teamFinalScore, assessment.cloResults, template.passingRules.minFinalScore);
  
  assessment.finalizedAt = new Date();
  assessment.finalizedBy = chairmanId;

  await assessment.save();

  // Mirror back to project for legacy UI compatibility
  const project = await Project.findById(projectId);
  if (project) {
    project.defenseFinalScore = assessment.teamFinalScore;
    if (assessment.teamPassStatus === true) {
      project.status = "done";
      project.defenseStatus = "done";
    }
    await project.save();
  }

  return assessment;
};

export const getProjectAssessmentSummary = async (projectId) => {
  const assessment = await ProjectAssessment.findOne({ projectId })
    .populate("milestones.assessorSubmissions.assessorId", "name email role")
    .populate("finalizedBy", "name email");
  return assessment;
};

export const submitPeerEvaluation = async (projectId, evaluatorId, targetStudentId, cloEntries, overallComment) => {
  const studentAssessment = await StudentAssessment.findOne({ projectId, studentId: targetStudentId });
  if (!studentAssessment) throw new ErrorHandler("Student assessment not initialized", 404);

  const existing = studentAssessment.peerSubmissionsReceived.find(
    s => s.assessorId.toString() === evaluatorId.toString()
  );
  if (existing) throw new ErrorHandler("You have already evaluated this peer", 400);

  studentAssessment.peerSubmissionsReceived.push({
    assessorId: evaluatorId,
    cloEntries,
    comment: overallComment
  });

  await studentAssessment.save();
  return studentAssessment;
};

export const getStudentAssessmentBoard = async (projectId, studentId) => {
  const projectAssessment = await ProjectAssessment.findOne({ projectId });
  const studentAssessment = await StudentAssessment.findOne({ projectId, studentId })
    .populate("peerSubmissionsReceived.assessorId", "name email");

  return {
    projectAssessment,
    studentAssessment
  };
};


