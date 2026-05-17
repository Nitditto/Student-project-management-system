import cron from "node-cron";
import { Project } from "../models/project.js";
import { Deadline } from "../models/deadline.js";
import { Submission } from "../models/submission.js";

export const initCronJobs = () => {
  // Run daily at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    try {
      console.log("Running evaluator cron job...");
      const projects = await Project.find({ status: "approved" });

      for (const project of projects) {
        if (!project.supervisor) continue;

        const deadlines = await Deadline.find({ teacherId: project.supervisor });
        const totalDeadlines = deadlines.length;

        if (totalDeadlines === 0) continue;

        const submissions = await Submission.find({ 
          groupId: project._id, 
          status: "SUBMITTED" 
        });

        const submittedCount = submissions.length;
        const completionRate = (submittedCount / totalDeadlines) * 100;

        if (completionRate < 40) {
          project.status = "rejected"; 
          await project.save();
          console.log(`Project ${project._id} marked as failed (rejected) due to low completion rate (${completionRate}%)`);
        }
      }
    } catch (error) {
      console.error("Error in evaluator cron job:", error);
    }
  });
};
