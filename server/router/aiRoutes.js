import express from "express";
import { isAuthenticated } from "../middleware/authMiddleware.js";
import { upload, handleUploadError } from "../middleware/upload.js";
import { analyzeProposal } from "../controllers/aiController.js";

const router = express.Router();

router.post(
  "/analyze-proposal",
  isAuthenticated,
  upload.single("file"),
  handleUploadError,
  analyzeProposal
);

export default router;
