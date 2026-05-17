import ErrorHandler from "../middleware/error.js";
import { DefenseCouncil } from "../models/defenseCouncil.js";
import { Project } from "../models/project.js";
import { ProjectAssessment } from "../models/projectAssessment.js";
import * as notificationServices from "./notificationServices.js";
import * as assessmentTemplateService from "./assessmentTemplateService.js";
import {
  buildEmptyCloResults,
  buildMilestonesFromTemplate,
  buildSubmissionIdentity,
  computeFinalCloResults,
  computeIndividualFinalScore,
  computeIndividualM6FromSubmission,
  computeM6AggregateFromStudents,
  computeMilestoneAggregate,
  computePassStatus,
  computeTeamFinalScore,
  getTemplateMilestones,
} from "./assessmentScoringService.js";
import { computeQaEvidenceSummary } from "./assessmentQaService.js";
import {
  getProjectMemberIds,
  isSameId,
  roundScore,
  toIdString,
} from "../utils/workflowHelpers.js";
import { resolveM6SubmissionTargets } from "../utils/m6SubmissionSync.js";
import {
  ensureProjectEditable,
  ensureProjectMember,
  ensureTeacherOwnsProject,
  requireProjectByUser,
} from "./workflowProjectServices.js";

const SCORE_ROLE_LABELS = {
  supervisor: "supervisor",
  reviewer: "reviewer",
  chairman: "chairman",
  secretary: "secretary",
  member: "member",
  peer: "peer",
  student: "student",
};

const normalizeEvidenceFiles = (
  files = [],
  uploadedBy,
  defaultKind = "supporting-file",
) =>
  (files || []).map((file) => ({
    kind: defaultKind,
    label: file.originalname,
    fileUrl: file.path,
    originalName: file.originalname,
    uploadedBy,
    uploadedAt: new Date(),
  }));

const appendEvidenceRefs = (target, refs = []) => {
  target.push(...refs);
  return Array.from(
    new Map(
      target.map((item) => [
        `${item.kind}:${item.fileUrl || item.label}`,
        item,
      ]),
    ).values(),
  );
};

const getMilestoneDoc = (assessment, milestoneCode) => {
  const milestone = (assessment.milestones || []).find(
    (item) => item.code === milestoneCode,
  );
  if (!milestone) {
    throw new ErrorHandler("Milestone not found in project assessment", 404);
  }
  return milestone;
};

const ensureTeacherCanSubmitMilestone = async ({
  project,
  assessment,
  milestoneCode,
  teacherId,
}) => {
  if (milestoneCode === "M5") {
    if (!project.councilId) {
      throw new ErrorHandler("Project has not been assigned to a council", 400);
    }

    const council = await DefenseCouncil.findById(project.councilId);
    if (!council) {
      throw new ErrorHandler("Council not found", 404);
    }

    const projectItem = (council.projects || []).find((item) =>
      isSameId(item.project, project._id),
    );
    const councilMember = (council.members || []).find((member) =>
      isSameId(member.teacher, teacherId),
    );
    const isReviewer = isSameId(projectItem?.reviewer, teacherId);

    if (!councilMember && !isReviewer) {
      throw new ErrorHandler(
        "Teacher is not allowed to submit M5 for this project",
        403,
      );
    }

    const m4 = getMilestoneDoc(assessment, "M4");
    if (m4.componentScore5 === null) {
      throw new ErrorHandler(
        "M4 report review must be available before M5 defense scoring",
        400,
      );
    }

    return {
      role: isReviewer ? "reviewer" : councilMember.role,
      source: isReviewer ? "reviewer" : councilMember.role,
      weight: isReviewer
        ? Number(projectItem?.reviewerWeight || 1.5)
        : Number(councilMember.weight || 1),
      council,
      projectItem,
    };
  }

  if (["M1", "M2", "M3", "M4"].includes(milestoneCode)) {
    ensureTeacherOwnsProject(project, teacherId);
    return {
      role: milestoneCode === "M4" ? "supervisor" : "supervisor",
      source: "supervisor",
      weight: 1,
    };
  }

  if (milestoneCode === "M6") {
    ensureTeacherOwnsProject(project, teacherId);
    return {
      role: "supervisor",
      source: "supervisor",
      weight: 1,
    };
  }

  throw new ErrorHandler("Unsupported milestone code", 400);
};

