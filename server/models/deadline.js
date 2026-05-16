import mongoose from "mongoose";

const deadlineSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    title: { type: String, required: true, trim: true, maxLength: 200 },
    description: { type: String, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },
    // backward compatibility
    name: { type: String, default: null },
    dueDate: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    maxGroups: { type: Number, default: null },
  },
  { timestamps: true },
);

export const Deadline = mongoose.models.Deadline || mongoose.model("Deadline", deadlineSchema);
