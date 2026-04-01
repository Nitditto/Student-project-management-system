import mongoose from "mongoose";

const deadlineSchema = new mongoose.Schema(
  {

    name: {
      type: String,
      required: [true, "Deadline name/title is required"],
      trim: true,
      maxLength: [100, "Deadline name cannot be more than 100 characters"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required"],
    },
    Project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexing for battery query performance

deadlineSchema.index({ dueDate: 1 });
deadlineSchema.index({ project: 1});
deadlineSchema.index({ createdBy: 1});

export const Deadline =
  mongoose.models.Deadline ||
  mongoose.model("Deadline", deadlineSchema);
