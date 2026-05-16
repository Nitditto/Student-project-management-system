import { Project } from "../models/project.js";
import { Deadline } from "../models/deadline.js";
import { Submission } from "../models/submission.js";
import { Notification } from "../models/notification.js";

const runEvaluation = async () => {
  const groups = await Project.find({ supervisor: { $ne: null } }).select("_id supervisor student members status");
  for (const group of groups) {
    const total = await Deadline.countDocuments({ teacherId: group.supervisor });
    if (!total) continue;
    const submitted = await Submission.countDocuments({ groupId: group._id, status: "SUBMITTED" });
    if ((submitted / total) * 100 < 40 && group.status !== "rejected") {
      group.status = "rejected";
      await group.save();
      const users = [group.student, ...(group.members || [])].filter(Boolean);
      if (users.length) await Notification.insertMany(users.map((u) => ({ user: u, type: "warning", priority: "high", message: "Nhóm bị auto-fail do tỷ lệ nộp deadline < 40%" })));
    }
  }
};

export const startEvaluatorCron = () => {
  const dailyMs = 24 * 60 * 60 * 1000;
  setTimeout(() => {
    runEvaluation().catch(console.error);
    setInterval(() => runEvaluation().catch(console.error), dailyMs);
  }, 5_000);
};
