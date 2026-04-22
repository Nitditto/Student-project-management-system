import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxLength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
      minLength: [8, "Password must be at least 8 characters long"],
    },

    role: {
      type: String,
      default: "Student",
      enum: ["Student", "Teacher", "Admin"],
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,

    department: {
      type: String,
      trim: true,
      default: null,
    },

    experties: {
      type: [String],
      default: [],
    },

    maxStudent: {
      type: Number,
      default: 10,
      min: [1, "Max students must be at least 1"],
    },

    /**
     * Compatibility fields for old flow.
     * Keep them for now if existing code is using them.
     * New registration/project flow should not depend on these fields.
     */
    assignedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * Legacy capacity check.
 * For the new group-based flow, quota should be checked by service layer
 * using Project + ProjectGroup instead of this method alone.
 */
userSchema.methods.hasCapacity = function () {
  if (this.role !== "Teacher") return false;
  return this.assignedStudents.length < this.maxStudent;
};

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);