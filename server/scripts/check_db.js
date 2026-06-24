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

    console.log("Connecting to Database...");
    await mongoose.connect(mongoUrl);
    console.log("Connected successfully!");

    // Search for all Admin users
    const admins = await User.find({ role: "Admin" });
    if (admins.length > 0) {
      console.log(`\nFound ${admins.length} Admin account(s) in the database:`);
      admins.forEach(admin => {
        console.log(`- Email: ${admin.email} | Name: ${admin.name}`);
      });
      console.log("\nNote: Passwords are encrypted in bcrypt. If you forgot the password, you can reset it or use register api.");
    } else {
      console.log("\nNo Admin accounts found! Creating a default admin account...");
      
      const newAdmin = new User({
        name: "System Admin",
        email: "admin@gmail.com",
        password: "adminpassword123", // Will be automatically hashed by pre-save hook
        role: "Admin"
      });

      await newAdmin.save();
      console.log("Default admin account created successfully!");
      console.log("- Email: admin@gmail.com");
      console.log("- Password: adminpassword123");
    }

  } catch (err) {
    console.error("Error checking/seeding database:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
  }
};

void run();
