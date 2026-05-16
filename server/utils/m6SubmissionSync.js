import { isSameId } from "./workflowHelpers.js";

export const resolveM6SubmissionTargets = (assessment, submissionId) => {
  const m6Milestone = (assessment?.milestones || []).find((item) => item.code === "M6");
  const milestoneSubmission = (m6Milestone?.assessorSubmissions || []).find((item) =>
    isSameId(item?._id, submissionId),
  );

  let studentAssessment = (assessment?.studentAssessments || []).find((item) =>
    isSameId(item?.peerSubmission?._id, submissionId),
  );

  if (!studentAssessment && milestoneSubmission?.assessor) {
    studentAssessment = (assessment?.studentAssessments || []).find((item) =>
      isSameId(item?.student, milestoneSubmission.assessor),
    );
  }

  const peerSubmission = studentAssessment?.peerSubmission || null;
  const matchedMilestoneSubmission =
    milestoneSubmission ||
    (peerSubmission
      ? (m6Milestone?.assessorSubmissions || []).find((item) =>
          isSameId(item?.assessor, studentAssessment?.student),
        )
      : null);

  return {
    m6Milestone,
    milestoneSubmission: matchedMilestoneSubmission || null,
    studentAssessment: studentAssessment || null,
    peerSubmission,
  };
};
