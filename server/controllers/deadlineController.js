import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { Deadline } from "../models/deadline.js";
import { Submission } from "../models/submission.js";
import { Project } from "../models/project.js";
import { User } from "../models/user.js";
import * as notificationServices from "../services/notificationServices.js";
import { uploadToSupabase, buildStoragePath, deleteFileByUrl } from "../services/supabaseService.js";

const findStudentProject = (studentId) =>
  Project.findOne({
    $or: [{ student: studentId }, { members: studentId }],
    status: { $ne: "rejected" },
  }).sort({ createdAt: -1 });

const resolveStudentDeadlineContext = async (studentId) => {
  const [project, student] = await Promise.all([
    findStudentProject(studentId),
    User.findById(studentId).select("supervisor"),
  ]);

  return {
    project,
    supervisorId: project?.supervisor || student?.supervisor || null,
  };
};

// Create a new deadline (Teacher)
export const createDeadline = asyncHandler(async (req, res, next) => {
  const { title, description, endDate, startDate, teacherId, assignedGroups } = req.body;

  if (!title || !description || !endDate) {
    return next(new ErrorHandler("Title, description, and end date are required", 400));
  }

  const ownerTeacherId =
    req.user.role === "Admin" ? teacherId || null : req.user._id;

  if (!ownerTeacherId) {
    return next(new ErrorHandler("Teacher ID is required when admin creates a deadline", 400));
  }

  const deadlineOwner = await User.findById(ownerTeacherId).select("role");
  if (!deadlineOwner || deadlineOwner.role !== "Teacher") {
    return next(new ErrorHandler("Deadline owner must be a valid teacher", 400));
  }

  const deadlineData = {
    title,
    description,
    endDate: new Date(endDate),
    teacherId: ownerTeacherId,
    assignedGroups: Array.isArray(assignedGroups) ? assignedGroups : [],
  };

  if (startDate) {
    deadlineData.startDate = new Date(startDate);
  }

  const deadline = await Deadline.create(deadlineData);

  let studentIdsToNotify = [];
  if (deadlineData.assignedGroups && deadlineData.assignedGroups.length > 0) {
    const projects = await Project.find({ _id: { $in: deadlineData.assignedGroups } }).select("student members");
    const studentIdsSet = new Set();
    projects.forEach((p) => {
      if (p.student) studentIdsSet.add(p.student.toString());
      if (p.members) {
        p.members.forEach((m) => studentIdsSet.add(m.toString()));
      }
    });
    studentIdsToNotify = Array.from(studentIdsSet);
  } else {
    const supervisedStudents = await User.find({
      role: "Student",
      supervisor: ownerTeacherId,
    })
      .select("_id")
      .lean();
    studentIdsToNotify = supervisedStudents.map((student) => student._id.toString());
  }

  await Promise.all(
    studentIdsToNotify.map((studentId) =>
      notificationServices.notifyUser(
        studentId,
        `New deadline "${deadline.title}" has been created and is due on ${new Date(deadline.endDate).toLocaleString()}.`,
        "deadline",
        "/student/deadlines",
        "high",
      ),
    ),
  );

  res.status(201).json({
    success: true,
    message: "Deadline created successfully",
    data: { deadline },
  });
});

// Update a deadline (Teacher)
export const updateDeadline = asyncHandler(async (req, res, next) => {
  console.log("UPDATE DEADLINE CALLED", req.params, req.body, req.user);
  const { deadlineId } = req.params;
  const { title, description, endDate, startDate, assignedGroups } = req.body;

  let deadline = await Deadline.findById(deadlineId);

  if (!deadline) {
    return next(new ErrorHandler("Deadline not found", 404));
  }

  // Ensure only the creator or Admin can update
  if (deadline.teacherId.toString() !== req.user._id.toString() && req.user.role !== "Admin") {
    console.error("Update Deadline: Not authorized", { teacherId: deadline.teacherId, userId: req.user._id, role: req.user.role });
    return next(new ErrorHandler("Not authorized to update this deadline", 403));
  }

  const updateData = { title, description };
  if (endDate) updateData.endDate = new Date(endDate);
  if (startDate) updateData.startDate = new Date(startDate);
  if (assignedGroups) updateData.assignedGroups = Array.isArray(assignedGroups) ? assignedGroups : [];

  try {
    deadline = await Deadline.findByIdAndUpdate(deadlineId, updateData, {
      new: true,
      runValidators: true,
    });
  } catch (error) {
    console.error("Error updating deadline in DB:", error);
    return next(new ErrorHandler("Failed to update deadline in database", 500));
  }

  res.status(200).json({
    success: true,
    message: "Deadline updated successfully",
    data: { deadline },
  });
});

