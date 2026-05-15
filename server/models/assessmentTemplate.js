import mongoose from "mongoose";

const milestoneDefinitionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    allowedSources: {
      type: [String],
      default: [],
    },
    allowedRoles: {
      type: [String],
      default: [],
    },
    requiredEvidenceKinds: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const cloDefinitionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    qaEvidenceHints: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const assessmentTemplateSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 150,
    },
    version: {
      type: String,
      required: true,
      trim: true,
      maxLength: 50,
    },
    projectTrack: {
      type: String,
      enum: ["capstone", "research"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "active",
    },
    milestoneDefinitions: {
      type: [milestoneDefinitionSchema],
      default: [],
    },
    cloDefinitions: {
      type: [cloDefinitionSchema],
      default: [],
    },
    matrix: {
      type: Map,
      of: {
        type: Map,
        of: Number,
      },
      default: {},
    },
    passRules: {
      minimumFinalScore10: {
        type: Number,
        default: 5,
      },
      minimumCloScore5: {
        type: Number,
        default: 3,
      },
      noCondonement: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true },
);

assessmentTemplateSchema.index({ projectTrack: 1, version: 1 }, { unique: true });

export const AssessmentTemplate =
  mongoose.models.AssessmentTemplate ||
  mongoose.model("AssessmentTemplate", assessmentTemplateSchema);
