import ErrorHandler from "../middleware/error.js";
import { Project } from "../models/project.js";
export const getStudentProject = async (studentId) => {
  return await Project.findOne({ student: studentId }).sort({ createdAt: -1 });
};

export const createProject = async (projectData) => {
  const project = await Project.create(projectData);
  return project;
};

export const getProjectById = async (id) => {
  const project = await Project.findById(id)
    .populate("student", "name email")
    .populate("supervisor", "name email")
    .populate("feedback.supervisorId", "name email");
  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }
  return project;
};

export const addFilesToProject = async (projectId, files) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }
  const fileMetaData = files.map((file) => ({
    fileType: file.mimetype,
    fileUrl: file.path,
    originalName: file.originalname,
    uploadAt: new Date(),
  }));

  project.files.push(...fileMetaData);
  await project.save();
  return project;
};
export const getAllProjects = async () => {
  const projects = await Project.find()
    .populate("student", "name email")
    .populate("supervisor", "name email")
    .sort({ createdAt: -1 });
  return projects;
};

export const markComplete = async (projectId) => {
  const project = await Project.findByIdAndUpdate(
    projectId,
    { status: "completed" },
    { new: true, runValidators: true },
  )
    .populate("student", "name email")
    .populate("supervisor", "name email");
  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }
  return project;
};

export const addFeedback = async (
  projectId,
  supervisorId,
  message,
  title,
  type,
) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }
  project.feedback.push({
    supervisorId,
    message,
    title,
    type,
  });

  await project.save();
  const latestProject = project.feedback[project.feedback.length - 1];
  return { project, latestProject };
};

export const getProjectsBySupervisor = async (supervisorId) => {
  return await getAllProjects({ supervisor: supervisorId });
};

export const updateProject = async (projectId, updatedData) => {
  const project = await Project.findByIdAndUpdate(projectId, updatedData, {
    new: true,
    runValidators: true,
  })
    .populate("student", "name email")
    .populate("supervisor", "name email");
  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }
  return project;
};