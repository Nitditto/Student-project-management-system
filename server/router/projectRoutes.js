import express from "express";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";
import {
  downloadFile
} from "../controllers/projectController.js";
const router = express.Router();

router.get(
  "/:projectId/files/:fileId/download",
  isAuthenticated,
  isAuthorized("Admin", "Teacher", "Student"),
  downloadFile,
);

export default router;
