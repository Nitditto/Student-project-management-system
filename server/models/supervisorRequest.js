import mongoose from "mongoose";

const supervisorRequestSchema = new mongoose.Schema(
  {
  student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Supervisor ID is required"],
    },
    message: {
      type: String,
      trim: true,
      default: "",
      maxLength: 1000,
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "rejected"],
    },
  },
  {
    timestamps: true,
  },
);

// Indexing for battery query performance

supervisorRequestSchema.index({ student: 1 });
supervisorRequestSchema.index({ supervisor: 1});
supervisorRequestSchema.index({ status: 1});

export const SupervisorRequest =
  mongoose.models.SupervisorRequest ||
  mongoose.model("SupervisorRequest", supervisorRequestSchema);
