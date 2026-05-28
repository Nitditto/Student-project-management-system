import express from "express";
import {
  getStudentProject,
  submitProposal,
  uploadFiles,
  getAvailableSupervisors,
  getSupervisor,
  requestSupervisor,
  getDashboardStats,
  getFeedback,
  downloadFile,
} from "../controllers/studentController.js";
import {
  getStudentScheduleBoard,
  pickScheduleSlot,
  rescheduleProjectSlot,
} from "../controllers/scheduleController.js";
import {
  getStudentAttendanceBoard,
  requestLeave,
  studentCheckIn,
  studentQrCheckIn,
  studentCodeCheckIn,
} from "../controllers/attendanceController.js";
import {
  getStudentAssessmentBoard,
  submitStudentPeerEvaluation,
} from "../controllers/assessmentController.js";
import {
  downloadReviewerForm,
  getStudentCouncilBoard,
} from "../controllers/councilController.js";
import {
  acceptTeacherPreselection,
  getGroupCandidates,
  getRegistrationSettings,
  getStudentRegistrationSetup,
  rejectTeacherPreselection,
  respondGroupInvitation,
  transferLeadership,
  kickMember,
  disbandGroup,
} from "../controllers/registrationController.js";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";
import { upload, handleUploadError, decodeFilenameMiddleware } from "../middleware/upload.js";

const router = express.Router();

router.get(
  "/registration-settings",
  isAuthenticated,
  isAuthorized("Student"),
  getRegistrationSettings,
);
router.get(
  "/registration-setup",
  isAuthenticated,
  isAuthorized("Student"),
  getStudentRegistrationSetup,
);
router.get(
  "/group-candidates",
  isAuthenticated,
  isAuthorized("Student"),
  getGroupCandidates,
);
router.put(
  "/group-invitations/:invitationId/respond",
  isAuthenticated,
  isAuthorized("Student"),
  respondGroupInvitation,
);
router.post(
  "/preselections/:preselectionId/accept",
  isAuthenticated,
  isAuthorized("Student"),
  acceptTeacherPreselection,
);
router.post(
  "/preselections/:preselectionId/reject",
  isAuthenticated,
  isAuthorized("Student"),
  rejectTeacherPreselection,
);
router.get(
  "/project",
  isAuthenticated,
  isAuthorized("Student"),
  getStudentProject,
);
router.post(
  "/project-proposal",
  isAuthenticated,
  isAuthorized("Student"),
  submitProposal,
);
router.post(
  "/upload/:projectId",
  isAuthenticated,
  isAuthorized("Student"),
  upload.array("files", 10),
  handleUploadError,
  decodeFilenameMiddleware,
  uploadFiles,
);

router.get(
  "/fetch-supervisors",
  isAuthenticated,
  isAuthorized("Student"),
  getAvailableSupervisors,
);

router.get(
  "/supervisor",
  isAuthenticated,
  isAuthorized("Student"),
  getSupervisor,
);

router.post(
  "/request-supervisor",
  isAuthenticated,
  isAuthorized("Student"),
  requestSupervisor,
);

router.get(
  "/feedback/:projectId",
  isAuthenticated,
  isAuthorized("Student"),
  getFeedback,
);
router.get(
  "/fetch-dashboard-stats",
  isAuthenticated,
  isAuthorized("Student"),
  getDashboardStats,
);
router.get(
  "/download/:projectId/:fileId",
  isAuthenticated,
  isAuthorized("Student"),
  downloadFile,
);
router.get(
  "/schedule-board",
  isAuthenticated,
  isAuthorized("Student"),
  getStudentScheduleBoard,
);
router.post(
  "/schedules/:scheduleId/slots/:slotId/pick",
  isAuthenticated,
  isAuthorized("Student"),
  pickScheduleSlot,
);
router.post(
  "/schedules/:scheduleId/slots/:slotId/reschedule",
  isAuthenticated,
  isAuthorized("Student"),
  rescheduleProjectSlot,
);
router.get(
  "/attendance-board",
  isAuthenticated,
  isAuthorized("Student"),
  getStudentAttendanceBoard,
);
router.post(
  "/attendance/check-in",
  isAuthenticated,
  isAuthorized("Student"),
  studentQrCheckIn,
);
router.post(
  "/attendance/check-in-code",
  isAuthenticated,
  isAuthorized("Student"),
  studentCodeCheckIn,
);
router.post(
  "/attendance/:sessionId/check-in",
  isAuthenticated,
  isAuthorized("Student"),
  studentCheckIn,
);
router.post(
  "/attendance/:sessionId/request-leave",
  isAuthenticated,
  isAuthorized("Student"),
  upload.array("evidence", 3),
  handleUploadError,
  decodeFilenameMiddleware,
  requestLeave,
);
router.get(
  "/council-board",
  isAuthenticated,
  isAuthorized("Student"),
  getStudentCouncilBoard,
);
router.get(
  "/assessment-board",
  isAuthenticated,
  isAuthorized("Student"),
  getStudentAssessmentBoard,
);
router.get(
  "/projects/:projectId/assessment-board",
  isAuthenticated,
  isAuthorized("Student"),
  getStudentAssessmentBoard,
);
router.post(
  "/projects/:projectId/peer-evaluations",
  isAuthenticated,
  isAuthorized("Student"),
  upload.array("files", 5),
  handleUploadError,
  decodeFilenameMiddleware,
  submitStudentPeerEvaluation,
);
router.get(
  "/councils/:councilId/projects/:projectId/reviewer-form/download",
  isAuthenticated,
  isAuthorized("Student"),
  downloadReviewerForm,
);
router.put(
  "/projects/:projectId/transfer-leadership",
  isAuthenticated,
  isAuthorized("Student"),
  transferLeadership,
);
router.put(
  "/projects/:projectId/kick-member",
  isAuthenticated,
  isAuthorized("Student"),
  kickMember,
);
router.delete(
  "/projects/:projectId/disband",
  isAuthenticated,
  isAuthorized("Student"),
  disbandGroup,
);

export default router;
