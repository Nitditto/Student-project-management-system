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
    },
    message: {
      type: String,
      trim: true,
      required: true,
      maxLength: [
        1000,
        "Feedback message cannot be more than 1000 characters",
      ],
    },
  },
  { timestamps: true },
);

const projectSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
    },
    supervisor: {
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
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    files: [
      {
        fileType: {
          type: String,
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
        originalName: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    feedback: [feedbackSchema],
    deadline: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexing for battery query performance

projectSchema.index({ student: 1 });
projectSchema.index({ supervisor: 1 });
projectSchema.index({ status: 1 });

export const Project =
  mongoose.models.Project || mongoose.model("Project", projectSchema);