const recomputeAssessment = async ({
  assessment,
  template,
  project,
  council = null,
}) => {
  for (const milestone of assessment.milestones || []) {
    const recomputed =
      milestone.code === "M6"
        ? computeM6AggregateFromStudents({ assessment, template })
        : computeMilestoneAggregate({ milestone, template });
    milestone.aggregatedCloScores = recomputed.aggregatedCloScores;
    milestone.componentScore5 = recomputed.componentScore5;
    milestone.componentScore10 = recomputed.componentScore10;
    milestone.status =
      milestone.status === "locked" && assessment.status === "finalized"
        ? "locked"
        : recomputed.status;
    milestone.lastRecomputedAt = new Date();
  }

  const m6Aggregate = computeM6AggregateFromStudents({ assessment, template });
  const teamCloResults = computeFinalCloResults({
    assessment,
    template,
    m6AggregateOverride: m6Aggregate,
  });
  assessment.cloResults = teamCloResults;
  assessment.teamFinalScore = computeTeamFinalScore({
    assessment,
    template,
    m6AggregateOverride: m6Aggregate,
  });
  assessment.teamPassStatus = computePassStatus({
    finalScore10: assessment.teamFinalScore,
    cloResults: teamCloResults,
    template,
  });

  for (const studentAssessment of assessment.studentAssessments || []) {
    if (studentAssessment.peerSubmission) {
      const individualM6 = computeIndividualM6FromSubmission({
        submission: studentAssessment.peerSubmission,
        template,
      });
      studentAssessment.individualCloResults =
        individualM6.individualCloResults;
      studentAssessment.individualM6Score5 = individualM6.individualM6Score5;
      studentAssessment.individualM6Score10 = individualM6.individualM6Score10;
    }

    const individualCloResults = computeFinalCloResults({
      assessment,
      template,
      studentAssessment,
    });
    studentAssessment.individualCloResults = individualCloResults;
    studentAssessment.officialFinalScore = computeIndividualFinalScore({
      assessment,
      template,
      studentAssessment,
    });
    studentAssessment.officialPassStatus = computePassStatus({
      finalScore10: studentAssessment.officialFinalScore,
      cloResults: individualCloResults,
      template,
    });
  }

  assessment.qaEvidenceSummary = computeQaEvidenceSummary({
    assessment,
    template,
    reviewerFormReady: Boolean(
      council?.projects?.find((item) => isSameId(item.project, project._id))
        ?.reviewerForm?.pdfUrl,
    ),
  });

  const milestonesReady = (assessment.milestones || []).every(
    (item) => item.componentScore5 !== null || item.code === "M6",
  );
  assessment.status =
    assessment.status === "finalized"
      ? "finalized"
      : milestonesReady
        ? "ready"
        : "in_progress";
};

const buildAssessmentSummary = ({ assessment, project, council }) => {
  const m6Milestone = (assessment.milestones || []).find(
    (milestone) => milestone.code === "M6",
  );

  return {
    _id: assessment._id,
    projectId: project._id,
    councilId: council?._id || project.councilId || null,
    projectTrack: assessment.projectTrack,
    templateVersion: assessment.templateVersion,
    status: assessment.status,
    teamFinalScore: assessment.teamFinalScore,
    teamPassStatus: assessment.teamPassStatus,
    teamFinalScore100:
      assessment.teamFinalScore === null
        ? null
        : roundScore(assessment.teamFinalScore * 10, 2),
    cloResults: assessment.cloResults,
    qaEvidenceSummary: assessment.qaEvidenceSummary,
    milestones: (assessment.milestones || []).map((milestone) => ({
      code: milestone.code,
      label: milestone.label,
      weight: milestone.weight,
      status: milestone.status,
      componentScore5: milestone.componentScore5,
      componentScore10: milestone.componentScore10,
      aggregatedCloScores: milestone.aggregatedCloScores,
      requiredAssessors:
        milestone.code === "M5" && council
          ? buildRequiredM5Assessors(council, project._id)
          : [],
      assessorSubmissions: (milestone.assessorSubmissions || []).map(
        (submission) => ({
          _id: submission._id,
          assessor: submission.assessor,
          role: submission.role,
          source: submission.source,
          approvalStatus: submission.approvalStatus,
          cloEntries: submission.cloEntries,
          overallComment: submission.overallComment,
          evidenceRefs: submission.evidenceRefs,
          submittedAt: submission.submittedAt,
        }),
      ),
      evidenceRefs: milestone.evidenceRefs || [],
    })),
    studentAssessments: (assessment.studentAssessments || []).map((item) => ({
      reviewSubmissionId:
        (m6Milestone?.assessorSubmissions || []).find((submission) =>
          isSameId(submission.assessor, item.student),
        )?._id ||
        item.peerSubmission?._id ||
        null,
      student: item.student,
      peerSubmission: item.peerSubmission,
      individualCloResults: item.individualCloResults,
      individualM6Score5: item.individualM6Score5,
      individualM6Score10: item.individualM6Score10,
      officialFinalScore: item.officialFinalScore,
      officialPassStatus: item.officialPassStatus,
    })),
  };
};

