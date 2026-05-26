import express from "express";
import {
  createDeadline,
  updateDeadline,
  deleteDeadline,
  getAllDeadlines,
} from "../controllers/deadlineController.js";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/create-deadline/:id",
  isAuthenticated,
  isAuthorized("Admin", "Teacher"),
  createDeadline,
);
router.put(
  "/:id/update",
  isAuthenticated,
  isAuthorized("Admin"),
  updateDeadline,
);
router.delete(
  "/:id/delete",
  isAuthenticated,
  isAuthorized("Admin"),
  deleteDeadline,
);

export default router;
