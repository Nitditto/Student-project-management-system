import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    reason: {
      type: String,
      trim: true,
      default: "",
      maxLength: 1000,
    },
    note: {
      type: String,
      trim: true,
      default: "",
      maxLength: 1000,
    },
    requestedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    evidenceFiles: [
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
  },
  { _id: false },
);

const attendanceRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "present", "absent", "excused"],
      default: "pending",
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkInMethod: {
      type: String,
      enum: ["code", "qr", "manual", null],
      default: null,
    },
    manualOverride: {
      type: Boolean,
      default: false,
    },
    leaveRequest: {
      type: leaveRequestSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

const attendanceSessionSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 150,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    checkInOpensAt: {
      type: Date,
      required: true,
    },
    checkInClosesAt: {
      type: Date,
      required: true,
    },
    accessCode: {
      type: String,
      required: true,
      match: [/^\d{6}$/, "Access code must be 6 digits"],
    },
    qrToken: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "closed"],
      default: "draft",
    },
    records: [attendanceRecordSchema],
  },
  { timestamps: true },
);

attendanceSessionSchema.index({ teacher: 1, startsAt: -1 });
attendanceSessionSchema.index({ project: 1, startsAt: -1 });
attendanceSessionSchema.index({ "records.student": 1 });

export const AttendanceSession =
  mongoose.models.AttendanceSession ||
  mongoose.model("AttendanceSession", attendanceSessionSchema);
