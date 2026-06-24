import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/user.js";
import { Project } from "../models/project.js";

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

    const teacherCount = await User.countDocuments({ role: "Teacher" });
    const studentCount = await User.countDocuments({ role: "Student" });
    const projectCount = await Project.countDocuments({});

    console.log(`\nStatistics:`);
    console.log(`- Teachers: ${teacherCount}`);
    console.log(`- Students: ${studentCount}`);
    console.log(`- Projects: ${projectCount}`);

    const teachers = await User.find({ role: "Teacher" });
    console.log("\nTeachers in system:");
    teachers.forEach(t => {
      console.log(`- ${t.name} (${t.email}) | Active: ${t.isActive} | Experties: ${JSON.stringify(t.experties)}`);
    });

    const projects = await Project.find({}).populate("supervisor", "name").populate("student", "name");
    console.log("\nProjects in system:");
    projects.forEach(p => {
      console.log(`- Title: ${p.title} | Status: ${p.status} | Supervisor: ${p.supervisor?.name || "None"} | Student: ${p.student?.name || "None"}`);
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
};

void run();
