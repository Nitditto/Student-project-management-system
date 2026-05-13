import { AssessmentTemplate } from "../models/assessmentTemplate.js";

export const createTemplate = async (payload) => {
  return await AssessmentTemplate.create(payload);
};

export const getTemplateById = async (id) => {
  return await AssessmentTemplate.findById(id);
};

export const getActiveTemplate = async (track) => {
  return await AssessmentTemplate.findOne({ track, isActive: true }).sort({ createdAt: -1 });
};
