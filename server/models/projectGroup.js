import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const projectGroupSchema = new mongoose.Schema(
  {
    registrationPeriod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegistrationPeriod",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: [100, "Group name cannot exceed 100 characters"],
    },

    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: {
      type: [memberSchema],
      default: [],
      validate: {
        validator: function (members) {
          const ids = members.map((m) => String(m.student));
          return new Set(ids).size === ids.length;
        },
        message: "Duplicate members are not allowed in the same group",
      },
    },

    status: {
      type: String,
      enum: ["forming", "ready", "submitted", "approved", "rejected"],
      default: "forming",
    },
  },
  { timestamps: true }
);

/**
 * Ensure leader is included in members.
 */
projectGroupSchema.pre("validate", function (next) {
  const leaderId = String(this.leader);
  const hasLeaderInMembers = this.members.some(
    (m) => String(m.student) === leaderId
  );

  if (!hasLeaderInMembers) {
    this.members.unshift({
      student: this.leader,
      joinedAt: new Date(),
    });
  }

  next();
});

projectGroupSchema.index({ registrationPeriod: 1, leader: 1 });
projectGroupSchema.index({ registrationPeriod: 1, "members.student": 1 });

export const ProjectGroup =
  mongoose.models.ProjectGroup ||
  mongoose.model("ProjectGroup", projectGroupSchema);