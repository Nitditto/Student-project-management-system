import express from "express";
import {
  createDeadline,
  getTeacherDeadlines,
  getStudentDeadlines,
  submitDeadline,
  unsubmitDeadline,
  getTeacherMatrix,
  updateDeadline,
  deleteDeadline,
  getDeadlineSubmissions,
  submitSubmissionFeedback,
  getGroupProgress,
} from "../controllers/deadlineController.js";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";
import { upload, handleUploadError, decodeFilenameMiddleware } from "../middleware/upload.js";

const router = express.Router();

router.post(
  "/",
  isAuthenticated,
  isAuthorized("Admin", "Teacher"),
  createDeadline,
);

router.put(
  "/:deadlineId",
  isAuthenticated,
  isAuthorized("Admin", "Teacher"),
  updateDeadline,
);

router.delete(
  "/:deadlineId",
  isAuthenticated,
  isAuthorized("Admin", "Teacher"),
  deleteDeadline,
);

router.get(
  "/teacher",
  isAuthenticated,
  isAuthorized("Admin", "Teacher"),
  getTeacherDeadlines,
);

router.get(
  "/student",
  isAuthenticated,
  isAuthorized("Student"),
  getStudentDeadlines,
);

router.post(
  "/:deadlineId/submit",
  isAuthenticated,
  isAuthorized("Student"),
  upload.array("files", 10),
  handleUploadError,
  submitDeadline,
);

router.post(
  "/:deadlineId/unsubmit",
  isAuthenticated,
  isAuthorized("Student"),
  unsubmitDeadline,
);

router.get(
  "/teacher/matrix",
  isAuthenticated,
  isAuthorized("Admin", "Teacher"),
  getTeacherMatrix,
);

router.get(
  "/:deadlineId/submissions",
  isAuthenticated,
  isAuthorized("Admin", "Teacher"),
  getDeadlineSubmissions,
);

router.post(
  "/:deadlineId/submissions/:groupId/feedback",
  isAuthenticated,
  isAuthorized("Admin", "Teacher"),
  upload.single("file"),
  handleUploadError,
  decodeFilenameMiddleware,
  submitSubmissionFeedback,
);

router.get(
  "/projects/:projectId/progress",
  isAuthenticated,
  getGroupProgress,
);

export default router;
