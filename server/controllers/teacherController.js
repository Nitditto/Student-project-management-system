import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { User } from "../models/user.js";
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
import { ensureProjectEditable } from "../services/workflowProjectServices.js";
import * as registrationServices from "../services/registrationServices.js";
import { getProjectMemberIds } from "../utils/workflowHelpers.js";
import { getOrCache, invalidateCache } from "../config/cache.js";

export const getTeacherDashboardStats = asyncHandler(async (req, res) => {
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

  res.status(200).json({
    success: true,
    message: "Dashboard stats fetched successfully",
    data: {
      dashboardStats: {
        totalPendingRequests,
        completedProjects,
        recentNotifications,
      },
    },
  });
});

export const getRequest = asyncHandler(async (req, res) => {
  const filters = {
    supervisor: req.user._id,
  };

  const { requests, total } = await requestServices.getAllRequest(filters);
  const updatedRequests = await Promise.all(
    requests.map(async (reqObj) => {
      const requestObj =
        typeof reqObj.toObject === "function" ? reqObj.toObject() : reqObj;

      // Fallback: Use project's student if student field is missing/undefined/null
      if (!requestObj.student && requestObj.project?.student) {
        requestObj.student = requestObj.project.student;
      }

      if (requestObj?.project?._id) {
        return { ...requestObj, latestProject: requestObj.project };
      }
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
}
);

export const acceptRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const teacherId = req.user._id;
  const request = await requestServices.acceptRequest(requestId, teacherId);
  if (!request) return next(new ErrorHandler("Request not found", 404));
  
  const student = request.student || request.project?.student;
  if (!student || !student._id) {
    return next(new ErrorHandler("No student associated with this request", 400));
  }
  const studentId = student._id;

  // Retrieve project safely (by ID or fallback to student search)
  const studentProject = request.project
    ? await Project.findById(request.project._id || request.project)
    : await Project.findOne({ student: studentId });

  const memberIds = studentProject
    ? getProjectMemberIds(studentProject)
    : [studentId];

  // 1. Cập nhật học sinh (tất cả thành viên trong nhóm)
  await Promise.all(
    memberIds.map((mId) =>
      User.findByIdAndUpdate(mId, {
        supervisor: teacherId,
      })
    )
  );

  // 2. Cập nhật giáo viên
  await User.findByIdAndUpdate(teacherId, {
    $addToSet: { assignedStudents: { $each: memberIds } },
  });

  // 3. Cập nhật Project của học sinh
  if (studentProject) {
    studentProject.supervisor = teacherId;
    if (studentProject.status === "pending" || studentProject.status === "created") {
      studentProject.status = "approved";
    }
    await studentProject.save();
  }

  // 4. Cancel other pending requests for the same project / student members / group robustly
  const cleanOrConditions = [];
  if (studentProject?._id) {
    cleanOrConditions.push({ project: studentProject._id });
  }
  if (memberIds && memberIds.length > 0) {
    cleanOrConditions.push({ student: { $in: memberIds } });
  }
  if (studentProject?.group) {
    cleanOrConditions.push({ group: studentProject.group });
  }

  if (cleanOrConditions.length > 0) {
    await SupervisorRequest.updateMany(
      {
        _id: { $ne: request._id },
        status: "pending",
        $or: cleanOrConditions
      },
      {
        $set: { status: "cancelled" }
      }
    );
  }

  await notificationServices.notifyUser(
    studentId,
    `Your supervisor request has been accepted by ${req.user.name}`,
    "approval",
    "/student/status",
    "low",
  );

  const message = generateRequestAcceptedTemplate(req.user.name);
  await sendEmail({
    to: student.email,
    subject: "Your Supervisor Request has been Accepted",
    message,
  });
  await invalidateCache(`teacher:assigned_students:${teacherId}`);

  // Fallback: Populate request student details in serialized output to prevent frontend from clearing student info
  const requestObj = request.toObject ? request.toObject() : request;
  if (!requestObj.student) {
    requestObj.student = student;
  }

  res.status(200).json({
    success: true,
    message: "Request accepted successfully",
    data: { request: requestObj },
  });
});

export const rejectRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const teacherId = req.user._id;
  const request = await requestServices.rejectRequest(requestId, teacherId);

  if (!request) {
    throw new ErrorHandler("Request not found", 404);
  }

  const student = request.student || request.project?.student;
  if (!student || !student._id) {
    throw new ErrorHandler("No student associated with this request", 400);
  }
  const studentId = student._id;

  const studentProject = request.project
    ? await Project.findById(request.project)
    : await Project.findOne({ student: studentId });
  const memberIds = studentProject
    ? getProjectMemberIds(studentProject)
    : [studentId];

  await Promise.all(
    memberIds.map((memberId) =>
      notificationServices.notifyUser(
        memberId,
        `Your supervisor request has been rejected by ${req.user.name}`,
        "rejection",
        "/student/supervisor",
        "high",
      ),
    ),
  );

  const message = generateRequestRejectedTemplate(req.user.name);
  await sendEmail({
    to: student.email,
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

export const getAssignedStudents = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  const cacheKey = `teacher:assigned_students:${teacherId}`;
  const data = await getOrCache(cacheKey, async () => {
    const students = await User.find({ supervisor: teacherId })
    .sort({ createdAt: -1 })
    .populate({
      path: "project",
      populate: [
        { path: "supervisor", select: "name email" },
        { path: "members", select: "name email" },
      ],
    });
  const total = await User.countDocuments({ supervisor: teacherId });

  return { students, total };
  }, 5 * 60)

  res.status(200).json({
    success: true,
    data,
  });
});

export const markComplete = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const teacherId = req.user._id;
  const project = await projectServices.getProjectById(projectId);

  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }
  if (project.supervisor._id.toString() !== teacherId.toString()) {
    throw new ErrorHandler("Not authorized to mark complete", 403);
  }
  ensureProjectEditable(project);

  const updatedProject = await projectServices.markComplete(projectId);

  await notificationServices.notifyUser(
    project.student._id,
    `Your project "${project.title}" has been marked as complete by ${req.user.name}`,
    "general",
    "/student/status",
    "low",
  );

  res.status(200).json({
    success: true,
    data: {
      project: updatedProject,
    },
    message: "Project marked as complete",
  });
});

