import express from "express";
import {
  createStudent,
  updateStudent,
  deleteStudent,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getAllUsers,
  getAllProjects,
  getDashboardStats,
  assignSupervisor,
  updateProjectStatus,
  getProject,
} from "../controllers/adminController.js";
import {
  assignProjectToCouncil,
  createCouncil,
  deleteCouncil,
  getAdminCouncils,
  updateCouncil,
} from "../controllers/councilController.js";
import {
  createAssessmentTemplate,
  getAdminQaDashboard,
  getAssessmentTemplate,
  listAssessmentTemplates,
} from "../controllers/assessmentController.js";
import {
  getRegistrationSettings,
  updateRegistrationSettings,
} from "../controllers/registrationController.js";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/create-student",
  isAuthenticated,
  isAuthorized("Admin"),
  createStudent,
);
router.put(
  "/update-student/:id",
  isAuthenticated,
  isAuthorized("Admin"),
  updateStudent,
);
router.delete(
  "/delete-student/:id",
  isAuthenticated,
  isAuthorized("Admin"),
  deleteStudent,
);

router.post(
  "/create-teacher",
  isAuthenticated,
  isAuthorized("Admin"),
  createTeacher,
);
router.put(
  "/update-teacher/:id",
  isAuthenticated,
  isAuthorized("Admin"),
  updateTeacher,
);
router.delete(
  "/delete-teacher/:id",
  isAuthenticated,
  isAuthorized("Admin"),
  deleteTeacher,
);

router.get("/projects", isAuthenticated, isAuthorized("Admin"), getAllProjects);

router.get(
  "/fetch-dashboard-stats",
  isAuthenticated,
  isAuthorized("Admin"),
  getDashboardStats,
);

router.get("/users", isAuthenticated, isAuthorized("Admin"), getAllUsers);

router.post(
  "/assign-supervisor",
  isAuthenticated,
  isAuthorized("Admin"),
  assignSupervisor,
);
router.get("/project/:id", isAuthenticated, isAuthorized("Admin"), getProject);
router.put(
  "/project/:id",
  isAuthenticated,
  isAuthorized("Admin"),
  updateProjectStatus,
);
router.get(
  "/councils",
  isAuthenticated,
  isAuthorized("Admin"),
  getAdminCouncils,
);
router.post(
  "/councils",
  isAuthenticated,
  isAuthorized("Admin"),
  createCouncil,
);
router.put(
  "/councils/:councilId",
  isAuthenticated,
  isAuthorized("Admin"),
  updateCouncil,
);
router.delete(
  "/councils/:councilId",
  isAuthenticated,
  isAuthorized("Admin"),
  deleteCouncil,
);
router.post(
  "/councils/:councilId/assign-project",
  isAuthenticated,
  isAuthorized("Admin"),
  assignProjectToCouncil,
);
router.get(
  "/assessment-templates",
  isAuthenticated,
  isAuthorized("Admin"),
  listAssessmentTemplates,
);
router.post(
  "/assessment-templates",
  isAuthenticated,
  isAuthorized("Admin"),
  createAssessmentTemplate,
);
router.get(
  "/assessment-templates/:templateId",
  isAuthenticated,
  isAuthorized("Admin"),
  getAssessmentTemplate,
);
router.get(
  "/qa/clo-dashboard",
  isAuthenticated,
  isAuthorized("Admin"),
  getAdminQaDashboard,
);
router.get(
  "/registration-settings",
  isAuthenticated,
  isAuthorized("Admin"),
  getRegistrationSettings,
);
router.put(
  "/registration-settings",
  isAuthenticated,
  isAuthorized("Admin"),
  updateRegistrationSettings,
);
export default router;
