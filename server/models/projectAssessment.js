import mongoose from "mongoose";

const cloEntrySchema = new mongoose.Schema({
  cloCode: { type: String, required: true },
  score1to5: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  evidenceRefs: [{ type: String }]
}, { _id: false });

const assessorSubmissionSchema = new mongoose.Schema({
  assessorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["supervisor", "reviewer", "chairman", "secretary", "member", "peer"], required: true },
  cloEntries: [cloEntrySchema],
  overallComment: { type: String, default: "" },
  submittedAt: { type: Date, default: Date.now },
  lockedAt: { type: Date, default: null }
});

const milestoneResultSchema = new mongoose.Schema({
  code: { type: String, required: true },
  weight: { type: Number, required: true },
  status: { type: String, enum: ["pending", "in_progress", "completed"], default: "pending" },
  assessorSubmissions: [assessorSubmissionSchema],
  // Calculated aggregated scores mapping CLO code to average score (1-5)
  aggregatedCloScores: { type: Map, of: Number, default: {} },
  componentScore5: { type: Number, default: null },
  componentScore10: { type: Number, default: null },
  evidenceRefs: [{ type: String }]
});

const cloResultSchema = new mongoose.Schema({
  cloCode: { type: String, required: true },
  score: { type: Number, required: true },
  status: { type: String, enum: ["achieved", "not_achieved"], required: true }
}, { _id: false });

const projectAssessmentSchema = new mongoose.Schema({
  templateVersion: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, unique: true },
  councilId: { type: mongoose.Schema.Types.ObjectId, ref: "DefenseCouncil", default: null },
  
  milestones: [milestoneResultSchema],
  cloResults: [cloResultSchema],
  
  teamFinalScore: { type: Number, default: null }, // 10-point scale
  teamPassStatus: { type: Boolean, default: null },
  
  qaEvidenceSummary: { type: String, default: "" },
  
  finalizedAt: { type: Date, default: null },
  finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

export const ProjectAssessment = mongoose.models.ProjectAssessment || mongoose.model("ProjectAssessment", projectAssessmentSchema);
