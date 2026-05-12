import path from "path";
import ErrorHandler from "../middleware/error.js";
import { DefenseCouncil } from "../models/defenseCouncil.js";
import { Project } from "../models/project.js";
import { User } from "../models/user.js";
import * as notificationServices from "./notificationServices.js";
import * as projectServices from "./projectServices.js";
import {
  ensureProjectEditable,
  requireProjectByUser,
} from "./workflowProjectServices.js";
import {
  getProjectMemberIds,
  isSameId,
  roundScore,
  toIdString,
} from "../utils/workflowHelpers.js";
import { createSimplePdf } from "../utils/simplePdf.js";

const DEFAULT_ROLE_WEIGHTS = {
  chairman: 1.5,
  secretary: 1,
  member: 1,
};

const getCouncilProjectItem = (council, projectId) => {
  const projectItem = council.projects.find((item) =>
    isSameId(item.project, projectId),
  );

  if (!projectItem) {
    throw new ErrorHandler("Project has not been assigned to this council", 404);
  }

  return projectItem;
};

const getChairmanMember = (council) =>
  council.members.find((member) => member.role === "chairman");

const getRequiredScorers = (council, projectItem) => {
  const reviewerId = toIdString(projectItem.reviewer);
  const councilScorers = council.members.map((member) => {
    const teacherId = toIdString(member.teacher);
    if (teacherId === reviewerId) {
      return {
        teacher: teacherId,
        role: "reviewer",
        weight: projectItem.reviewerWeight,
      };
    }

    return {
      teacher: teacherId,
      role: member.role,
      weight: member.weight,
    };
  });

  if (!councilScorers.some((item) => item.teacher === reviewerId)) {
    councilScorers.push({
      teacher: reviewerId,
      role: "reviewer",
      weight: projectItem.reviewerWeight,
    });
  }

  return councilScorers;
};

const computeWeightedAverage = (council, projectItem) => {
  const required = getRequiredScorers(council, projectItem);
  const weightMap = new Map(
    required.map((item) => [item.teacher, item.weight]),
  );

  let weightedTotal = 0;
  let totalWeight = 0;

  for (const score of projectItem.scores) {
    const teacherId = toIdString(score.teacher);
    const weight = weightMap.get(teacherId);
    if (!weight) continue;
    weightedTotal += score.score * weight;
    totalWeight += weight;
  }

  if (!totalWeight) return null;
  return roundScore(weightedTotal / totalWeight, 2);
};

const ensureCouncilMembersValid = async (members) => {
  if (!Array.isArray(members) || members.length === 0) {
    throw new ErrorHandler("Council members are required", 400);
  }

  const chairmanCount = members.filter((member) => member.role === "chairman").length;
  const secretaryCount = members.filter((member) => member.role === "secretary").length;
  if (chairmanCount !== 1) {
    throw new ErrorHandler("Council must have exactly one chairman", 400);
  }
  if (secretaryCount !== 1) {
    throw new ErrorHandler("Council must have exactly one secretary", 400);
  }

  const uniqueTeacherIds = new Set(members.map((member) => toIdString(member.teacher)));
  if (uniqueTeacherIds.size !== members.length) {
    throw new ErrorHandler("Council members must not contain duplicate teachers", 400);
  }

  const teacherCount = await User.countDocuments({
    _id: { $in: Array.from(uniqueTeacherIds) },
    role: "Teacher",
  });

  if (teacherCount !== uniqueTeacherIds.size) {
    throw new ErrorHandler("All council members must be teachers", 400);
  }
};

export const createCouncil = async (payload) => {
  const members = (payload.members || []).map((member) => ({
    teacher: member.teacher,
    role: member.role,
    weight: Number(member.weight || DEFAULT_ROLE_WEIGHTS[member.role] || 1),
  }));

  await ensureCouncilMembersValid(members);

  return DefenseCouncil.create({
    name: payload.name,
    description: payload.description || "",
    defenseDate: payload.defenseDate || null,
    room: payload.room || "",
    members,
    status: "draft",
  });
};

