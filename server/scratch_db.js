import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/user.js";
import { Project } from "./models/project.js";
import { SupervisorRequest } from "./models/supervisorRequest.js";

dotenv.config();

const run = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/fyp_management_system";
    await mongoose.connect(mongoUrl, {
      dbName: "fyp_management_system"
    });
    console.log("Connected to MongoDB successfully");

    const pendingRequests = await SupervisorRequest.find({ status: "pending" })
      .populate("student")
      .populate("supervisor")
      .populate("project");

    console.log(`\n=== PENDING REQUEST DETAILS (${pendingRequests.length}) ===`);
    for (const r of pendingRequests) {
      console.log(`Request ID: ${r._id}`);
      console.log(`  Student: ${r.student?.name} (ID: ${r.student?._id})`);
      console.log(`  Supervisor/Teacher: ${r.supervisor?.name || r.teacher?.name || "None"} (ID: ${r.supervisor?._id || r.teacher?._id || r.supervisor || r.teacher})`);
      console.log(`  Project: ${r.project?.title || "None"} (ID: ${r.project?._id || "None"}, Supervisor: ${r.project?.supervisor})`);
      console.log(`  Group: ${r.group}`);
      
      // Look up group or project manually to see details
      if (r.project) {
        const proj = await Project.findById(r.project._id || r.project);
        console.log(`  Manually fetched project details: Supervisor ID=${proj?.supervisor}, Status=${proj?.status}`);
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error running script:", error);
  }
};

run();
