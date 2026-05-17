import mongoose from "mongoose";

const deadlineSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Deadline title is required"],
      trim: true,
      maxLength: [200, "Deadline title cannot be more than 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Deadline description is required"],
      trim: true,
      maxLength: [2000, "Description cannot be more than 2000 characters"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Teacher ID is required"],
    },
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegistrationSetting",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

deadlineSchema.index({ endDate: 1 });
deadlineSchema.index({ teacherId: 1 });
deadlineSchema.index({ semesterId: 1 });

export const Deadline =
  mongoose.models.Deadline || mongoose.model("Deadline", deadlineSchema);
