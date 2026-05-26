import ErrorHandler from "../middleware/error.js";
import { AssessmentTemplate } from "../models/assessmentTemplate.js";
import { buildDefaultAssessmentTemplate } from "../utils/assessmentTemplateDefaults.js";

export const ensureDefaultAssessmentTemplates = async () => {
  const tracks = ["capstone", "research"];

  for (const projectTrack of tracks) {
    const payload = buildDefaultAssessmentTemplate(projectTrack);
    const existing = await AssessmentTemplate.findOne({
      code: payload.code,
    });

    if (!existing) {
      await AssessmentTemplate.create(payload);
    }
  }
};

export const listAssessmentTemplates = async () => {
  await ensureDefaultAssessmentTemplates();
  return AssessmentTemplate.find().sort({ projectTrack: 1, createdAt: -1 });
};

export const getAssessmentTemplateById = async (templateId) => {
  await ensureDefaultAssessmentTemplates();
  const template = await AssessmentTemplate.findById(templateId);
  if (!template) {
    throw new ErrorHandler("Assessment template not found", 404);
  }
  return template;
};

export const getDefaultAssessmentTemplate = async (projectTrack = "capstone") => {
  await ensureDefaultAssessmentTemplates();
  const code = `default-${projectTrack}-2025-v1`;
  const template = await AssessmentTemplate.findOne({ code });
  if (!template) {
    throw new ErrorHandler("Default assessment template not found", 404);
  }
  return template;
};

export const createAssessmentTemplate = async (payload) => {
  if (!payload?.code || !payload?.name || !payload?.version || !payload?.projectTrack) {
    throw new ErrorHandler("code, name, version, and projectTrack are required", 400);
  }

  return AssessmentTemplate.create({
    code: payload.code,
    name: payload.name,
    version: payload.version,
    projectTrack: payload.projectTrack,
    status: payload.status || "active",
    milestoneDefinitions: payload.milestoneDefinitions || [],
    cloDefinitions: payload.cloDefinitions || [],
    matrix: payload.matrix || {},
    passRules: payload.passRules || {},
  });
};
