import express from "express";
import {
  createDeadline,
  getTeacherDeadlines,
  getStudentDeadlines,
  submitDeadline,
  unsubmitDeadline,
  getTeacherMatrix,
} from "../controllers/deadlineController.js";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";
import { upload, handleUploadError } from "../middleware/upload.js";

const router = express.Router();

router.post(
  "/",
  isAuthenticated,
  isAuthorized("Admin", "Teacher"),
  createDeadline,
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
  upload.single("file"),
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

export default router;