// Delete a deadline (Teacher)
export const deleteDeadline = asyncHandler(async (req, res, next) => {
  console.log("DELETE DEADLINE CALLED", req.params, req.user);
  const { deadlineId } = req.params;

  const deadline = await Deadline.findById(deadlineId);

  if (!deadline) {
    return next(new ErrorHandler("Deadline not found", 404));
  }

  // Ensure only the creator or Admin can delete
  if (deadline.teacherId.toString() !== req.user._id.toString() && req.user.role !== "Admin") {
    console.error("Delete Deadline: Not authorized", { teacherId: deadline.teacherId, userId: req.user._id, role: req.user.role });
    return next(new ErrorHandler("Not authorized to delete this deadline", 403));
  }

  // Optionally delete related submissions
  await Submission.deleteMany({ deadlineId: deadline._id });
  
  await deadline.deleteOne();

  res.status(200).json({
    success: true,
    message: "Deadline deleted successfully",
  });
});

// Get deadlines for a teacher
export const getTeacherDeadlines = asyncHandler(async (req, res, next) => {
  const teacherId =
    req.user.role === "Admin" && req.query.teacherId
      ? req.query.teacherId
      : req.user._id;
  const deadlines = await Deadline.find({ teacherId }).sort({ endDate: 1 });

  res.status(200).json({
    success: true,
    data: { deadlines },
  });
});

// Get deadlines for a student
export const getStudentDeadlines = asyncHandler(async (req, res, next) => {
  const { project, supervisorId } = await resolveStudentDeadlineContext(
    req.user._id,
  );

  if (!supervisorId) {
    return res.status(200).json({
      success: true,
      data: { deadlines: [], project: project || null },
    });
  }

  const query = { teacherId: supervisorId };
  if (project?._id) {
    query.$or = [
      { assignedGroups: { $exists: false } },
      { assignedGroups: { $size: 0 } },
      { assignedGroups: project._id },
    ];
  } else {
    query.$or = [
      { assignedGroups: { $exists: false } },
      { assignedGroups: { $size: 0 } },
    ];
  }

  const deadlines = await Deadline.find(query).sort({
    endDate: 1,
  });
  
  // Find submissions for this project
  const submissions = project?._id
    ? await Submission.find({ groupId: project._id })
    : [];
  const submissionMap = submissions.reduce((acc, sub) => {
    acc[sub.deadlineId.toString()] = sub;
    return acc;
  }, {});

  const deadlinesWithStatus = deadlines.map((dl) => {
    const submission = submissionMap[dl._id.toString()];
    const isOverdue = new Date() > new Date(dl.endDate);
    
    let currentStatus = "PENDING";
    if (submission) {
      currentStatus = submission.status;
    } else if (isOverdue) {
      currentStatus = "MISSED";
    }

    return {
      ...dl.toObject(),
      submissionStatus: currentStatus,
      submission: submission || null,
      isOverdue,
    };
  });

  res.status(200).json({
    success: true,
    data: { deadlines: deadlinesWithStatus, project },
  });
});

