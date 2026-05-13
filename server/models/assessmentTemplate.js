import mongoose from "mongoose";

const milestoneWeightSchema = new mongoose.Schema({
  milestoneCode: { type: String, required: true }, // e.g., 'M1'
  percentage: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

const cloMatrixSchema = new mongoose.Schema({
  cloCode: { type: String, required: true }, // e.g., 'CLO1'
  description: { type: String },
  weights: [milestoneWeightSchema] // M1: 10%, M2: 20%, etc.
}, { _id: false });

const milestoneDefSchema = new mongoose.Schema({
  code: { type: String, required: true }, // M1..M6
  name: { type: String, required: true },
  weight: { type: Number, required: true, min: 0, max: 100 },
  description: { type: String }
}, { _id: false });

const assessmentTemplateSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true }, // e.g. "1.0.0"
  track: { type: String, enum: ["capstone", "research"], required: true },
  milestones: [milestoneDefSchema],
  cloMatrix: [cloMatrixSchema],
  passingRules: {
    minFinalScore: { type: Number, default: 5.0 },
    minCloScore: { type: Number, default: 3.0 }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const AssessmentTemplate = mongoose.models.AssessmentTemplate || mongoose.model("AssessmentTemplate", assessmentTemplateSchema);
