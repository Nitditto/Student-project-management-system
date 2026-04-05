import express from "express";
import {
  getStudentProject,
  submitProposal,
  updateFiles,
  getAvailableSupervisors,
  getSupervisor,
  requestSupervisor,
} from "../controllers/studentController.js";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";
import { upload, handleUploadError } from "../middleware/upload.js";

const router = express.Router();

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
  updateFiles,
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

export default router;
