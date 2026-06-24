import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";
import { Project } from "../../models/project.js";
import { User } from "../../models/user.js";
import { DefenseCouncil } from "../../models/defenseCouncil.js";
import { SchedulerJob } from "../../models/schedulerJob.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.resolve(__dirname, "./worker.js");

/**
 * Spawns a background Worker Thread to run the Genetic Algorithm solver.
 */
export const runSolverWorker = (data, config) => {
  return new Promise((resolve, reject) => {
    // Spawn worker thread passing the inputs and config parameters
    const worker = new Worker(workerPath, {
      workerData: { data, config }
    });

    worker.on("message", (response) => {
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || "Solver calculation failed."));
      }
    });

    worker.on("error", (error) => {
      reject(error);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Scheduler worker thread exited with code ${code}`));
      }
    });
  });
};

/**
 * Main Service to run an automated scheduling job.
 * @param {string} jobId - Mongoose SchedulerJob ID
 */
export const executeSchedulerJob = async (jobId) => {
  const job = await SchedulerJob.findById(jobId);
  if (!job) throw new Error(`SchedulerJob with ID ${jobId} not found.`);

  try {
    job.status = "processing";
    await job.save();

    // 1. Fetch input data from Database
    const projects = await Project.find({
      _id: { $in: job.config.projectIds }
    }).populate("student", "name supervisor").lean(); // Populate supervisor reference
    
    const teachers = await User.find({
      _id: { $in: job.config.teacherIds },
      role: "Teacher",
      isActive: true
    }).select("name email experties embedding department").lean();

    // 2. Prepare payload for worker
    const rawData = {
      projects,
      teachers,
      rooms: Array.from(job.config.rooms),
      timeSlots: job.config.timeSlots.map(slot => ({
        startAt: slot.startAt.toISOString(),
        endAt: slot.endAt.toISOString()
      }))
    };

    const rawConfig = {
      solverType: job.config.solverType,
      populationSize: job.config.populationSize,
      generations: job.config.generations
    };

    const data = JSON.parse(JSON.stringify(rawData));
    const config = JSON.parse(JSON.stringify(rawConfig));

    // 3. Delegate CPU-heavy calculation to worker thread (Non-blocking)
    const workerResult = await runSolverWorker(data, config);

    // 4. Save generated sessions as Defense Council drafts
    const savedCouncilIds = [];
    const generatedSchedule = workerResult.schedule || [];

    for (const session of generatedSchedule) {
      // Skip empty sessions
      if (!session.projects || session.projects.length === 0) continue;

      const dateObj = new Date(session.timeSlot.startAt);
      const formattedDate = dateObj.toLocaleDateString("vi-VN");
      
      const defenseCouncil = new DefenseCouncil({
        name: `Hội đồng Phòng ${session.room} - ${formattedDate}`,
        description: `Hội đồng bảo vệ tự động lập lịch ngày ${formattedDate}`,
        defenseDate: dateObj,
        room: session.room,
        members: session.councilMembers.map(m => ({
          teacher: m.teacher,
          role: m.role,
          weight: m.weight
        })),
        projects: session.projects.map(pItem => ({
          project: pItem.project._id,
          reviewer: pItem.reviewer,
          reviewerWeight: 1.5,
          status: "assigned"
        })),
        status: "draft" // Save in draft status first (Admin reviews it)
      });

      const savedCouncil = await defenseCouncil.save();
      savedCouncilIds.push(savedCouncil._id);

      // Link projects to the generated council
      for (const pItem of session.projects) {
        await Project.findByIdAndUpdate(pItem.project._id, {
          councilId: savedCouncil._id,
          defenseStatus: "scheduled"
        });
      }
    }

    // 5. Update Job record to completed
    job.status = "completed";
    job.result = {
      generatedCouncils: savedCouncilIds,
      fitnessScore: workerResult.fitnessScore,
      executionTimeMs: workerResult.executionTimeMs
    };
    await job.save();

  } catch (error) {
    console.error(`[Scheduler Service] Job ${jobId} failed:`, error);
    job.status = "failed";
    job.error = error.message || "An unexpected error occurred during execution.";
    await job.save();
  }
};
