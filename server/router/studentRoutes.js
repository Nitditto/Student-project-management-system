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
} from "../controllers/attendanceController.js";
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
} from "../controllers/registrationController.js";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";
import { upload, handleUploadError } from "../middleware/upload.js";

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
  requestLeave,
);
router.get(
  "/council-board",
  isAuthenticated,
  isAuthorized("Student"),
  getStudentCouncilBoard,
);
router.get(
  "/councils/:councilId/projects/:projectId/reviewer-form/download",
  isAuthenticated,
  isAuthorized("Student"),
  downloadReviewerForm,
);

export default router;
