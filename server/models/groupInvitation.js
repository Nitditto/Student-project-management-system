import mongoose from "mongoose";

const groupInvitationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

groupInvitationSchema.index({ project: 1, invitee: 1 }, { unique: true });

export const GroupInvitation =
  mongoose.models.GroupInvitation ||
  mongoose.model("GroupInvitation", groupInvitationSchema);
