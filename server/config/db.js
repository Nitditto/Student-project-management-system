import mongoose from "mongoose";

export const connectDB = async () => {
  mongoose
    .connect(process.env.MONGO_URL, {
      dbName: "fyp_management_system",
    })
    .then(() => console.log("Database Connected"))
    .catch((err) => console.error(err));
};
