import mongoose from "mongoose";
import { config } from "dotenv";

config(); // Loads .env from current working directory

async function run() {
  const mongoUrl = process.env.MONGO_URL;
  console.log("Connecting to:", mongoUrl);
  await mongoose.connect(mongoUrl, { dbName: "fyp_management_system" });
  
  try {
    const db = mongoose.connection.db;
    const collection = db.collection("projects");
    
    console.log("Fetching indexes...");
    const indexes = await collection.indexes();
    console.log("Current indexes:", JSON.stringify(indexes, null, 2));
    
    // Find index on 'group'
    const groupIndex = indexes.find(idx => idx.key.group !== undefined);
    if (groupIndex) {
      console.log("Dropping index:", groupIndex.name);
      await collection.dropIndex(groupIndex.name);
      console.log("Index dropped successfully!");
    } else {
      console.log("No index on 'group' found.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