export const buildRequiredM5Assessors = (council, projectId) => {
  const projectItem = (council.projects || []).find((item) =>
    isSameId(item.project, projectId),
  );
  const assessors = (council.members || []).map((member) => ({
    teacher: member.teacher,
    role: member.role,
    source: member.role,
    weight: member.weight,
  }));

  if (projectItem?.reviewer) {
    const reviewerId = toIdString(projectItem.reviewer);
    const existing = assessors.find(
      (item) => toIdString(item.teacher) === reviewerId,
    );
    if (existing) {
      existing.role = "reviewer";
      existing.source = "reviewer";
      existing.weight = Number(
        projectItem.reviewerWeight || existing.weight || 1.5,
      );
    } else {
      assessors.push({
        teacher: projectItem.reviewer,
        role: "reviewer",
        source: "reviewer",
        weight: Number(projectItem.reviewerWeight || 1.5),
      });
    }
  }

  return assessors;
};

export const ensureProjectAssessment = async ({
  projectId,
  councilId = null,
  projectTrack = "capstone",
  templateId = null,
}) => {
  const project = await Project.findById(projectId)
    .populate("student", "name email")
    .populate("members", "name email")
    .populate("supervisor", "name email");

  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }

  const template = templateId
    ? await assessmentTemplateService.getAssessmentTemplateById(templateId)
    : await assessmentTemplateService.getDefaultAssessmentTemplate(
        projectTrack,
      );

  let assessment = await ProjectAssessment.findOne({ project: projectId });
  if (!assessment) {
    assessment = await ProjectAssessment.create({
      project: project._id,
      council: councilId || null,
      template: template._id,
      templateVersion: template.version,
      projectTrack,
      milestones: buildMilestonesFromTemplate(template),
      cloResults: buildEmptyCloResults(template),
      studentAssessments: getProjectMemberIds(project).map((studentId) => ({
        student: studentId,
        peerSubmission: null,
        individualCloResults: buildEmptyCloResults(template),
      })),
      status: "draft",
    });
  } else {
    assessment.council = councilId || assessment.council || null;
    assessment.template = template._id;
    assessment.templateVersion = template.version;
    assessment.projectTrack = projectTrack;

    const currentStudentIds = new Set(
      (assessment.studentAssessments || []).map((item) =>
        toIdString(item.student),
      ),
    );
    for (const studentId of getProjectMemberIds(project)) {
      if (!currentStudentIds.has(studentId)) {
        assessment.studentAssessments.push({
          student: studentId,
          peerSubmission: null,
          individualCloResults: buildEmptyCloResults(template),
        });
      }
    }
    await assessment.save();
  }

  project.projectTrack = projectTrack;
  project.assessmentTemplateId = template._id;
  await project.save();

  await assessment.populate("template");
  await assessment.populate("studentAssessments.student", "name email");
  return assessment;
};

export const getProjectAssessmentSummary = async ({ projectId }) => {
  const project = await Project.findById(projectId)
    .populate("student", "name email")
    .populate("members", "name email")
    .populate("supervisor", "name email");
  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }

  const assessment = await ProjectAssessment.findOne({ project: projectId })
    .populate("template")
    .populate("studentAssessments.student", "name email")
    .populate("milestones.assessorSubmissions.assessor", "name email");
  if (!assessment) {
    return null;
  }

  const council = project.councilId
    ? await DefenseCouncil.findById(project.councilId)
        .populate("members.teacher", "name email")
        .populate("projects.reviewer", "name email")
    : null;

  return buildAssessmentSummary({ assessment, project, council });
};

const normalizeCloEntries = (cloEntries = []) =>
  (cloEntries || []).map((item) => ({
    cloCode: item.cloCode,
    score1to5: Number(item.score1to5),
    comment: item.comment || "",
    evidenceRefs: item.evidenceRefs || [],
  }));

