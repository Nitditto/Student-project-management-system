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
    await mongoose.connect(mongoUrl, {
      dbName: "fyp_management_system"
    });
    console.log("Connected successfully!");

    const email = "admin@gmail.com";
    const newPassword = "12345678"; // 8 characters (matches schema minLength restriction)

    // Find the admin user
    let admin = await User.findOne({ email, role: "Admin" });

    if (!admin) {
      console.log(`Admin account ${email} not found. Creating a new one...`);
      admin = new User({
        name: "System Admin",
        email: email,
        password: newPassword,
        role: "Admin"
      });
      await admin.save();
      console.log("Admin account created successfully!");
    } else {
      console.log(`Found Admin account: ${admin.email}. Modifying password...`);
      admin.password = newPassword; // Triggers the pre-save bcrypt hash hook
      await admin.save();
      console.log("Admin password updated successfully!");
    }

    console.log(`\nNew Admin Credentials:`);
    console.log(`- Email: ${email}`);
    console.log(`- Password: ${newPassword}`);

  } catch (err) {
    console.error("Error modifying admin database:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
  }
};

void run();
