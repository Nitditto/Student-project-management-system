import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["positive", "negative", "general"],
      default: "general",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      required: true,
      maxLength: [
        1000,
        "Feedback message cannot be more than 1000 characters",
      ],
    },
  },
  { timestamps: true },
);

const selectedScheduleSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherSchedule",
      default: null,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    startAt: {
      type: Date,
      default: null,
    },
    endAt: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      default: null,
    },
    mode: {
      type: String,
      enum: ["online", "offline", "hybrid", null],
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
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxLength: [200, "Title cannot be more than 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      trim: true,
      maxLength: [2000, "Description cannot be more than 2000 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "done"],
      default: "pending",
    },
    groupName: {
      type: String,
      trim: true,
      default: null,
    },
    projectMode: {
      type: String,
      enum: ["individual", "group"],
      default: "individual",
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    files: [
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
    feedback: [feedbackSchema],
    deadline: {
      type: Date,
    },
    selectedSchedule: {
      type: selectedScheduleSchema,
      default: () => ({}),
    },
    defenseStatus: {
      type: String,
      enum: ["not_started", "scheduled", "in_progress", "done"],
      default: "not_started",
    },
    defenseFinalScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    councilId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DefenseCouncil",
      default: null,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    archiveLocked: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexing for battery query performance

projectSchema.index({ student: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ supervisor: 1 });
projectSchema.index({ status: 1 });

projectSchema.pre("save", function ensureOwnerInMembers() {
  const studentId = this.student?.toString();
  const members = (this.members || []).map((member) => member.toString());

  if (studentId && !members.includes(studentId)) {
    this.members = [this.student, ...(this.members || [])];
  }
});

export const Project =
  mongoose.models.Project || mongoose.model("Project", projectSchema);
