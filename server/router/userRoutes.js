import express from "express";
import {
  forgotPassword,
  getUser,
  loginUser,
  logout,
  registerUser,
  resetPassword,
} from "../controllers/authController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", getUser);
router.get("/me", isAuthenticated, getUser);
router.post("/logout", logout);
router.post("/password/forgot", forgotPassword);
router.post("/password/reset/:token", resetPassword);

export default router;

