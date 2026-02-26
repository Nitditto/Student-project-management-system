import express from 'express'
import { forgotPassword, getUser, loginUser, logout, registerUser, resetPassword } from "../controllers/authController.js"

const router = express.Router();

router.post("/register", registerUser)
router.post("/login", loginUser)
router.post("/me", getUser)
router.post("/logout", logout)
router.post("/password/forgot", forgotPassword)
router.put("/password/reset/:token", resetPassword)


export default router;