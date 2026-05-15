import { getTemplateMilestones } from "./assessmentScoringService.js";

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

export const computeQaEvidenceSummary = ({ assessment, template, reviewerFormReady = false }) => {
  const availableEvidenceKinds = [];
  const missingItems = [];

  for (const milestone of assessment.milestones || []) {
    for (const evidence of milestone.evidenceRefs || []) {
      availableEvidenceKinds.push(evidence.kind);
    }
    for (const submission of milestone.assessorSubmissions || []) {
      for (const evidence of submission.evidenceRefs || []) {
        availableEvidenceKinds.push(evidence.kind);
      }
    }
  }

  for (const studentAssessment of assessment.studentAssessments || []) {
    for (const evidence of studentAssessment.peerSubmission?.evidenceRefs || []) {
      availableEvidenceKinds.push(evidence.kind);
    }
  }

  const evidenceSet = new Set(unique(availableEvidenceKinds));
  const expectedEvidenceKinds = getTemplateMilestones(template).flatMap(
    (milestone) => milestone.requiredEvidenceKinds || [],
  );

  for (const evidenceKind of expectedEvidenceKinds) {
    if (evidenceKind === "reviewer-form" && reviewerFormReady) {
      evidenceSet.add("reviewer-form");
      continue;
    }
    if (!evidenceSet.has(evidenceKind)) {
      missingItems.push(evidenceKind);
    }
  }

  const completenessPercent = expectedEvidenceKinds.length
    ? Math.round(
        ((expectedEvidenceKinds.length - missingItems.length) / expectedEvidenceKinds.length) * 100,
      )
    : 100;

  return {
    completenessPercent,
    missingItems: unique(missingItems),
    availableEvidenceKinds: unique(Array.from(evidenceSet)),
  };
};
