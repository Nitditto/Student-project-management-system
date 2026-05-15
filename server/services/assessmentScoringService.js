import { roundScore, toIdString } from "../utils/workflowHelpers.js";
import {
  DEFAULT_CLO_CODES,
  DEFAULT_MILESTONE_CODES,
  DEFAULT_MILESTONE_WEIGHTS,
} from "../utils/assessmentTemplateDefaults.js";

export const getTemplateMilestones = (template) => {
  if (template?.milestoneDefinitions?.length) {
    return template.milestoneDefinitions;
  }

  return DEFAULT_MILESTONE_CODES.map((code) => ({
    code,
    label: code,
    weight: DEFAULT_MILESTONE_WEIGHTS[code] || 0,
    allowedSources: [],
    allowedRoles: [],
    requiredEvidenceKinds: [],
  }));
};

export const getTemplateClos = (template) => {
  if (template?.cloDefinitions?.length) {
    return template.cloDefinitions;
  }

  return DEFAULT_CLO_CODES.map((code) => ({
    code,
    label: code,
    description: "",
    qaEvidenceHints: [],
  }));
};

export const getMatrixWeight = (template, cloCode, milestoneCode) => {
  const row = template?.matrix?.get ? template.matrix.get(cloCode) : template?.matrix?.[cloCode];
  if (!row) return 0;
  const value = row.get ? row.get(milestoneCode) : row[milestoneCode];
  return Number(value || 0);
};

export const buildMilestonesFromTemplate = (template) =>
  getTemplateMilestones(template).map((item) => ({
    code: item.code,
    label: item.label,
    weight: item.weight,
    status: "pending",
    assessorSubmissions: [],
    aggregatedCloScores: [],
    componentScore5: null,
    componentScore10: null,
    evidenceRefs: [],
    lastRecomputedAt: null,
  }));

export const buildEmptyCloResults = (template) =>
  getTemplateClos(template).map((item) => ({
    cloCode: item.code,
    score5: null,
    status: "pending",
    contributionWeight: 0,
  }));

const getApprovedSubmissions = (submissions = []) =>
  submissions.filter((submission) =>
    submission.approvalStatus === "approved" ||
    submission.submissionType === "teacher",
  );

const getSubmissionWeight = (submission) => Number(submission?.weight || 1);

export const computeMilestoneAggregate = ({
  milestone,
  template,
  extraSubmissions = [],
}) => {
  const milestoneCode = milestone.code;
  const effectiveSubmissions = [
    ...getApprovedSubmissions(milestone.assessorSubmissions || []),
    ...extraSubmissions,
  ];

  const aggregatedCloScores = getTemplateClos(template).map((clo) => {
    let weightedTotal = 0;
    let totalWeight = 0;

    for (const submission of effectiveSubmissions) {
      const entry = (submission.cloEntries || []).find(
        (item) => item.cloCode === clo.code,
      );
      if (!entry) continue;

      const weight = getSubmissionWeight(submission);
      weightedTotal += Number(entry.score1to5) * weight;
      totalWeight += weight;
    }

    const score5 = totalWeight ? roundScore(weightedTotal / totalWeight, 2) : null;

    return {
      cloCode: clo.code,
      score5,
      status: score5 === null ? "pending" : score5 >= 3 ? "achieved" : "not_achieved",
      contributionWeight: getMatrixWeight(template, clo.code, milestoneCode),
    };
  });

  let componentWeightedTotal = 0;
  let componentWeight = 0;
  for (const item of aggregatedCloScores) {
    if (item.score5 === null || item.contributionWeight <= 0) continue;
    componentWeightedTotal += item.score5 * item.contributionWeight;
    componentWeight += item.contributionWeight;
  }

  const componentScore5 = componentWeight
    ? roundScore(componentWeightedTotal / componentWeight, 2)
    : null;
  const componentScore10 = componentScore5 === null ? null : roundScore(componentScore5 * 2, 2);

  return {
    aggregatedCloScores,
    componentScore5,
    componentScore10,
    status:
      effectiveSubmissions.length === 0
        ? "pending"
        : componentScore5 === null
          ? "in_progress"
          : "ready",
  };
};

