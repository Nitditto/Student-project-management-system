import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/user.js";

dotenv.config();

const run = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error("MONGO_URL not found in .env");
      process.exit(1);
    }

    await mongoose.connect(mongoUrl, { dbName: "fyp_management_system" });
    const teacherCount = await User.countDocuments({ role: "Teacher" });
    const studentCount = await User.countDocuments({ role: "Student" });
    const adminCount = await User.countDocuments({ role: "Admin" });
    console.log(`Teacher count: ${teacherCount}`);
    console.log(`Student count: ${studentCount}`);
    console.log(`Admin count: ${adminCount}`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
};

void run();
