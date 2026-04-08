import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { User } from "../models/user.js";
import * as userServices from "../services/userServices.js";
import * as projectServices from "../services/projectServices.js";
import * as requestServices from "../services/requestServices.js";
import * as notificationServices from "../services/notificationServices.js";
import { Project } from "../models/project.js";
import { Notification } from "../models/notification.js";
import * as fileServices from "../services/fileServices.js";
import { SupervisorRequest } from "../models/supervisorRequest.js";
import { sendEmail } from "../services/emailService.js";
import {
  generateRequestAcceptedTemplate,
  generateRequestRejectedTemplate,
} from "../utils/emailTemplates.js";

export const getTeacherDashboardStats = asyncHandler(async (req, res, next) => {
  const teacherId = req.user._id;
  const totalPendingRequests = await SupervisorRequest.countDocuments({
    supervisor: teacherId,
    status: "pending",
  });
  const completedProjects = await Project.countDocuments({
    supervisor: teacherId,
    status: "completed",
  });
  const recentNotifications = await Notification.find({
    user: teacherId,
  })
    .sort({ createdAt: -1 })
    .limit(5);

  const dashboardStats = {
    totalPendingRequests,
    completedProjects,
    recentNotifications,
  };

  res.status(200).json({
    success: true,
    message: "Dashboard stats fetched successfully",
    data: {
      dashboardStats,
    },
  });
});

export const getRequest = asyncHandler(async (req, res, next) => {
  const { supervisor } = req.query;

  const filters = {};
  if (supervisor) filters.supervisor = supervisor;

  const { requests, total } = await requestServices.getAllRequest(filters);

  const updatedRequests = await Promise.all(
    requests.map(async (reqObj) => {
      const requestObj = typeof reqObj.toObject === 'function' ? reqObj.toObject() : reqObj;
      if (requestObj?.student?._id) {
        const latestProject = await Project.findOne({
          student: requestObj.student._id,
        })
          .sort({ createdAt: -1 })
          .lean();

        return { ...requestObj, latestProject };
      }
      return requestObj;
    }),
  );
  res.status(200).json({
    success: true,
    message: "Requests fetched successfully",
    data: {
      requests: updatedRequests,
      total,
    },
  });
});

export const acceptRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const teacherId = req.user._id;

  const request = await requestServices.acceptRequest(requestId, teacherId);
  if (!request) return next(new ErrorHandler("Request not found", 404));
  await notificationServices.notifyUser(
    request.student._id,
    `Your supervisor request has been accepted by ${req.user.name}`,
    "approval",
    "/student/status",
    "low",
  );

  const student = await User.findById(request.student._id);
  const studentEmail = student.email;
  const message = generateRequestAcceptedTemplate(req.user.name);
  await sendEmail({
    to: studentEmail,
    subject: "Your Supervisor Request has been Accepted",
    message,
  });

  res.status(200).json({
    success: true,
    message: "Request accepted successfully",
    data: {
      request,
    },
  });
});

export const rejectRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const teacherId = req.user._id;

  const request = await requestServices.rejectRequest(requestId, teacherId);
  if (!request) return next(new ErrorHandler("Request not found", 404));
  await notificationServices.notifyUser(
    request.student._id,
    `Your supervisor request has been rejected by ${req.user.name}`,
    "rejection",
    "/student/status",
    "high",
  );

  const student = await User.findById(request.student._id);
  const studentEmail = student.email;
  const message = generateRequestRejectedTemplate(req.user.name);
  await sendEmail({
    to: studentEmail,
    subject: "Your Supervisor Request has been Rejected",
    message,
  });

  res.status(200).json({
    success: true,
    message: "Request rejected",
    data: {
      request,
    },
  });
});
