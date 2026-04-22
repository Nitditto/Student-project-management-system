import mongoose from "mongoose";
import { RegistrationPeriod } from "../models/registrationPeriod.js";
import ErrorHandler from "../middleware/error.js";

/**
 * Create new registration period
 */
export const createRegistrationPeriod = async (payload) => {
  const {
    name,
    semester,
    academicYear,
    minGroupSize,
    maxGroupSize,
    maxStudentsPerTeacher,
  } = payload;

  // Validate logic
  if (minGroupSize > maxGroupSize) {
    throw new ErrorHandler(
      "Min group size cannot be greater than max group size",
      400
    );
  }

  if (maxStudentsPerTeacher < 1) {
    throw new ErrorHandler("Max students per teacher must be >= 1", 400);
  }

  return await RegistrationPeriod.create(payload);
};

/**
 * Open registration period (ONLY ONE ACTIVE)
 */
export const openRegistrationPeriod = async (id) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const period = await RegistrationPeriod.findById(id).session(session);

    if (!period) {
      throw new ErrorHandler("Registration period not found", 404);
    }

    // Close all other open periods
    await RegistrationPeriod.updateMany(
      { _id: { $ne: id }, status: "open" },
      { $set: { status: "closed" } },
      { session }
    );

    period.status = "open";
    await period.save({ session });

    await session.commitTransaction();
    session.endSession();

    return period;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Close registration period
 */
export const closeRegistrationPeriod = async (id) => {
  const period = await RegistrationPeriod.findById(id);

  if (!period) {
    throw new ErrorHandler("Registration period not found", 404);
  }

  if (period.status !== "open") {
    throw new ErrorHandler("Only open period can be closed", 400);
  }

  period.status = "closed";
  await period.save();

  return period;
};

/**
 * Get all periods
 */
export const getAllRegistrationPeriods = async () => {
  return await RegistrationPeriod.find().sort({ createdAt: -1 });
};

/**
 * Get current open period
 */
export const getCurrentOpenRegistrationPeriod = async () => {
  return await RegistrationPeriod.findOne({ status: "open" }).sort({
    createdAt: -1,
  });
};