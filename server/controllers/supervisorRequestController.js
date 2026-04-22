import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { SupervisorRequest } from "../models/supervisorRequest.js";
import { Project } from "../models/project.js";
import * as supervisorRequestServices from "../services/supervisorRequestService.js";
import * as notificationServices from "../services/notificationServices.js";

export const createSupervisorRequest = asyncHandler(async (req, res, next) => {
  const { registrationPeriodId, groupId, teacherId, note } = req.body;

  if (!registrationPeriodId || !groupId || !teacherId) {
    return next(
      new ErrorHandler(
        "Please provide registrationPeriodId, groupId and teacherId",
        400
      )
    );
  }

  const request = await supervisorRequestServices.createSupervisorRequest({
    registrationPeriodId,
    groupId,
    teacherId,
    requestedBy: req.user._id,
    note,
  });

  // optional notification
  if (request?.teacher?._id) {
    await notificationServices.createNotification?.({
      userId: request.teacher._id,
      title: "New supervisor request",
      message: `You have received a new supervisor request from group ${request.group?.name || ""}`,
      type: "supervisor_request",
      refModel: "SupervisorRequest",
      refId: request._id,
    });
  }

  res.status(201).json({
    success: true,
    message: "Supervisor request created successfully",
    data: {
      request,
    },
  });
});

export const approveSupervisorRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const { projectPayload } = req.body;

  if (!requestId) {
    return next(new ErrorHandler("Request id is required", 400));
  }

  const result = await supervisorRequestServices.approveSupervisorRequest({
    requestId,
    teacherId: req.user._id,
    projectPayload: projectPayload || {},
  });

  // optional notification to group leader / members can be added here
  res.status(200).json({
    success: true,
    message: "Supervisor request approved successfully",
    data: {
      request: result.request,
      project: result.project,
    },
  });
});

export const rejectSupervisorRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const { reason } = req.body;

  if (!requestId) {
    return next(new ErrorHandler("Request id is required", 400));
  }

  const request = await supervisorRequestServices.rejectSupervisorRequest({
    requestId,
    teacherId: req.user._id,
    reason,
  });

  res.status(200).json({
    success: true,
    message: "Supervisor request rejected successfully",
    data: {
      request,
    },
  });
});

export const cancelSupervisorRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;

  if (!requestId) {
    return next(new ErrorHandler("Request id is required", 400));
  }

  const request = await supervisorRequestServices.cancelSupervisorRequest({
    requestId,
    requesterId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: "Supervisor request cancelled successfully",
    data: {
      request,
    },
  });
});

export const getTeacherRequests = asyncHandler(async (req, res, next) => {
  const { status } = req.query;

  const requests = await supervisorRequestServices.getTeacherRequests({
    teacherId: req.user._id,
    status,
  });

  res.status(200).json({
    success: true,
    message: "Teacher requests fetched successfully",
    data: {
      requests,
    },
  });
});

export const getRequestsByGroup = asyncHandler(async (req, res, next) => {
  const { groupId } = req.params;

  if (!groupId) {
    return next(new ErrorHandler("Group id is required", 400));
  }

  const requests = await supervisorRequestServices.getRequestsByGroup({
    groupId,
    requesterId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: "Group requests fetched successfully",
    data: {
      requests,
    },
  });
});