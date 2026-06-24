import express from "express";
import { isAuthenticated } from "../middleware/authMiddleware.js";
import { upload, handleUploadError } from "../middleware/upload.js";
import { analyzeProposal } from "../controllers/aiController.js";
import {
  triggerAnalysis,
  getAnalysisResult,
  saveStudentFeedback
} from "../controllers/submissionAnalysisController.js";

const router = express.Router();

router.post(
  "/analyze-proposal",
  isAuthenticated,
  upload.single("file"),
  handleUploadError,
  analyzeProposal
);

// Submission Analysis Engine Routes
router.post("/analyze-submission", isAuthenticated, triggerAnalysis);
router.get("/analyze-submission/:submissionId", isAuthenticated, getAnalysisResult);
router.post("/analyze-submission/:analysisId/feedback", isAuthenticated, saveStudentFeedback);

export default router;
