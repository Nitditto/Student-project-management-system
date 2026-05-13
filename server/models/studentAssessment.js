import mongoose from "mongoose";

const cloResultSchema = new mongoose.Schema({
  cloCode: { type: String, required: true },
  score: { type: Number, required: true },
  status: { type: String, enum: ["achieved", "not_achieved"], required: true }
}, { _id: false });

const studentAssessmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  
  // Peer evaluations given BY others TO this student
  peerSubmissionsReceived: [{
    assessorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cloEntries: [{
      cloCode: { type: String, required: true },
      score1to5: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String }
    }],
    submittedAt: { type: Date, default: Date.now }
  }],
  
  individualM6Score: { type: Number, default: null },
  individualCloResults: [cloResultSchema],
  
  officialFinalScore: { type: Number, default: null },
  officialPassStatus: { type: Boolean, default: null }
}, { timestamps: true });

// A student has one assessment per project
studentAssessmentSchema.index({ studentId: 1, projectId: 1 }, { unique: true });

export const StudentAssessment = mongoose.models.StudentAssessment || mongoose.model("StudentAssessment", studentAssessmentSchema);
