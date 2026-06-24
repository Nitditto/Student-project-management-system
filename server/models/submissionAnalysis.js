import mongoose from "mongoose";

const suspiciousChunkSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    matchedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    matchedProjectTitle: {
      type: String,
      default: "",
    },
    similarity: {
      type: Number,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const cloBreakdownSchema = new mongoose.Schema(
  {
    cloCode: {
      type: String,
      required: true,
    },
    estimatedScore: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    rationale: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const submissionAnalysisSchema = new mongoose.Schema(
  {
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: [true, "Submission ID is required"],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student/User ID is required"],
    },
    status: {
      type: String,
      enum: ["pending", "processing", "done", "error"],
      default: "pending",
    },
    errorMessage: {
      type: String,
      default: null,
    },
    plagiarismResult: {
      overallSimilarity: {
        type: Number,
        default: 0,
      },
      riskLevel: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
      },
      suspiciousChunks: [suspiciousChunkSchema],
      usedRag: {
        type: Boolean,
        default: false,
      },
    },
    scoreEstimate: {
      milestone: {
        type: String,
        required: true,
      },
      estimatedScore5: {
        type: Number,
        default: null,
      },
      estimatedScore10: {
        type: Number,
        default: null,
      },
      estimatedScore4: {
        type: Number,
        default: null,
      },
      letterGrade: {
        type: String,
        default: null,
      },
      cloBreakdown: [cloBreakdownSchema],
      confidence: {
        type: Number,
        default: 0,
      },
      usedRag: {
        type: Boolean,
        default: false,
      },
    },
    feedback: {
      strengths: {
        type: [String],
        default: [],
      },
      weaknesses: {
        type: [String],
        default: [],
      },
      suggestions: {
        type: [String],
        default: [],
      },
      overallComment: {
        type: String,
        default: "",
      },
    },
    studentFeedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      comment: {
        type: String,
        default: null,
      },
      ratedAt: {
        type: Date,
        default: null,
      },
    },
    processingTimeMs: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

submissionAnalysisSchema.index(
  { submission: 1, "scoreEstimate.milestone": 1 },
  { unique: true }
);
submissionAnalysisSchema.index({ project: 1 });
submissionAnalysisSchema.index({ student: 1 });

export const SubmissionAnalysis =
  mongoose.models.SubmissionAnalysis ||
  mongoose.model("SubmissionAnalysis", submissionAnalysisSchema);