export const computeFinalCloResults = ({
  assessment,
  template,
  studentAssessment = null,
  m6AggregateOverride = null,
}) => {
  const milestonesByCode = new Map(
    (assessment.milestones || []).map((milestone) => [milestone.code, milestone]),
  );

  return getTemplateClos(template).map((clo) => {
    let total = 0;
    let contributionWeight = 0;

    for (const milestone of getTemplateMilestones(template)) {
      const mappingWeight = getMatrixWeight(template, clo.code, milestone.code);
      if (!mappingWeight) continue;

      let cloScore = null;
      if (milestone.code === "M6" && studentAssessment) {
        const entry = (studentAssessment.individualCloResults || []).find(
          (item) => item.cloCode === clo.code,
        );
        cloScore = entry?.score5 ?? null;
      } else if (milestone.code === "M6" && m6AggregateOverride) {
        const entry = (m6AggregateOverride.aggregatedCloScores || []).find(
          (item) => item.cloCode === clo.code,
        );
        cloScore = entry?.score5 ?? null;
      } else {
        const milestoneDoc = milestonesByCode.get(milestone.code);
        const entry = (milestoneDoc?.aggregatedCloScores || []).find(
          (item) => item.cloCode === clo.code,
        );
        cloScore = entry?.score5 ?? null;
      }

      if (cloScore === null) continue;
      total += cloScore * mappingWeight;
      contributionWeight += mappingWeight;
    }

    const score5 = contributionWeight ? roundScore(total / contributionWeight, 2) : null;

    return {
      cloCode: clo.code,
      score5,
      status: score5 === null ? "pending" : score5 >= 3 ? "achieved" : "not_achieved",
      contributionWeight,
    };
  });
};

const getMilestoneFinalContribution = (milestoneCode, componentScore10, template) => {
  const milestone = getTemplateMilestones(template).find((item) => item.code === milestoneCode);
  if (!milestone || componentScore10 === null) return 0;
  return (componentScore10 * Number(milestone.weight || 0)) / 100;
};

export const computeTeamFinalScore = ({
  assessment,
  template,
  m6AggregateOverride = null,
}) => {
  let total = 0;

  for (const milestone of assessment.milestones || []) {
    const componentScore10 =
      milestone.code === "M6" && m6AggregateOverride
        ? m6AggregateOverride.componentScore10
        : milestone.componentScore10;
    total += getMilestoneFinalContribution(milestone.code, componentScore10, template);
  }

  return roundScore(total, 2);
};

export const computeIndividualFinalScore = ({
  assessment,
  template,
  studentAssessment,
}) => {
  let total = 0;
  for (const milestone of assessment.milestones || []) {
    const componentScore10 =
      milestone.code === "M6"
        ? studentAssessment.individualM6Score10
        : milestone.componentScore10;
    total += getMilestoneFinalContribution(milestone.code, componentScore10, template);
  }
  return roundScore(total, 2);
};

export const computePassStatus = ({ finalScore10, cloResults, template }) => {
  const minimumFinal = Number(template?.passRules?.minimumFinalScore10 || 5);
  const minimumClo = Number(template?.passRules?.minimumCloScore5 || 3);
  const noCondonement = template?.passRules?.noCondonement !== false;

  if (finalScore10 === null) {
    return "pending";
  }
  if (finalScore10 < minimumFinal) {
    return "fail";
  }
  if (
    noCondonement &&
    (cloResults || []).some((item) => item.score5 !== null && item.score5 < minimumClo)
  ) {
    return "fail";
  }
  if ((cloResults || []).some((item) => item.score5 === null)) {
    return "pending";
  }
  return "pass";
};

export const computeM6AggregateFromStudents = ({ assessment, template }) => {
  const syntheticSubmissions = (assessment.studentAssessments || [])
    .map((studentAssessment) => studentAssessment.peerSubmission)
    .filter(Boolean)
    .filter((submission) => submission.approvalStatus === "approved");

  const milestone = (assessment.milestones || []).find((item) => item.code === "M6");
  if (!milestone) {
    return {
      aggregatedCloScores: [],
      componentScore5: null,
      componentScore10: null,
      status: "pending",
    };
  }

  return computeMilestoneAggregate({
    milestone: { ...milestone, assessorSubmissions: [] },
    template,
    extraSubmissions: syntheticSubmissions,
  });
};

export const computeIndividualM6FromSubmission = ({
  submission,
  template,
}) => {
  const milestoneCode = "M6";
  const results = getTemplateClos(template).map((clo) => {
    const entry = (submission?.cloEntries || []).find((item) => item.cloCode === clo.code);
    const score5 = entry ? roundScore(Number(entry.score1to5), 2) : null;
    return {
      cloCode: clo.code,
      score5,
      status: score5 === null ? "pending" : score5 >= 3 ? "achieved" : "not_achieved",
      contributionWeight: getMatrixWeight(template, clo.code, milestoneCode),
    };
  });

  let weightedTotal = 0;
  let totalWeight = 0;
  for (const item of results) {
    if (item.score5 === null || item.contributionWeight <= 0) continue;
    weightedTotal += item.score5 * item.contributionWeight;
    totalWeight += item.contributionWeight;
  }

  const individualM6Score5 = totalWeight ? roundScore(weightedTotal / totalWeight, 2) : null;
  const individualM6Score10 =
    individualM6Score5 === null ? null : roundScore(individualM6Score5 * 2, 2);

  return {
    individualCloResults: results,
    individualM6Score5,
    individualM6Score10,
  };
};

export const buildSubmissionIdentity = (submission) =>
  `${toIdString(submission.assessor)}:${submission.source}:${submission.role}`;