export const getAdminCouncils = async () => {
  return DefenseCouncil.find()
    .populate("members.teacher", "name email department")
    .populate({
      path: "projects.project",
      select: "title status groupName supervisor defenseFinalScore",
      populate: {
        path: "supervisor",
        select: "name email",
      },
    })
    .populate("projects.reviewer", "name email")
    .sort({ createdAt: -1 });
};

export const deleteCouncil = async (councilId) => {
  const council = await DefenseCouncil.findById(councilId)
    .populate("projects.project", "title status defenseStatus");

  if (!council) {
    throw new ErrorHandler("Council not found", 404);
  }

  const finalizedProject = (council.projects || []).find(
    (item) => item.status === "done",
  );

  if (finalizedProject) {
    throw new ErrorHandler(
      "Cannot delete a council that already contains finalized defense results",
      400,
    );
  }

  const assignedProjectIds = (council.projects || [])
    .map((item) => item.project?._id || item.project)
    .filter(Boolean);

  if (assignedProjectIds.length > 0) {
    await Project.updateMany(
      { _id: { $in: assignedProjectIds } },
      {
        $set: {
          councilId: null,
          reviewerId: null,
        },
      },
    );

    const projects = await Project.find({ _id: { $in: assignedProjectIds } });
    await Promise.all(
      projects.map(async (project) => {
        if (project.status === "done" || project.archiveLocked) {
          return;
        }

        project.defenseStatus = project.selectedSchedule?.slotId
          ? "scheduled"
          : "in_progress";
        await project.save();
      }),
    );
  }

  await council.deleteOne();
  return council;
};

export const assignProjectToCouncil = async ({
  councilId,
  projectId,
}) => {
  const council = await DefenseCouncil.findById(councilId)
    .populate("members.teacher", "name email");
  if (!council) {
    throw new ErrorHandler("Council not found", 404);
  }

  const project = await projectServices.getProjectById(projectId);
  ensureProjectEditable(project);

  if (project.status !== "completed") {
    throw new ErrorHandler(
      "Only projects completed by the supervisor can be assigned to a council",
      400,
    );
  }

  if (project.councilId) {
    throw new ErrorHandler("Project has already been assigned to a council", 400);
  }

  const councilTeacherIds = council.members.map((member) => toIdString(member.teacher));
  if (councilTeacherIds.includes(toIdString(project.supervisor))) {
    throw new ErrorHandler(
      "Supervisor of the project cannot be a member of the assigned council",
      400,
    );
  }

  council.projects.push({
    project: project._id,
    reviewer: null,
    reviewerWeight: 1.5,
    status: "assigned",
  });
  council.status = "active";
  await council.save();

  project.councilId = council._id;
  project.reviewerId = null;
  project.defenseStatus = project.selectedSchedule?.slotId ? "scheduled" : "in_progress";
  await project.save();

  await Promise.all(
    getProjectMemberIds(project).map((memberId) =>
      notificationServices.notifyUser(
        memberId,
        `De tai "${project.title}" da duoc gan vao hoi dong ${council.name}. Chu tich se phan cong giang vien nhan xet sau.`,
        "defense",
        "/student/defense",
        "medium",
      ),
    ),
  );

  return council;
};

export const assignReviewerByChairman = async ({
  teacherId,
  councilId,
  projectId,
  reviewerId,
  reviewerWeight,
}) => {
  const council = await DefenseCouncil.findById(councilId);
  if (!council) {
    throw new ErrorHandler("Council not found", 404);
  }

  const chairman = getChairmanMember(council);
  if (!chairman || !isSameId(chairman.teacher, teacherId)) {
    throw new ErrorHandler("Only the chairman can assign the reviewer", 403);
  }

  const projectItem = getCouncilProjectItem(council, projectId);
  const project = await projectServices.getProjectById(projectId);
  const reviewer = await User.findOne({ _id: reviewerId, role: "Teacher" });

  if (!reviewer) {
    throw new ErrorHandler("Reviewer must be a teacher", 400);
  }
  if (isSameId(reviewer._id, project.supervisor)) {
    throw new ErrorHandler("Reviewer cannot be the project supervisor", 400);
  }

  projectItem.reviewer = reviewer._id;
  projectItem.reviewerWeight = Number(reviewerWeight || 1.5);
  await council.save();

  project.reviewerId = reviewer._id;
  await project.save();

  await notificationServices.notifyUser(
    reviewer._id,
    `Ban duoc chu tich hoi dong phan cong lam giang vien nhan xet cho de tai "${project.title}".`,
    "defense",
    "/teacher/defense",
    "medium",
  );

  return council;
};

