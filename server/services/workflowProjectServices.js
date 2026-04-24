import ErrorHandler from "../middleware/error.js";
import { Project } from "../models/project.js";
import { User } from "../models/user.js";
import { getProjectMemberIds, isProjectMember, toIdString } from "../utils/workflowHelpers.js";

export const getProjectByUser = async (userId) => {
  return Project.findOne({
    $or: [{ student: userId }, { members: userId }],
  })
    .sort({ createdAt: -1 })
    .populate("student", "name email")
    .populate("supervisor", "name email department")
    .populate("members", "name email department");
};

export const requireProjectByUser = async (userId) => {
  const project = await getProjectByUser(userId);
  if (!project) {
    throw new ErrorHandler("Project not found for this student", 404);
  }
  return project;
};

export const ensureTeacherOwnsProject = (project, teacherId) => {
  if (!project?.supervisor || toIdString(project.supervisor) !== toIdString(teacherId)) {
    throw new ErrorHandler("Teacher is not assigned to this project", 403);
  }
};

export const ensureProjectMember = (project, userId) => {
  if (!isProjectMember(project, userId)) {
    throw new ErrorHandler("User is not a member of this project", 403);
  }
};

export const ensureProjectEditable = (project) => {
  if (project?.archiveLocked) {
    throw new ErrorHandler(
      "Project has been archived after final defense and can no longer be edited",
      400,
    );
  }
};

export const syncProjectMembers = async (project) => {
  const memberIds = getProjectMemberIds(project);
  await User.updateMany(
    { _id: { $in: memberIds } },
    {
      project: project._id,
      supervisor: project.supervisor || null,
    },
  );
};