export const addFeedback = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const teacherId = req.user._id;
  const { message, title, type } = req.body;

  if (!message || !title) {
    throw new ErrorHandler("Feedback title and message are required", 400);
  }

  const project = await projectServices.getProjectById(projectId);
  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }
  if (project.supervisor._id.toString() !== teacherId.toString()) {
    throw new ErrorHandler("Not authorized to mark complete", 403);
  }
  ensureProjectEditable(project);

  const { project: updatedProject, latestFeedback } =
    await projectServices.addFeedback(
      projectId,
      teacherId,
      message,
      title,
      type,
    );

  await notificationServices.notifyUser(
    project.student._id,
    `New feedback from your supervisor for supervisor request "${req.user.name}"`,
    "feedback",
    "/student/feedback",
    type === "positive" ? "low" : type === "negative" ? "high" : "low",
  );

  res.status(200).json({
    success: true,
    data: {
      project: updatedProject,
      feedback: latestFeedback,
    },
    message: "Feedback posted successfully",
  });
});

// FIles controller
export const getFiles = asyncHandler(async (req, res, next) => {
  const teacherId = req.user._id;
  const projects = await projectServices.getProjectsBySupervisor(teacherId);
  const allFiles = projects.flatMap((project) =>
    project.files.map((file) => ({
      ...file.toObject(),
      projectId: project._id,
      projectTitle: project.title,
      groupName: project.groupName,
      studentName: project.student.name,
      studentEmail: project.student.email,
    })),
  );

  res.status(200).json({
    success: true,
    message: "Files fetched successfully",
    data: {
      files: allFiles,
    },
  });
});

export const downloadFile = asyncHandler(async (req, res, next) => {
  const { projectId, fileId } = req.params;
  const supervisorId = req.user._id;
  const project = await projectServices.getProjectById(projectId);

  if (project.supervisor._id.toString() !== supervisorId.toString()) {
    throw new ErrorHandler("Not authorized to download file", 403);
  }

  const file = project.files.id(fileId);
  if (!file) {
    throw new ErrorHandler("File not found", 404);
  }

  fileServices.streamDownload(file.fileUrl, res, file.originalName);
});

export const getDefenseSchedules = asyncHandler(async (req, res, next) => {
  const teacherId = req.user._id;

  const councils = await Council.find({
    "members.teacherId": teacherId,
  }).populate("projects.projectId", "title description status finalScore");

  res.status(200).json({
    success: true,
    count: councils.length,
    councils,
  });
});
