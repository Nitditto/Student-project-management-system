import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { User } from "../models/user.js";
import { generateToken } from "../utils/generateToken.js";
import crypto from "crypto";
import { sendEmail } from "../services/emailService.js";
import { generateForgotPasswordEmailTemplate } from "../utils/emailTemplates.js";
// REGISTER USER
export const registerUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }
  let user = await User.findOne({ email });
  if (user) {
    return next(
      new ErrorHandler(`User with email ${user.email} already exists`, 400),
    );
  }
  user = await User.create({ name, email, password, role });

  generateToken(user, 201, "User registered successfully", res);
});

// LOGIN USER
export const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return next(new ErrorHandler("Please provide all the fields", 400));
  }
  const user = await User.findOne({ email, role }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid email, password or role", 401));
  }
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid email, password or role", 401));
  }
  generateToken(user, 200, "Logged in successfully", res);
});

export const getUser = asyncHandler(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});
export const logout = asyncHandler(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Logged out successfully",
    });
});
// Forgot Password
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ErrorHandler("User not found with this email", 404));
  }
  // Generate token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const message = generateForgotPasswordEmailTemplate(resetPasswordUrl);

  try {
    await sendEmail({
      to: user.email,
      subject: "Your password reset request",
      message,
    });
    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler(error.message || "Cannot send email", 500));
  }
});
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(
      new ErrorHandler("Invalid or expired password reset token", 400),
    );
  }
  if (!req.body.password || !req.body.confirmPassword) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }
  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new ErrorHandler("Password and confirm password do not match", 400),
    );
  }
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  generateToken(user, 200, "Password reset successful", res);
});

// UPDATE PROFILE (for logged-in user)
export const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, department, experties } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (department) updateFields.department = department;
  if (experties !== undefined) updateFields.experties = experties;

  const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
    new: true,
    runValidators: true,
  }).select("-password -resetPasswordToken -resetPasswordExpire");

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user,
  });
});

// CHANGE PASSWORD (for logged-in user)
export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(new ErrorHandler("Please provide all password fields", 400));
  }

  if (newPassword !== confirmPassword) {
    return next(new ErrorHandler("New password and confirm password do not match", 400));
  }

  if (newPassword.length < 8) {
    return next(new ErrorHandler("Password must be at least 8 characters", 400));
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const isMatched = await user.comparePassword(currentPassword);
  if (!isMatched) {
    return next(new ErrorHandler("Current password is incorrect", 400));
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});