export const submitTeacherMilestoneSubmission = async ({
  projectId,
  milestoneCode,
  teacherId,
  cloEntries,
  overallComment,
  files = [],
}) => {
  const project = await Project.findById(projectId)
    .populate("student", "name email")
    .populate("members", "name email")
    .populate("supervisor", "name email");
  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }
  ensureProjectEditable(project);

  const assessment =
    (await ProjectAssessment.findOne({ project: projectId })
      .populate("template")
      .populate("studentAssessments.student", "name email")) ||
    (await ensureProjectAssessment({
      projectId,
      councilId: project.councilId,
      projectTrack: project.projectTrack || "capstone",
      templateId: project.assessmentTemplateId,
    }));

  const teacherContext = await ensureTeacherCanSubmitMilestone({
    project,
    assessment,
    milestoneCode,
    teacherId,
  });

  const milestone = getMilestoneDoc(assessment, milestoneCode);
  const identityPrefix = `${toIdString(teacherId)}:${teacherContext.source}`;
  const existingSubmission = (milestone.assessorSubmissions || []).find(
    (submission) =>
      buildSubmissionIdentity(submission).startsWith(identityPrefix),
  );

  const evidenceRefs = normalizeEvidenceFiles(
    files,
    teacherId,
    `${milestoneCode.toLowerCase()}-file`,
  );
  const submissionPayload = {
    assessor: teacherId,
    role: SCORE_ROLE_LABELS[teacherContext.role] || teacherContext.role,
    source: teacherContext.source,
    submissionType: "teacher",
    weight: teacherContext.weight,
    approvalStatus: "approved",
    cloEntries: normalizeCloEntries(cloEntries),
    overallComment: overallComment || "",
    evidenceRefs,
    submittedAt: new Date(),
    reviewedBy: teacherId,
    reviewedAt: new Date(),
  };

  if (existingSubmission) {
    existingSubmission.role = submissionPayload.role;
    existingSubmission.source = submissionPayload.source;
    existingSubmission.weight = submissionPayload.weight;
    existingSubmission.approvalStatus = "approved";
    existingSubmission.cloEntries = submissionPayload.cloEntries;
    existingSubmission.overallComment = submissionPayload.overallComment;
    existingSubmission.evidenceRefs = appendEvidenceRefs(
      existingSubmission.evidenceRefs || [],
      evidenceRefs,
    );
    existingSubmission.submittedAt = new Date();
    existingSubmission.reviewedBy = teacherId;
    existingSubmission.reviewedAt = new Date();
  } else {
    milestone.assessorSubmissions.push(submissionPayload);
  }

  milestone.evidenceRefs = appendEvidenceRefs(
    milestone.evidenceRefs || [],
    evidenceRefs,
  );

  const council = project.councilId
    ? await DefenseCouncil.findById(project.councilId)
    : null;
  await recomputeAssessment({
    assessment,
    template: assessment.template,
    project,
    council,
  });
  await assessment.save();

  return getProjectAssessmentSummary({ projectId });
};