// Submit a deadline
export const submitDeadline = asyncHandler(async (req, res, next) => {
  const { deadlineId } = req.params;
  const deadline = await Deadline.findById(deadlineId);

  if (!deadline) {
    return next(new ErrorHandler("Deadline not found", 404));
  }

  if (new Date() > new Date(deadline.endDate)) {
    return next(new ErrorHandler("Đã quá hạn nộp bài", 400));
  }

  const { project, supervisorId } = await resolveStudentDeadlineContext(
    req.user._id,
  );

  if (!project) {
    return next(new ErrorHandler("You are not part of a project group", 400));
  }

  if (
    !supervisorId ||
    deadline.teacherId.toString() !== supervisorId.toString()
  ) {
    return next(
      new ErrorHandler("This deadline does not belong to your supervisor", 403),
    );
  }

  if (!req.files || req.files.length === 0) {
    return next(new ErrorHandler("Please upload at least one file", 400));
  }

  // Upload each file to Supabase and build filesList
  const filesList = await Promise.all(
    req.files.map(async (file) => {
      const originalNameDecoded = Buffer.from(file.originalname, "latin1").toString("utf8");
      const destPath = buildStoragePath("submissions", project._id.toString(), originalNameDecoded);
      const publicUrl = await uploadToSupabase(file.buffer, file.mimetype, destPath);
      return {
        fileUrl: publicUrl,
        fileName: originalNameDecoded,
        uploadedAt: new Date(),
      };
    })
  );

  // Find existing submission or create new
  let submission = await Submission.findOne({ deadlineId, groupId: project._id });

  // For backward compatibility, store first file details in legacy single-file fields
  const firstFileUrl = filesList[0].fileUrl;
  const firstFileName = filesList[0].fileName;

  if (submission) {
    // Delete old files from Supabase Storage before overwriting
    if (submission.files && submission.files.length > 0) {
      for (const file of submission.files) {
        if (file.fileUrl) {
          await deleteFileByUrl(file.fileUrl);
        }
      }
    } else if (submission.fileUrl) {
      await deleteFileByUrl(submission.fileUrl);
    }

    submission.fileUrl = firstFileUrl;
    submission.fileName = firstFileName;
    submission.files = filesList;
    submission.status = "SUBMITTED";
    submission.submittedBy = req.user._id;
    submission.submittedAt = new Date();
    await submission.save();
  } else {
    submission = await Submission.create({
      deadlineId,
      groupId: project._id,
      submittedBy: req.user._id,
      fileUrl: firstFileUrl,
      fileName: firstFileName,
      files: filesList,
      status: "SUBMITTED",
      submittedAt: new Date(),
    });
  }

  // Sync with project.files - remove existing for this deadline submission and add all new ones
  project.files = (project.files || []).filter(
    (f) => !(f.fileCategory === "Submission" && f.deadlineId?.toString() === deadlineId.toString())
  );

  req.files.forEach((file, index) => {
    project.files.push({
      fileType: file.mimetype,
      fileUrl: filesList[index].fileUrl,
      originalName: filesList[index].fileName,
      uploadedAt: new Date(),
      fileCategory: "Submission",
      deadlineId: deadlineId,
    });
  });

  await project.save();

  res.status(200).json({
    success: true,
    message: "Submitted successfully",
    data: { submission },
  });
});

// Unsubmit a deadline
export const unsubmitDeadline = asyncHandler(async (req, res, next) => {
  const { deadlineId } = req.params;
  const deadline = await Deadline.findById(deadlineId);

  if (!deadline) {
    return next(new ErrorHandler("Deadline not found", 404));
  }

  if (new Date() > new Date(deadline.endDate)) {
    return next(new ErrorHandler("Đã quá hạn nộp bài, không thể hủy", 400));
  }

  const { project, supervisorId } = await resolveStudentDeadlineContext(
    req.user._id,
  );

  if (!project) {
    return next(new ErrorHandler("Project not found", 400));
  }

  if (
    !supervisorId ||
    deadline.teacherId.toString() !== supervisorId.toString()
  ) {
    return next(
      new ErrorHandler("This deadline does not belong to your supervisor", 403),
    );
  }

  let submission = await Submission.findOne({ deadlineId, groupId: project._id });

  if (!submission) {
    return next(new ErrorHandler("No submission found", 404));
  }

  // Delete files from Supabase Storage
  if (submission.files && submission.files.length > 0) {
    for (const file of submission.files) {
      if (file.fileUrl) {
        await deleteFileByUrl(file.fileUrl);
      }
    }
  } else if (submission.fileUrl) {
    await deleteFileByUrl(submission.fileUrl);
  }

  // Clear submission files info
  submission.status = "PENDING";
  submission.fileUrl = null;
  submission.fileName = null;
  submission.files = [];
  await submission.save();

  // Sync with project.files
  project.files = (project.files || []).filter(
    (f) => !(f.fileCategory === "Submission" && f.deadlineId?.toString() === deadlineId.toString())
  );
  await project.save();

  res.status(200).json({
    success: true,
    message: "Submission cancelled successfully",
  });
});

