import mongoose from "mongoose";

const teacherPreselectionSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
      maxLength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

teacherPreselectionSchema.index(
  { teacher: 1, student: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

export const TeacherPreselection =
  mongoose.models.TeacherPreselection ||
  mongoose.model("TeacherPreselection", teacherPreselectionSchema);
