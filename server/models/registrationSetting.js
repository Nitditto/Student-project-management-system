import mongoose from "mongoose";

const registrationSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      default: "default",
    },
    allowGroupProjects: {
      type: Boolean,
      default: true,
    },
    minGroupSize: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    maxGroupSize: {
      type: Number,
      default: 3,
      min: 1,
      max: 10,
    },
    representativeMode: {
      type: String,
      enum: ["leader_only"],
      default: "leader_only",
    },
    preselectPhaseEnabled: {
      type: Boolean,
      default: true,
    },
    freePickOpen: {
      type: Boolean,
      default: false,
    },
    proposalSubmissionOpen: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxLength: 1000,
    },
  },
  { timestamps: true },
);

export const RegistrationSetting =
  mongoose.models.RegistrationSetting ||
  mongoose.model("RegistrationSetting", registrationSettingSchema);