// Get Matrix for Teacher
export const getTeacherMatrix = asyncHandler(async (req, res, next) => {
  const teacherId = req.user._id;

  // 1. Get all deadlines for this teacher
  const deadlines = await Deadline.find({ teacherId }).sort({ endDate: 1 });

  // 2. Get all projects supervised by this teacher (excluding rejected ones)
  const projects = await Project.find({ supervisor: teacherId, status: { $ne: "rejected" } }).populate("student members", "name email");

  // 3. Get all submissions for these projects
  const projectIds = projects.map(p => p._id);
  const submissions = await Submission.find({ groupId: { $in: projectIds } });

  // 4. Build Matrix
  const matrix = projects.map(project => {
    const projectSubmissions = {};
    
    deadlines.forEach(dl => {
      const sub = submissions.find(s => s.deadlineId.toString() === dl._id.toString() && s.groupId.toString() === project._id.toString());
      const isOverdue = new Date() > new Date(dl.endDate);
      
      let status = "PENDING";
      if (sub) {
        status = sub.status;
      } else if (isOverdue) {
        status = "MISSED";
      }

      projectSubmissions[dl._id.toString()] = {
        status,
        submission: sub || null,
        isOverdue,
      };
    });

    return {
      project: {
        _id: project._id,
        title: project.title,
        groupName: project.groupName,
        members: project.members,
      },
      submissions: projectSubmissions,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      deadlines,
      matrix,
    },
  });
});

// Get Submissions for a specific Deadline (Teacher)
export const getDeadlineSubmissions = asyncHandler(async (req, res, next) => {
  const { deadlineId } = req.params;
  const teacherId = req.user._id;

  const deadline = await Deadline.findById(deadlineId);
  if (!deadline) {
    return next(new ErrorHandler("Deadline not found", 404));
  }

  // Find all groups assigned to this deadline (excluding rejected ones)
  let projectQuery = { supervisor: teacherId, status: { $ne: "rejected" } };
  if (deadline.assignedGroups && deadline.assignedGroups.length > 0) {
    projectQuery._id = { $in: deadline.assignedGroups };
  }

  const projects = await Project.find(projectQuery)
    .populate("student members", "name email");

  // Get submissions
  const projectIds = projects.map(p => p._id);
  const submissions = await Submission.find({ deadlineId, groupId: { $in: projectIds } })
    .populate("submittedBy", "name email");

  // Stats calculation
  let totalGroups = projects.length;
  let submittedCount = 0;
  let lateCount = 0;
  let missingCount = 0;
  let pendingCount = 0;

  const records = projects.map(project => {
    const sub = submissions.find(s => s.groupId.toString() === project._id.toString());
    const isOverdue = new Date() > new Date(deadline.endDate);
    
    let status = "PENDING";
    if (sub) {
      if (sub.status === "SUBMITTED") {
        const isLate = new Date(sub.submittedAt || sub.createdAt) > new Date(deadline.endDate);
        if (isLate) {
          status = "LATE";
          lateCount++;
        } else {
          status = "SUBMITTED";
          submittedCount++;
        }
      } else if (sub.status === "LATE") {
        status = "LATE";
        lateCount++;
      } else {
        status = sub.status;
        if (status === "MISSED") missingCount++;
        else pendingCount++;
      }
    } else if (isOverdue) {
      status = "MISSED";
      missingCount++;
    } else {
      pendingCount++;
    }

    return {
      project: {
        _id: project._id,
        title: project.title,
        groupName: project.groupName,
        members: project.members,
        student: project.student,
        feedback: project.feedback || [],
      },
      status,
      submission: sub || null,
      projectFiles: (project.files || [])
        .filter(
          (f) =>
            f.fileCategory === "Submission" &&
            f.deadlineId?.toString() === deadlineId.toString()
        )
        .map((f) => ({
          fileUrl: f.fileUrl,
          fileName: f.originalName,
          uploadedAt: f.uploadedAt,
        })),
    };
  });

  res.status(200).json({
    success: true,
    data: {
      deadline,
      stats: {
        totalGroups,
        submitted: submittedCount,
        late: lateCount,
        missing: missingCount,
        pending: pendingCount,
      },
      records,
    },
  });
});

