import express from "express";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";
import {
  createSchedulerJob,
  getSchedulerJobStatus,
  applySchedulerJobResults,
  discardSchedulerJob
} from "../controllers/schedulerController.js";

const router = express.Router();

// All scheduling routes are restricted to authenticated Admins
router.post("/jobs", isAuthenticated, isAuthorized("Admin"), createSchedulerJob);
router.get("/jobs/:id", isAuthenticated, isAuthorized("Admin"), getSchedulerJobStatus);
router.post("/jobs/:id/apply", isAuthenticated, isAuthorized("Admin"), applySchedulerJobResults);
router.delete("/jobs/:id", isAuthenticated, isAuthorized("Admin"), discardSchedulerJob);

export default router;
