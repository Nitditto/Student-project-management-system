import express from "express";
import {
  forgotPassword,
  getUser,
  loginUser,
  logout,
  registerUser,
  resetPassword,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", isAuthenticated, getUser);
router.post("/logout", logout);
router.post("/password/forgot", forgotPassword);
router.post("/password/reset/:token", resetPassword);
router.put("/profile/update", isAuthenticated, updateProfile);
router.put("/password/change", isAuthenticated, changePassword);

export default router;

