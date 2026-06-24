import mongoose from "mongoose";
import { config } from "dotenv";

config();

async function run() {
  const mongoUrl = process.env.MONGO_URL;
  console.log("Connecting to:", mongoUrl);
  await mongoose.connect(mongoUrl, { dbName: "fyp_management_system" });
  
  try {
    const db = mongoose.connection.db;
    const collection = db.collection("projects");
    
    console.log("Finding projects with group: null...");
    const count = await collection.countDocuments({ group: null });
    console.log(`Found ${count} projects with group: null.`);
    
    if (count > 0) {
      console.log("Unsetting group field from those projects...");
      const result = await collection.updateMany({ group: null }, { $unset: { group: "" } });
      console.log(`Updated ${result.modifiedCount} projects.`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
