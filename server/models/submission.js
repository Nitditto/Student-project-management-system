import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    deadlineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deadline",
      required: [true, "Deadline ID is required"],
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Group/Project ID is required"],
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Submitted by User ID is required"],
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUBMITTED", "MISSED", "LATE"],
      default: "PENDING",
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

submissionSchema.index({ deadlineId: 1 });
submissionSchema.index({ groupId: 1 });
submissionSchema.index({ deadlineId: 1, groupId: 1 }, { unique: true });

export const Submission =
  mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
