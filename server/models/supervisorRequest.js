import mongoose from "mongoose";

const supervisorRequestSchema = new mongoose.Schema(
  {
    registrationPeriod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegistrationPeriod",
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectGroup",
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
      maxLength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: Date,

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

supervisorRequestSchema.index(
  { registrationPeriod: 1, group: 1, status: 1 },
  { name: "idx_group_active_requests" }
);

export const SupervisorRequest =
  mongoose.models.SupervisorRequest ||
  mongoose.model("SupervisorRequest", supervisorRequestSchema);