export const updateTeacherMilestoneSubmission = async ({
  projectId,
  milestoneCode,
  submissionId,
  teacherId,
  cloEntries,
  overallComment,
  approvalStatus,
  files = [],
}) => {
  const project = await Project.findById(projectId)
    .populate("student", "name email")
    .populate("members", "name email")
    .populate("supervisor", "name email");
  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }

  const assessment = await ProjectAssessment.findOne({
    project: projectId,
  }).populate("template");
  if (!assessment) {
    throw new ErrorHandler("Project assessment not found", 404);
  }

  const milestone = getMilestoneDoc(assessment, milestoneCode);

  if (milestoneCode === "M6") {
    ensureTeacherOwnsProject(project, teacherId);

    const { milestoneSubmission, peerSubmission } = resolveM6SubmissionTargets(
      assessment,
      submissionId,
    );
    if (!milestoneSubmission && !peerSubmission) {
      throw new ErrorHandler("Submission not found", 404);
    }

    const reviewTargets = [milestoneSubmission, peerSubmission].filter(Boolean);
    const normalizedEntries =
      Array.isArray(cloEntries) && cloEntries.length > 0
        ? normalizeCloEntries(cloEntries)
        : null;
    const evidenceRefs = normalizeEvidenceFiles(
      files,
      teacherId,
      "m6-review-file",
    );
    const reviewedAt = new Date();

    reviewTargets.forEach((target) => {
      target.approvalStatus = approvalStatus || target.approvalStatus;
      target.reviewedBy = teacherId;
      target.reviewedAt = reviewedAt;
      if (overallComment !== undefined) {
        target.overallComment = overallComment;
      }
      if (normalizedEntries) {
        target.cloEntries = normalizedEntries;
      }
      target.evidenceRefs = appendEvidenceRefs(
        target.evidenceRefs || [],
        evidenceRefs,
      );
    });
  } else {
    const submission = (milestone.assessorSubmissions || []).id(submissionId);
    if (!submission) {
      throw new ErrorHandler("Submission not found", 404);
    }

    const teacherContext = await ensureTeacherCanSubmitMilestone({
      project,
      assessment,
      milestoneCode,
      teacherId,
    });

    if (!isSameId(submission.assessor, teacherId)) {
      throw new ErrorHandler(
        "Teacher cannot edit another assessor submission",
        403,
      );
    }

    submission.weight = teacherContext.weight;
    if (overallComment !== undefined) {
      submission.overallComment = overallComment;
    }
    if (Array.isArray(cloEntries) && cloEntries.length > 0) {
      submission.cloEntries = normalizeCloEntries(cloEntries);
    }
    const evidenceRefs = normalizeEvidenceFiles(
      files,
      teacherId,
      `${milestoneCode.toLowerCase()}-file`,
    );
    submission.evidenceRefs = appendEvidenceRefs(
      submission.evidenceRefs || [],
      evidenceRefs,
    );
  }

  const council = project.councilId
    ? await DefenseCouncil.findById(project.councilId)
    : null;
  await recomputeAssessment({
    assessment,
    template: assessment.template,
    project,
    council,
  });
  await assessment.save();
  return getProjectAssessmentSummary({ projectId });
};

export const submitStudentPeerEvaluation = async ({
  studentId,
  projectId,
  cloEntries,
  overallComment,
  files = [],
}) => {
  const project = await requireProjectByUser(studentId);
  if (projectId && !isSameId(project._id, projectId)) {
    throw new ErrorHandler("Project mismatch for peer evaluation", 400);
  }
  ensureProjectEditable(project);
  ensureProjectMember(project, studentId);

  const assessment =
    (await ProjectAssessment.findOne({ project: project._id }).populate(
      "template",
    )) ||
    (await ensureProjectAssessment({
      projectId: project._id,
      councilId: project.councilId,
      projectTrack: project.projectTrack || "capstone",
      templateId: project.assessmentTemplateId,
    }));

  const studentAssessment = (assessment.studentAssessments || []).find((item) =>
    isSameId(item.student, studentId),
  );
  if (!studentAssessment) {
    throw new ErrorHandler("Student assessment row not found", 404);
  }

  const evidenceRefs = normalizeEvidenceFiles(
    files,
    studentId,
    "peer-evaluation",
  );
  studentAssessment.peerSubmission = {
    assessor: studentId,
    role: "student",
    source: "student",
    submissionType: "student",
    weight: 1,
    approvalStatus: "submitted",
    cloEntries: normalizeCloEntries(cloEntries),
    overallComment: overallComment || "",
    evidenceRefs,
    submittedAt: new Date(),
  };

  const m6Milestone = getMilestoneDoc(assessment, "M6");
  const existing = (m6Milestone.assessorSubmissions || []).find((submission) =>
    isSameId(submission.assessor, studentId),
  );
  if (existing) {
    existing.role = "student";
    existing.source = "student";
    existing.submissionType = "student";
    existing.weight = 1;
    existing.approvalStatus = "submitted";
    existing.cloEntries = normalizeCloEntries(cloEntries);
    existing.overallComment = overallComment || "";
    existing.evidenceRefs = evidenceRefs;
    existing.submittedAt = new Date();
  } else {
    m6Milestone.assessorSubmissions.push({
      assessor: studentId,
      role: "student",
      source: "student",
      submissionType: "student",
      weight: 1,
      approvalStatus: "submitted",
      cloEntries: normalizeCloEntries(cloEntries),
      overallComment: overallComment || "",
      evidenceRefs,
      submittedAt: new Date(),
    });
  }
  m6Milestone.evidenceRefs = appendEvidenceRefs(
    m6Milestone.evidenceRefs || [],
    evidenceRefs,
  );

  const council = project.councilId
    ? await DefenseCouncil.findById(project.councilId)
    : null;
  await recomputeAssessment({
    assessment,
    template: assessment.template,
    project,
    council,
  });
  await assessment.save();

  if (project.supervisor?._id) {
    await notificationServices.notifyUser(
      project.supervisor._id,
      `Student da nop peer/ICS M6 cho de tai "${project.title}". Vui long duyet tren Defense Hub.`,
      "defense",
      "/teacher/defense",
      "low",
    );
  }

  return getProjectAssessmentSummary({ projectId: project._id });
};

