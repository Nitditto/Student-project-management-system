import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    message: {
      type: String,
      trim: true,
      required: [true, "Message is required"],
      maxLength: [1000, "Message cannot be more than 1000 characters"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      default: null,
    },

    type: {
      type: String,
      enum: [
        "request",
        "approval",
        "rejection",
        "feedback",
        "deadline",
        "general",
        "meeting",
        "system",
      ],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
  },
  {
    timestamps: true,
  },
);

// Indexing for battery query performance

notificationSchema.index({ user: 1, isRead: 1 });

export const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