export const getTeacherCouncils = async (teacherId) => {
  return DefenseCouncil.find({
    $or: [
      { "members.teacher": teacherId },
      { "projects.reviewer": teacherId },
    ],
  })
    .populate("members.teacher", "name email department")
    .populate({
      path: "projects.project",
      select: "title status groupName supervisor defenseFinalScore",
      populate: {
        path: "supervisor",
        select: "name email",
      },
    })
    .populate("projects.reviewer", "name email")
    .sort({ createdAt: -1 });
};

export const getStudentCouncilBoard = async (studentId) => {
  const project = await requireProjectByUser(studentId);

  if (!project.councilId) {
    return { project, council: null };
  }

  const council = await DefenseCouncil.findById(project.councilId)
    .populate("members.teacher", "name email department")
    .populate({
      path: "projects.project",
      select: "title status groupName defenseFinalScore supervisor",
      populate: {
        path: "supervisor",
        select: "name email",
      },
    })
    .populate("projects.reviewer", "name email");

  return { project, council };
};

export const submitCouncilScore = async ({
  teacherId,
  councilId,
  projectId,
  score,
  comment,
}) => {
  const numericScore = Number(score);
  if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
    throw new ErrorHandler("Score must be a number between 0 and 100", 400);
  }

  const council = await DefenseCouncil.findById(councilId);
  if (!council) {
    throw new ErrorHandler("Council not found", 404);
  }

  const projectItem = getCouncilProjectItem(council, projectId);
  if (projectItem.status === "done") {
    throw new ErrorHandler("Final score has already been locked by the chairman", 400);
  }
  if (!projectItem.reviewer) {
    throw new ErrorHandler("Chairman must assign a reviewer before scoring starts", 400);
  }

  const councilMember = council.members.find((member) =>
    isSameId(member.teacher, teacherId),
  );
  const isReviewer = isSameId(projectItem.reviewer, teacherId);

  if (!councilMember && !isReviewer) {
    throw new ErrorHandler("Teacher is not allowed to score this project", 403);
  }

  const role = isReviewer ? "reviewer" : councilMember.role;
  const weight = isReviewer ? projectItem.reviewerWeight : councilMember.weight;

  const existingIndex = projectItem.scores.findIndex((item) =>
    isSameId(item.teacher, teacherId),
  );

  const scoreEntry = {
    teacher: teacherId,
    role,
    weight,
    score: numericScore,
    comment: comment || "",
    submittedAt: new Date(),
  };

  if (existingIndex >= 0) {
    projectItem.scores[existingIndex] = scoreEntry;
  } else {
    projectItem.scores.push(scoreEntry);
  }

  projectItem.weightedAverage = computeWeightedAverage(council, projectItem);
  projectItem.status = "scoring";
  await council.save();

  return council;
};

export const submitReviewerForm = async ({
  teacherId,
  councilId,
  projectId,
  summary,
  strengths,
  concerns,
  recommendation,
}) => {
  const council = await DefenseCouncil.findById(councilId)
    .populate("projects.project", "title groupName");
  if (!council) {
    throw new ErrorHandler("Council not found", 404);
  }

  const projectItem = getCouncilProjectItem(council, projectId);
  if (!projectItem.reviewer) {
    throw new ErrorHandler("Reviewer has not been assigned yet", 400);
  }
  if (!isSameId(projectItem.reviewer, teacherId)) {
    throw new ErrorHandler("Only the assigned reviewer can submit this form", 403);
  }

  const project = projectItem.project;
  const pdfPath = await createSimplePdf({
    fileName: `reviewer-form-${project._id}-${Date.now()}.pdf`,
    title: `Reviewer Form - ${project.groupName || project.title}`,
    sections: [
      { label: "Summary", value: summary },
      { label: "Strengths", value: strengths },
      { label: "Concerns", value: concerns },
      { label: "Recommendation", value: recommendation },
    ],
  });

  projectItem.reviewerForm = {
    summary,
    strengths,
    concerns,
    recommendation,
    pdfUrl: pdfPath,
    exportedAt: new Date(),
  };

  await council.save();
  return council;
};