// Submit Feedback for a Submission (Teacher)
export const submitSubmissionFeedback = asyncHandler(async (req, res, next) => {
  const { deadlineId, groupId } = req.params;
  const teacherId = req.user._id;
  const { message } = req.body;

  const deadline = await Deadline.findById(deadlineId);
  if (!deadline) {
    return next(new ErrorHandler("Deadline not found", 404));
  }

  const project = await Project.findById(groupId);
  if (!project) {
    return next(new ErrorHandler("Project not found", 404));
  }

  let submission = await Submission.findOne({ deadlineId, groupId });
  
  // If no submission exists, create a placeholder
  if (!submission) {
    const isOverdue = new Date() > new Date(deadline.endDate);
    submission = await Submission.create({
      deadlineId,
      groupId,
      submittedBy: project.student,
      status: isOverdue ? "MISSED" : "PENDING",
    });
  }

  const feedbackData = {
    message: message || "",
    commentedAt: new Date(),
    commentedBy: teacherId,
  };

  if (req.file) {
    const originalNameDecoded = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    const destPath = buildStoragePath("feedback", `${deadlineId}-${groupId}`, originalNameDecoded);
    feedbackData.fileUrl = await uploadToSupabase(req.file.buffer, req.file.mimetype, destPath);
    feedbackData.fileName = originalNameDecoded;
  }

  submission.feedback = feedbackData;
  await submission.save();

  // Notify student
  await notificationServices.notifyUser(
    project.student,
    `Your supervisor has added feedback for deadline "${deadline.title}"`,
    "feedback",
    "/student/deadlines",
    "medium"
  );

  res.status(200).json({
    success: true,
    message: "Feedback submitted successfully",
    data: { submission },
  });
});

// Get Group Progress Across All Deadlines (Teacher/Student)
export const getGroupProgress = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId).populate("student supervisor members", "name email");
  if (!project) {
    return next(new ErrorHandler("Project not found", 404));
  }

  const supervisorId = project.supervisor?._id || project.supervisor;
  if (!supervisorId) {
    return res.status(200).json({
      success: true,
      data: {
        progress: {
          percentage: 0,
          completed: [],
          missed: [],
          upcoming: [],
        }
      }
    });
  }

  // Find all deadlines applicable to this group
  const query = {
    teacherId: supervisorId,
    $or: [
      { assignedGroups: { $exists: false } },
      { assignedGroups: { $size: 0 } },
      { assignedGroups: project._id },
    ]
  };

  const deadlines = await Deadline.find(query).sort({ endDate: 1 });
  const submissions = await Submission.find({ groupId: project._id });

  const completed = [];
  const missed = [];
  const upcoming = [];

  deadlines.forEach(dl => {
    const sub = submissions.find(s => s.deadlineId.toString() === dl._id.toString());
    const isOverdue = new Date() > new Date(dl.endDate);

    if (sub && (sub.status === "SUBMITTED" || sub.status === "LATE")) {
      completed.push({
        deadline: dl,
        submission: sub,
      });
    } else if (isOverdue) {
      missed.push({
        deadline: dl,
        submission: sub || null,
      });
    } else {
      upcoming.push({
        deadline: dl,
        submission: sub || null,
      });
    }
  });

  const total = deadlines.length;
  const percentage = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      progress: {
        percentage,
        completed,
        missed,
        upcoming,
      }
    }
  });
});
