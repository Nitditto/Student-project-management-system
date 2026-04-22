import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["positive", "negative", "general"],
      default: "general",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
      required: true,
      maxLength: [1000, "Feedback message cannot be more than 1000 characters"],
    },
  },
  { timestamps: true }
);

const projectFileSchema = new mongoose.Schema(
  {
    fileType: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    /**
     * New flow fields
     */
    registrationPeriod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegistrationPeriod",
      default: null,
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectGroup",
      default: null,
    },

    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdFromRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupervisorRequest",
      default: null,
    },

    type: {
      type: String,
      enum: ["capstone", "thesis"],
      default: "capstone",
    },

    /**
     * Legacy field for old flow compatibility.
     * Keep for now if current UI/services still use it.
     * In new group-based flow, prefer `group`.
     */
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxLength: [200, "Title cannot be more than 200 characters"],
    },

    description: {
      type: String,
      required: [true, "Project description is required"],
      trim: true,
      maxLength: [2000, "Description cannot be more than 2000 characters"],
    },

    /**
     * Suggested statuses for phase 1 and future phases
     */
    status: {
      type: String,
      enum: [
        "created",
        "in_progress",
        "waiting_defense",
        "defended",
        "completed",
        "rejected",
      ],
      default: "created",
    },

    files: {
      type: [projectFileSchema],
      default: [],
    },

    feedback: {
      type: [feedbackSchema],
      default: [],
    },

    deadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectSchema.index({ student: 1 });
projectSchema.index({ supervisor: 1 });
projectSchema.index({ group: 1 }, { unique: true, sparse: true });
projectSchema.index({ registrationPeriod: 1 });
projectSchema.index({ status: 1 });

export const Project =
  mongoose.models.Project || mongoose.model("Project", projectSchema);