export const finalizeCouncilProject = async ({
  teacherId,
  councilId,
  projectId,
  chairComment,
}) => {
  const council = await DefenseCouncil.findById(councilId);
  if (!council) {
    throw new ErrorHandler("Council not found", 404);
  }

  const chairman = getChairmanMember(council);
  if (!chairman || !isSameId(chairman.teacher, teacherId)) {
    throw new ErrorHandler("Only the chairman can finalize the score", 403);
  }

  const projectItem = getCouncilProjectItem(council, projectId);
  if (projectItem.status === "done") {
    throw new ErrorHandler("This project has already been finalized", 400);
  }
  if (!projectItem.reviewer) {
    throw new ErrorHandler("Reviewer must be assigned before finalization", 400);
  }

  const requiredScorers = getRequiredScorers(council, projectItem);
  const submittedIds = new Set(projectItem.scores.map((item) => toIdString(item.teacher)));

  for (const scorer of requiredScorers) {
    if (!submittedIds.has(scorer.teacher)) {
      throw new ErrorHandler("Not all required scorers have submitted their score", 400);
    }
  }

  if (!projectItem.reviewerForm?.pdfUrl) {
    throw new ErrorHandler("Reviewer form must be submitted before finalizing", 400);
  }

  projectItem.weightedAverage = computeWeightedAverage(council, projectItem);
  projectItem.status = "done";
  projectItem.finalizedBy = teacherId;
  projectItem.finalizedAt = new Date();
  projectItem.chairComment = chairComment || "";
  await council.save();

  const project = await Project.findById(projectId)
    .populate("student", "name email")
    .populate("members", "name email");

  project.defenseFinalScore = projectItem.weightedAverage;
  project.defenseStatus = "done";
  project.status = "done";
  project.archiveLocked = true;
  project.archivedAt = new Date();
  await project.save();

  const allProjectsDone =
    council.projects.length > 0 &&
    council.projects.every((item) => item.status === "done");
  if (allProjectsDone) {
    council.status = "done";
    await council.save();
  }

  const scoreText = projectItem.weightedAverage ?? "N/A";
  await Promise.all(
    getProjectMemberIds(project).map((memberId) =>
      notificationServices.notifyUser(
        memberId,
        `Chuc mung. De tai "${project.title}" da hoan tat bao ve voi diem tong ket ${scoreText}. Tai lieu cua nhom da duoc khoa de luu tru.`,
        "defense",
        "/student/defense",
        "low",
      ),
    ),
  );

  return council;
};

export const getReviewerFormDownload = async ({ councilId, projectId, teacherId, studentId }) => {
  const council = await DefenseCouncil.findById(councilId);
  if (!council) {
    throw new ErrorHandler("Council not found", 404);
  }

  const projectItem = getCouncilProjectItem(council, projectId);
  const project = await projectServices.getProjectById(projectId);

  const isCouncilTeacher = council.members.some((member) =>
    isSameId(member.teacher, teacherId),
  );
  const isReviewer = isSameId(projectItem.reviewer, teacherId);
  const isStudentMember = studentId
    ? getProjectMemberIds(project).includes(toIdString(studentId))
    : false;

  if (!isCouncilTeacher && !isReviewer && !isStudentMember) {
    throw new ErrorHandler("Not authorized to download reviewer form", 403);
  }

  if (!projectItem.reviewerForm?.pdfUrl) {
    throw new ErrorHandler("Reviewer form PDF has not been generated yet", 404);
  }

  return {
    filePath: projectItem.reviewerForm.pdfUrl,
    fileName: path.basename(projectItem.reviewerForm.pdfUrl),
  };
};
