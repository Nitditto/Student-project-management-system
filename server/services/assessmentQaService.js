import { getTemplateMilestones } from "./assessmentScoringService.js";

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

export const computeQaEvidenceSummary = ({
  assessment,
  template,
  reviewerFormReady = false,
  deadlines = [],
  submissions = [],
}) => {
  // Filter deadlines that specify required QA kinds
  const qaDeadlines = (deadlines || []).filter(
    (dl) => dl.requiredQaKinds && dl.requiredQaKinds.length > 0
  );

  if (qaDeadlines.length > 0) {
    let totalRequirementsCount = 0;
    let satisfiedRequirementsCount = 0;
    const missingItemsSet = new Set();
    const availableEvidenceKindsSet = new Set();

    const submissionMap = new Map();
    for (const sub of submissions || []) {
      if (sub.deadlineId) {
        submissionMap.set(sub.deadlineId.toString(), sub);
      }
    }

    for (const dl of qaDeadlines) {
      const sub = submissionMap.get(dl._id.toString());
      const isSubmitted = sub && (sub.status === "SUBMITTED" || sub.status === "LATE");

      for (const kind of dl.requiredQaKinds) {
        totalRequirementsCount++;
        let isSatisfied = false;

        if (kind === "reviewer-form" && reviewerFormReady) {
          isSatisfied = true;
        } else if (isSubmitted) {
          isSatisfied = true;
        }

        if (isSatisfied) {
          satisfiedRequirementsCount++;
          availableEvidenceKindsSet.add(kind);
        } else {
          missingItemsSet.add(kind);
        }
      }
    }

    const completenessPercent = totalRequirementsCount > 0
      ? Math.round((satisfiedRequirementsCount / totalRequirementsCount) * 100)
      : 100;

    return {
      completenessPercent,
      missingItems: Array.from(missingItemsSet),
      availableEvidenceKinds: Array.from(availableEvidenceKindsSet),
    };
  }

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
