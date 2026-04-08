import express from "express";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";
import {
  getTeacherDashboardStats,
  acceptRequest,
  rejectRequest,
  getRequest,
} from "../controllers/teacherController.js";

const router = express.Router();

router.get(
  "/fetch-dashboard-stats",
  isAuthenticated,
  isAuthorized("Teacher"),
  getTeacherDashboardStats,
);

router.get(
  "/requests",
  isAuthenticated,
  isAuthorized("Teacher"),
  getRequest,
);

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

export default router;