export const finalizeProjectAssessment = async ({
  projectId,
  councilId,
  teacherId,
  chairComment,
}) => {
  const project = await Project.findById(projectId)
    .populate("student", "name email")
    .populate("members", "name email");
  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }

  const council = await DefenseCouncil.findById(councilId);
  if (!council) {
    throw new ErrorHandler("Council not found", 404);
  }

  const chairman = (council.members || []).find(
    (member) => member.role === "chairman",
  );
  if (!chairman || !isSameId(chairman.teacher, teacherId)) {
    throw new ErrorHandler("Only the chairman can finalize CLO results", 403);
  }

  const projectItem = (council.projects || []).find((item) =>
    isSameId(item.project, projectId),
  );
  if (!projectItem) {
    throw new ErrorHandler(
      "Project has not been assigned to this council",
      404,
    );
  }

  const assessment = await ProjectAssessment.findOne({
    project: projectId,
  }).populate("template");
  if (!assessment) {
    throw new ErrorHandler("Project assessment not found", 404);
  }

  const requiredAssessors = buildRequiredM5Assessors(council, projectId);
  const m5 = getMilestoneDoc(assessment, "M5");

  const missingAssessors = [];
  for (const assessor of requiredAssessors) {
    const matched = (m5.assessorSubmissions || []).find((submission) =>
      isSameId(submission.assessor, assessor.teacher),
    );
    if (!matched) {
      missingAssessors.push(assessor);
    }
  }

  if (missingAssessors.length > 0) {
    const missingLabels = missingAssessors
      .map((assessor) => {
        const teacherName =
          assessor.teacher?.name ||
          assessor.teacher?.email ||
          toIdString(assessor.teacher);
        return `${teacherName} (${assessor.role})`;
      })
      .join(", ");

    throw new ErrorHandler(
      `Not all required M5 assessors have submitted their rubric. Missing: ${missingLabels}`,
      400,
    );
  }

  if (!projectItem.reviewerForm?.pdfUrl) {
    throw new ErrorHandler(
      "Reviewer form must be exported before finalization",
      400,
    );
  }

  const qaSummary = computeQaEvidenceSummary({
    assessment,
    template: assessment.template,
    reviewerFormReady: true,
  });
  // if (qaSummary.missingItems.length > 0) {
  //   throw new ErrorHandler(
  //     `QA evidence is incomplete: ${qaSummary.missingItems.join(", ")}`,
  //     400,
  //   );
  // }

  for (const milestone of assessment.milestones || []) {
    if (milestone.code !== "M6" && milestone.componentScore5 === null) {
      throw new ErrorHandler(`Milestone ${milestone.code} is incomplete`, 400);
    }
  }

  for (const studentAssessment of assessment.studentAssessments || []) {
    if (
      !studentAssessment.peerSubmission ||
      studentAssessment.peerSubmission.approvalStatus !== "approved"
    ) {
      throw new ErrorHandler(
        "All student M6 peer/ICS submissions must be approved before finalization",
        400,
      );
    }
  }

  assessment.chairComment = chairComment || "";
  assessment.finalizedBy = teacherId;
  assessment.finalizedAt = new Date();
  assessment.status = "finalized";
  assessment.qaEvidenceSummary = qaSummary;

  for (const milestone of assessment.milestones || []) {
    milestone.status = "locked";
    for (const submission of milestone.assessorSubmissions || []) {
      submission.lockedAt = new Date();
    }
  }

  await recomputeAssessment({
    assessment,
    template: assessment.template,
    project,
    council,
  });
  await assessment.save();

  project.defenseFinalScore = assessment.teamFinalScore;
  project.defenseStatus = "done";
  project.status = "done";
  project.archiveLocked = true;
  project.archivedAt = new Date();
  await project.save();

  projectItem.weightedAverage =
    assessment.teamFinalScore === null
      ? null
      : roundScore(assessment.teamFinalScore * 10, 2);
  projectItem.status = "done";
  projectItem.chairComment = chairComment || "";
  projectItem.finalizedBy = teacherId;
  projectItem.finalizedAt = new Date();
  await council.save();

  const allProjectsDone =
    council.projects.length > 0 &&
    council.projects.every((item) => item.status === "done");
  if (allProjectsDone) {
    council.status = "done";
    await council.save();
  }

  await Promise.all(
    getProjectMemberIds(project).map((memberId) =>
      notificationServices.notifyUser(
        memberId,
        `De tai "${project.title}" da duoc khoa diem CLO voi ket qua ${assessment.teamPassStatus} va diem ${assessment.teamFinalScore ?? "N/A"}/10.`,
        "defense",
        "/student/defense",
        "low",
      ),
    ),
  );

  return getProjectAssessmentSummary({ projectId });
};

