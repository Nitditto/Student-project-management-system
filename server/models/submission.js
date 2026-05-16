import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
  deadlineId: { type: mongoose.Schema.Types.ObjectId, ref: "Deadline", required: true, index: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  status: { type: String, enum: ["PENDING", "SUBMITTED", "MISSED"], default: "PENDING", index: true },
  submittedAt: { type: Date, default: null },
}, { timestamps: true });

submissionSchema.index({ deadlineId: 1, groupId: 1 }, { unique: true });

export const Submission = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
