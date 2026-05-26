import mongoose from "mongoose";

const evidenceRefSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      default: "",
      trim: true,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    originalName: {
      type: String,
      default: "",
      trim: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const cloEntrySchema = new mongoose.Schema(
  {
    cloCode: {
      type: String,
      required: true,
      trim: true,
    },
    score1to5: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
      maxLength: 2000,
    },
    evidenceRefs: {
      type: [evidenceRefSchema],
      default: [],
    },
  },
  { _id: false },
);

const assessorSubmissionSchema = new mongoose.Schema(
  {
    assessor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ["supervisor", "reviewer", "chairman", "secretary", "member", "peer", "student"],
      required: true,
    },
    submissionType: {
      type: String,
      enum: ["teacher", "student"],
      default: "teacher",
    },
    weight: {
      type: Number,
      default: 1,
      min: 0,
      max: 10,
    },
    approvalStatus: {
      type: String,
      enum: ["submitted", "approved", "rejected"],
      default: "submitted",
    },
    cloEntries: {
      type: [cloEntrySchema],
      default: [],
    },
    overallComment: {
      type: String,
      default: "",
      trim: true,
      maxLength: 2000,
    },
    evidenceRefs: {
      type: [evidenceRefSchema],
      default: [],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const cloAggregateSchema = new mongoose.Schema(
  {
    cloCode: {
      type: String,
      required: true,
      trim: true,
    },
    score5: {
      type: Number,
      default: null,
      min: 0,
      max: 5,
    },
    status: {
      type: String,
      enum: ["achieved", "not_achieved", "pending"],
      default: "pending",
    },
    contributionWeight: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { _id: false },
);

const milestoneAssessmentSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["pending", "in_progress", "ready", "locked"],
      default: "pending",
    },
    assessorSubmissions: {
      type: [assessorSubmissionSchema],
      default: [],
    },
    aggregatedCloScores: {
      type: [cloAggregateSchema],
      default: [],
    },
    componentScore5: {
      type: Number,
      default: null,
      min: 0,
      max: 5,
    },
    componentScore10: {
      type: Number,
      default: null,
      min: 0,
      max: 10,
    },
    evidenceRefs: {
      type: [evidenceRefSchema],
      default: [],
    },
    lastRecomputedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const studentAssessmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    peerSubmission: {
      type: assessorSubmissionSchema,
      default: null,
    },
    individualCloResults: {
      type: [cloAggregateSchema],
      default: [],
    },
    individualM6Score5: {
      type: Number,
      default: null,
      min: 0,
      max: 5,
    },
    individualM6Score10: {
      type: Number,
      default: null,
      min: 0,
      max: 10,
    },
    officialFinalScore: {
      type: Number,
      default: null,
      min: 0,
      max: 10,
    },
    officialPassStatus: {
      type: String,
      enum: ["pass", "fail", "pending"],
      default: "pending",
    },
  },
  { _id: false },
);

const qaEvidenceSummarySchema = new mongoose.Schema(
  {
    completenessPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    missingItems: {
      type: [String],
      default: [],
    },
    availableEvidenceKinds: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const projectAssessmentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
    },
    council: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DefenseCouncil",
      default: null,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssessmentTemplate",
      required: true,
    },
    templateVersion: {
      type: String,
      required: true,
      trim: true,
    },
    projectTrack: {
      type: String,
      enum: ["capstone", "research"],
      required: true,
    },
    milestones: {
      type: [milestoneAssessmentSchema],
      default: [],
    },
    cloResults: {
      type: [cloAggregateSchema],
      default: [],
    },
    teamFinalScore: {
      type: Number,
      default: null,
      min: 0,
      max: 10,
    },
    teamPassStatus: {
      type: String,
      enum: ["pass", "fail", "pending"],
      default: "pending",
    },
    qaEvidenceSummary: {
      type: qaEvidenceSummarySchema,
      default: () => ({}),
    },
    chairComment: {
      type: String,
      default: "",
      trim: true,
      maxLength: 2000,
    },
    status: {
      type: String,
      enum: ["draft", "in_progress", "ready", "finalized"],
      default: "draft",
    },
    studentAssessments: {
      type: [studentAssessmentSchema],
      default: [],
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

projectAssessmentSchema.index({ council: 1 });
projectAssessmentSchema.index({ projectTrack: 1, status: 1 });

export const ProjectAssessment =
  mongoose.models.ProjectAssessment ||
  mongoose.model("ProjectAssessment", projectAssessmentSchema);