export const getStudentAssessmentBoardByProject = async ({
  studentId,
  projectId,
}) => {
  const project = projectId
    ? await Project.findById(projectId)
        .populate("student", "name email")
        .populate("members", "name email")
        .populate("supervisor", "name email")
    : await requireProjectByUser(studentId);

  if (!project) {
    throw new ErrorHandler("Project not found", 404);
  }
  ensureProjectMember(project, studentId);

  const summary = await getProjectAssessmentSummary({ projectId: project._id });
  return {
    project,
    assessment: summary,
    myAssessment:
      summary?.studentAssessments?.find((item) =>
        isSameId(item.student, studentId),
      ) || null,
  };
};

export const getAdminQaDashboard = async () => {
  const assessments = await ProjectAssessment.find()
    .populate("project", "title groupName")
    .populate("template", "version projectTrack");

  const total = assessments.length || 1;
  const cloBuckets = new Map();
  for (const cloCode of [
    "CLO1",
    "CLO2",
    "CLO3",
    "CLO4",
    "CLO5",
    "CLO6",
    "CLO7",
  ]) {
    cloBuckets.set(cloCode, { total: 0, achieved: 0 });
  }

  const projectWarnings = [];
  for (const assessment of assessments) {
    const redClos = [];
    for (const clo of assessment.cloResults || []) {
      if (!cloBuckets.has(clo.cloCode)) continue;
      cloBuckets.get(clo.cloCode).total += 1;
      if (clo.status === "achieved") {
        cloBuckets.get(clo.cloCode).achieved += 1;
      } else if (clo.status === "not_achieved") {
        redClos.push(clo.cloCode);
      }
    }

    if (
      redClos.length > 0 ||
      (assessment.qaEvidenceSummary?.missingItems || []).length > 0
    ) {
      projectWarnings.push({
        projectId: assessment.project?._id,
        projectName:
          assessment.project?.groupName || assessment.project?.title || "N/A",
        redClos,
        teamFinalScore: assessment.teamFinalScore,
        qaCompleteness: assessment.qaEvidenceSummary?.completenessPercent || 0,
        missingItems: assessment.qaEvidenceSummary?.missingItems || [],
      });
    }
  }

  return {
    totalAssessments: assessments.length,
    finalizedAssessments: assessments.filter(
      (item) => item.status === "finalized",
    ).length,
    averageQaCompleteness:
      assessments.length === 0
        ? 0
        : roundScore(
            assessments.reduce(
              (sum, item) =>
                sum + Number(item.qaEvidenceSummary?.completenessPercent || 0),
              0,
            ) / assessments.length,
            1,
          ),
    cloAchievementRates: Array.from(cloBuckets.entries()).map(
      ([cloCode, bucket]) => ({
        cloCode,
        achievementRate: bucket.total
          ? roundScore((bucket.achieved / bucket.total) * 100, 1)
          : 0,
        totalProjects: bucket.total,
        achievedProjects: bucket.achieved,
      }),
    ),
    projectWarnings,
    readyForQaExport: assessments.filter(
      (item) =>
        item.status === "finalized" &&
        Number(item.qaEvidenceSummary?.completenessPercent || 0) === 100,
    ).length,
    passRate:
      assessments.length === 0
        ? 0
        : roundScore(
            (assessments.filter((item) => item.teamPassStatus === "pass")
              .length /
              total) *
              100,
            1,
          ),
  };
};
