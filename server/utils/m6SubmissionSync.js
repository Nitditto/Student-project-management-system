export function resolveM6SubmissionTargets(assessment, submissionId) {
  let studentAssessment = null;
  let peerSubmission = null;
  let milestoneSubmission = null;

  const targetId = submissionId?.toString();
  if (!targetId) return { studentAssessment, peerSubmission, milestoneSubmission };

  // 1. Try to find by peerSubmission id first
  for (const sa of assessment.studentAssessments || []) {
    if (sa.peerSubmission && sa.peerSubmission._id?.toString() === targetId) {
      studentAssessment = sa;
      peerSubmission = sa.peerSubmission;
      break;
    }
  }

  // 2. If not found by peer submission, try to find by milestone submission id
  const m6Milestone = (assessment.milestones || []).find((m) => m.code === "M6");
  
  if (!peerSubmission && m6Milestone) {
    for (const sub of m6Milestone.assessorSubmissions || []) {
      if (sub._id?.toString() === targetId) {
        milestoneSubmission = sub;
        // Associate back to the studentAssessment using the assessor (student id)
        studentAssessment = (assessment.studentAssessments || []).find(
          (sa) => sa.student?.toString() === sub.assessor?.toString()
        );
        if (studentAssessment) {
          peerSubmission = studentAssessment.peerSubmission;
        }
        break;
      }
    }
  }

  // 3. Ensure we resolve both sides (peerSubmission & milestoneSubmission) if we found one
  if (peerSubmission && !milestoneSubmission && m6Milestone) {
    milestoneSubmission = (m6Milestone.assessorSubmissions || []).find(
      (sub) => sub.assessor?.toString() === studentAssessment.student?.toString()
    );
  }

  return { studentAssessment, peerSubmission, milestoneSubmission };
}
