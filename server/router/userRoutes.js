import express from "express";
import {registerUser, login, logout, forgotPassword, getUser, resetPassword} from "../controllers/authController.js";
import multer from "multer";
import { isAuthenticated } from '../middleware/authMiddleware.js';
const router = express.Router();
router.post("/register", registerUser);
router.post("/login", login);
router.get("/me", getUser);
router.get("/me", isAuthenticated, getUser);
router.post("/logout", logout);
router.post("/password/forgot", forgotPassword);
router.post("/password/reset/:token", resetPassword);

export default router;

