import mongoose from "mongoose";

const scheduleSlotSchema = new mongoose.Schema(
  {
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      default: "offline",
    },
    status: {
      type: String,
      enum: ["available", "booked", "completed", "cancelled"],
      default: "available",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    pickedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    pickedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const teacherScheduleSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 150,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    pickDeadline: {
      type: Date,
      required: true,
    },
    rescheduleWindowHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168,
    },
    autoAssignEnabled: {
      type: Boolean,
      default: true,
    },
    deadlineProcessedAt: {
      type: Date,
      default: null,
    },
    slots: [scheduleSlotSchema],
  },
  { timestamps: true },
);

teacherScheduleSchema.index({ teacher: 1, pickDeadline: 1 });
teacherScheduleSchema.index({ "slots.status": 1 });

export const TeacherSchedule =
  mongoose.models.TeacherSchedule ||
  mongoose.model("TeacherSchedule", teacherScheduleSchema);
