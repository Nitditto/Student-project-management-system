import mongoose from "mongoose";

const schedulerJobSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending"
  },
  config: {
    projectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
    teacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    rooms: [String],
    timeSlots: [{
      startAt: { type: Date, required: true },
      endAt: { type: Date, required: true }
    }],
    solverType: { type: String, enum: ["genetic_algorithm", "greedy_heuristic"], default: "genetic_algorithm" },
    populationSize: { type: Number, default: 150 },
    generations: { type: Number, default: 300 }
  },
  result: {
    generatedCouncils: [{ type: mongoose.Schema.Types.ObjectId, ref: "DefenseCouncil" }],
    fitnessScore: { type: Number, default: null },
    executionTimeMs: { type: Number, default: null }
  },
  error: { type: String, default: null }
}, { timestamps: true });

export const SchedulerJob = mongoose.models.SchedulerJob || mongoose.model("SchedulerJob", schedulerJobSchema);
