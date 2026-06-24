import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
}, { collection: "users" });

const User = mongoose.model("User", userSchema);

const run = async () => {
  try {
    console.log("Connecting to MongoDB:", MONGO_URL);
    await mongoose.connect(MONGO_URL);
    console.log("Connected successfully!");

    const users = await User.find({});
    console.log(`Found ${users.length} users in database:`);
    for (const u of users) {
      console.log(`- Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
    }
  } catch (error) {
    console.error("Database connection/query error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
};

void run();
