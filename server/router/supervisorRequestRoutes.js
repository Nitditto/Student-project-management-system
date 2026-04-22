import express from "express";
import {
  createSupervisorRequest,
  approveSupervisorRequest,
  rejectSupervisorRequest,
  cancelSupervisorRequest,
  getTeacherRequests,
  getRequestsByGroup,
} from "../controllers/supervisorRequestController.js";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/create-supervisor-request",
  isAuthenticated,
  isAuthorized("Student"),
  createSupervisorRequest
);

router.get(
  "/teacher-requests",
  isAuthenticated,
  isAuthorized("Teacher"),
  getTeacherRequests
);

router.get(
  "/group-requests/:groupId",
  isAuthenticated,
  isAuthorized("Student"),
  getRequestsByGroup
);

router.put(
  "/approve-supervisor-request/:requestId",
  isAuthenticated,
  isAuthorized("Teacher"),
  approveSupervisorRequest
);

router.put(
  "/reject-supervisor-request/:requestId",
  isAuthenticated,
  isAuthorized("Teacher"),
  rejectSupervisorRequest
);

router.put(
  "/cancel-supervisor-request/:requestId",
  isAuthenticated,
  isAuthorized("Student"),
  cancelSupervisorRequest
);

export default router;