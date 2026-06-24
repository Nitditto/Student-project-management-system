import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/user.js";
import { Project } from "../models/project.js";
import { SchedulerJob } from "../models/schedulerJob.js";
import { executeSchedulerJob } from "../services/scheduler/schedulerService.js";

dotenv.config();

const run = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error("MONGO_URL not found in .env");
      process.exit(1);
    }

    console.log("Connecting to Database...");
    await mongoose.connect(mongoUrl, {
      dbName: "fyp_management_system"
    });
    console.log("Connected successfully!");

    // Fetch up to 5 approved projects
    const dbProjects = await Project.find({ status: "approved" }).limit(5);
    // Fetch up to 5 teachers
    const dbTeachers = await User.find({ role: "Teacher", isActive: true }).limit(5);

    if (dbProjects.length === 0 || dbTeachers.length < 3) {
      console.error("Insufficient test data! Need at least 1 approved project and 3 active teachers.");
      process.exit(1);
    }

    const projectIds = dbProjects.map(p => p._id);
    const teacherIds = dbTeachers.map(t => t._id);

    console.log(`Setting up job with ${projectIds.length} projects and ${teacherIds.length} teachers...`);

    const rooms = ["Room 101", "Room 102"];
    const timeSlots = [
      { startAt: new Date("2026-06-22T08:00:00Z"), endAt: new Date("2026-06-22T11:30:00Z") },
      { startAt: new Date("2026-06-22T13:30:00Z"), endAt: new Date("2026-06-22T17:00:00Z") }
    ];

    const job = new SchedulerJob({
      config: {
        projectIds,
        teacherIds,
        rooms,
        timeSlots,
        solverType: "genetic_algorithm",
        populationSize: 50,
        generations: 50
      }
    });

    await job.save();
    console.log(`Job created with ID: ${job._id}. Starting execution...`);

    await executeSchedulerJob(job._id);

    // Fetch the updated job
    const updatedJob = await SchedulerJob.findById(job._id).populate("result.generatedCouncils");
    console.log("\n--- Execution Finished ---");
    console.log(`Status: ${updatedJob.status}`);
    console.log(`Error: ${updatedJob.error}`);
    console.log(`Fitness Score: ${updatedJob.result?.fitnessScore}`);
    console.log(`Execution Time: ${updatedJob.result?.executionTimeMs}ms`);
    console.log(`Generated Councils count: ${updatedJob.result?.generatedCouncils?.length}`);

    if (updatedJob.result?.generatedCouncils) {
      updatedJob.result.generatedCouncils.forEach((council, idx) => {
        console.log(`\nCouncil ${idx + 1}: ${council.name}`);
        console.log(`- Room: ${council.room}`);
        console.log(`- Date: ${council.defenseDate}`);
        console.log(`- Members: ${council.members.map(m => m.role + ":" + m.teacher).join(", ")}`);
        console.log(`- Projects: ${council.projects.map(p => p.project).join(", ")}`);
      });
    }

    // Discard the test job draft to clean up database
    console.log("\nCleaning up test councils and job from database...");
    const councilIds = updatedJob.result?.generatedCouncils?.map(c => c._id) || [];
    if (councilIds.length > 0) {
      await Project.updateMany(
        { councilId: { $in: councilIds } },
        { $set: { councilId: null, defenseStatus: "not_started" } }
      );
      const delCouncils = await mongoose.model("DefenseCouncil").deleteMany({ _id: { $in: councilIds } });
      console.log(`Deleted ${delCouncils.deletedCount} test councils.`);
    }
    await SchedulerJob.findByIdAndDelete(job._id);
    console.log("Deleted test job.");

  } catch (err) {
    console.error("Simulation failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
};

void run();
