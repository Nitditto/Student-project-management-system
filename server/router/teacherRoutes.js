import express from "express";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";
import {
  getTeacherDashboardStats,
  acceptRequest,
  rejectRequest,
  getRequest,
  addFeedback,
  markComplete,
  getAssignedStudents,
  downloadFile,
  getFiles,
} from "../controllers/teacherController.js";
import {
  addSlotsToSchedule,
  createTeacherSchedule,
  getTeacherSchedules,
  runAutoAssign,
} from "../controllers/scheduleController.js";
import {
  createAttendanceSession,
  deleteAttendanceSession,
  getTeacherAttendanceSessions,
  manualMarkAttendance,
  reviewLeaveRequest,
  updateAttendanceSession,
  getNgrokUrl,
} from "../controllers/attendanceController.js";
import {
  createTeacherPreselection,
  getTeacherDirectory,
  getTeacherPreselectionCandidates,
  getTeacherPreselections,
} from "../controllers/registrationController.js";
import {
  assignReviewerByChairman,
  downloadReviewerForm,
  finalizeCouncilProject,
  getTeacherCouncils,
  submitCouncilScore,
  submitReviewerForm,
} from "../controllers/councilController.js";
import {
  finalizeCloAssessment,
  getTeacherProjectAssessmentSummary,
  submitTeacherAssessmentSubmission,
  submitTeacherM5Submission,
  updateTeacherAssessmentSubmission,
} from "../controllers/assessmentController.js";
import { upload, handleUploadError } from "../middleware/upload.js";

const router = express.Router();

router.get(
  "/fetch-dashboard-stats",
  isAuthenticated,
  isAuthorized("Teacher"),
  getTeacherDashboardStats,
);

router.get("/requests", isAuthenticated, isAuthorized("Teacher"), getRequest);

router.put(
  "/requests/:requestId/accept",
  isAuthenticated,
  isAuthorized("Teacher"),
  acceptRequest,
);

router.put(
  "/requests/:requestId/reject",
  isAuthenticated,
  isAuthorized("Teacher"),
  rejectRequest,
);

router.post(
  "/feedback/:projectId",
  isAuthenticated,
  isAuthorized("Teacher"),
  addFeedback,
);

router.post(
  "/mark-complete/:projectId",
  isAuthenticated,
  isAuthorized("Teacher"),
  markComplete,
);

router.get(
  "/assigned-students",
  isAuthenticated,
  isAuthorized("Teacher"),
  getAssignedStudents,
);

router.get(
  "/download/:projectId/:fileId",
  isAuthenticated,
  isAuthorized("Teacher"),
  downloadFile,
);

router.get(
  "/files",
  isAuthenticated,
  isAuthorized("Teacher"),
  getFiles,
);
router.get(
  "/teacher-directory",
  isAuthenticated,
  isAuthorized("Teacher"),
  getTeacherDirectory,
);
router.get(
  "/preselection-candidates",
  isAuthenticated,
  isAuthorized("Teacher"),
  getTeacherPreselectionCandidates,
);
router.get(
  "/preselections",
  isAuthenticated,
  isAuthorized("Teacher"),
  getTeacherPreselections,
);
router.post(
  "/preselections",
  isAuthenticated,
  isAuthorized("Teacher"),
  createTeacherPreselection,
);
router.get(
  "/schedules",
  isAuthenticated,
  isAuthorized("Teacher"),
  getTeacherSchedules,
);
router.post(
  "/schedules",
  isAuthenticated,
  isAuthorized("Teacher"),
  createTeacherSchedule,
);
router.post(
  "/schedules/:scheduleId/slots",
  isAuthenticated,
  isAuthorized("Teacher"),
  addSlotsToSchedule,
);
router.post(
  "/schedules/:scheduleId/auto-assign",
  isAuthenticated,
  isAuthorized("Teacher"),
  runAutoAssign,
);
router.get(
  "/ngrok-url",
  isAuthenticated,
  isAuthorized("Teacher"),
  getNgrokUrl,
);
router.get(
  "/attendance-sessions",
  isAuthenticated,
  isAuthorized("Teacher"),
  getTeacherAttendanceSessions,
);
router.post(
  "/attendance-sessions",
  isAuthenticated,
  isAuthorized("Teacher"),
  createAttendanceSession,
);
router.put(
  "/attendance-sessions/:sessionId",
  isAuthenticated,
  isAuthorized("Teacher"),
  updateAttendanceSession,
);
router.delete(
  "/attendance-sessions/:sessionId",
  isAuthenticated,
  isAuthorized("Teacher"),
  deleteAttendanceSession,
);
router.put(
  "/attendance-sessions/:sessionId/students/:studentId/manual",
  isAuthenticated,
  isAuthorized("Teacher"),
  manualMarkAttendance,
);
router.put(
  "/attendance-sessions/:sessionId/students/:studentId/leave-review",
  isAuthenticated,
  isAuthorized("Teacher"),
  reviewLeaveRequest,
);
router.get(
  "/councils",
  isAuthenticated,
  isAuthorized("Teacher"),
  getTeacherCouncils,
);
router.post(
  "/councils/:councilId/projects/:projectId/reviewer",
  isAuthenticated,
  isAuthorized("Teacher"),
  assignReviewerByChairman,
);
router.post(
  "/projects/:projectId/assessments/:milestoneCode/submissions",
  isAuthenticated,
  isAuthorized("Teacher"),
  upload.array("files", 5),
  handleUploadError,
  submitTeacherAssessmentSubmission,
);
router.put(
  "/projects/:projectId/assessments/:milestoneCode/submissions/:submissionId",
  isAuthenticated,
  isAuthorized("Teacher"),
  upload.array("files", 5),
  handleUploadError,
  updateTeacherAssessmentSubmission,
);
router.post(
  "/councils/:councilId/projects/:projectId/m5-submissions",
  isAuthenticated,
  isAuthorized("Teacher"),
  upload.array("files", 5),
  handleUploadError,
  submitTeacherM5Submission,
);
router.get(
  "/projects/:projectId/assessment-summary",
  isAuthenticated,
  isAuthorized("Teacher"),
  getTeacherProjectAssessmentSummary,
);
router.post(
  "/councils/:councilId/projects/:projectId/score",
  isAuthenticated,
  isAuthorized("Teacher"),
  submitCouncilScore,
);
router.post(
  "/councils/:councilId/projects/:projectId/reviewer-form",
  isAuthenticated,
  isAuthorized("Teacher"),
  submitReviewerForm,
);
router.post(
  "/councils/:councilId/projects/:projectId/finalize",
  isAuthenticated,
  isAuthorized("Teacher"),
  finalizeCouncilProject,
);
router.post(
  "/councils/:councilId/projects/:projectId/finalize-clo",
  isAuthenticated,
  isAuthorized("Teacher"),
  finalizeCloAssessment,
);
router.get(
  "/councils/:councilId/projects/:projectId/reviewer-form/download",
  isAuthenticated,
  isAuthorized("Teacher"),
  downloadReviewerForm,
);

export default router;
