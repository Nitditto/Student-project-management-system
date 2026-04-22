import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import RegistrationPeriod from "../models/registrationPeriod.js";
import * as registrationServices from "../services/registrationService.js";

export const createRegistrationPeriod = asyncHandler(async (req, res, next) => {
  const {
    name,
    semester,
    academicYear,
    allowGroup,
    minGroupSize,
    maxGroupSize,
    maxStudentsPerTeacher,
    startDate,
    endDate,
  } = req.body;

  if (!name || !semester || !academicYear) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  const registrationPeriod = await registrationServices.createRegistrationPeriod({
    name,
    semester,
    academicYear,
    allowGroup,
    minGroupSize,
    maxGroupSize,
    maxStudentsPerTeacher,
    startDate,
    endDate,
  });

  res.status(201).json({
    success: true,
    message: "Registration period created successfully",
    data: {
      registrationPeriod,
    },
  });
});

export const openRegistrationPeriod = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new ErrorHandler("Registration period id is required", 400));
  }

  const registrationPeriod = await registrationServices.openRegistrationPeriod(id);

  if (!registrationPeriod) {
    return next(new ErrorHandler("Registration period not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Registration period opened successfully",
    data: {
      registrationPeriod,
    },
  });
});

export const closeRegistrationPeriod = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new ErrorHandler("Registration period id is required", 400));
  }

  const registrationPeriod = await registrationServices.closeRegistrationPeriod(id);

  if (!registrationPeriod) {
    return next(new ErrorHandler("Registration period not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Registration period closed successfully",
    data: {
      registrationPeriod,
    },
  });
});

export const getAllRegistrationPeriods = asyncHandler(async (req, res, next) => {
  const registrationPeriods = await registrationServices.getAllRegistrationPeriods();

  res.status(200).json({
    success: true,
    message: "Registration periods fetched successfully",
    data: {
      registrationPeriods,
    },
  });
});

export const getCurrentOpenRegistrationPeriod = asyncHandler(async (req, res, next) => {
  const registrationPeriod = await registrationServices.getCurrentOpenRegistrationPeriod();

  res.status(200).json({
    success: true,
    message: "Current registration period fetched successfully",
    data: {
      registrationPeriod,
    },
  });
});