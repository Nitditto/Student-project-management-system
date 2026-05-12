import mongoose from "mongoose";

const councilMemberSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["chairman", "secretary", "member"],
      required: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
  },
  { _id: false },
);

const scoreEntrySchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["chairman", "secretary", "member", "reviewer"],
      required: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    comment: {
      type: String,
      trim: true,
      default: "",
      maxLength: 2000,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const reviewerFormSchema = new mongoose.Schema(
  {
    summary: {
      type: String,
      trim: true,
      default: "",
      maxLength: 2000,
    },
    strengths: {
      type: String,
      trim: true,
      default: "",
      maxLength: 2000,
    },
    concerns: {
      type: String,
      trim: true,
      default: "",
      maxLength: 2000,
    },
    recommendation: {
      type: String,
      trim: true,
      default: "",
      maxLength: 2000,
    },
    pdfUrl: {
      type: String,
      default: null,
    },
    exportedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const councilProjectSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewerWeight: {
      type: Number,
      default: 1.5,
      min: 0,
      max: 10,
    },
    reviewerForm: {
      type: reviewerFormSchema,
      default: () => ({}),
    },
    scores: [scoreEntrySchema],
    weightedAverage: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    chairComment: {
      type: String,
      trim: true,
      default: "",
      maxLength: 2000,
    },
    status: {
      type: String,
      enum: ["assigned", "scoring", "done"],
      default: "assigned",
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const defenseCouncilSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 150,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxLength: 1000,
    },
    defenseDate: {
      type: Date,
      default: null,
    },
    room: {
      type: String,
      trim: true,
      default: "",
    },
    members: {
      type: [councilMemberSchema],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "Council must have at least one member",
      },
    },
    projects: [councilProjectSchema],
    status: {
      type: String,
      enum: ["draft", "active", "done"],
      default: "draft",
    },
  },
  { timestamps: true },
);

defenseCouncilSchema.index({ "members.teacher": 1 });
defenseCouncilSchema.index({ "projects.project": 1 });

export const DefenseCouncil =
  mongoose.models.DefenseCouncil ||
  mongoose.model("DefenseCouncil", defenseCouncilSchema);
