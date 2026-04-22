import express from "express";
import {
  createRegistrationPeriod,
  openRegistrationPeriod,
  closeRegistrationPeriod,
  getAllRegistrationPeriods,
  getCurrentOpenRegistrationPeriod,
} from "../controllers/registrationController.js";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/current",
  isAuthenticated,
  getCurrentOpenRegistrationPeriod
);

router.get(
  "/all",
  isAuthenticated,
  getAllRegistrationPeriods
);

router.post(
  "/create-registration-period",
  isAuthenticated,
  isAuthorized("Admin"),
  createRegistrationPeriod
);

router.put(
  "/open-registration-period/:id",
  isAuthenticated,
  isAuthorized("Admin"),
  openRegistrationPeriod
);

router.put(
  "/close-registration-period/:id",
  isAuthenticated,
  isAuthorized("Admin"),
  closeRegistrationPeriod
);

export default router;