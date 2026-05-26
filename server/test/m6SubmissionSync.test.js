import test from "node:test";
import assert from "node:assert/strict";
import { resolveM6SubmissionTargets } from "../utils/m6SubmissionSync.js";

const buildAssessmentFixture = () => ({
  milestones: [
    {
      code: "M6",
      assessorSubmissions: [
        {
          _id: "milestone-submission-1",
          assessor: "student-1",
          approvalStatus: "submitted",
        },
      ],
    },
  ],
  studentAssessments: [
    {
      student: "student-1",
      peerSubmission: {
        _id: "peer-submission-1",
        approvalStatus: "submitted",
      },
    },
  ],
});

test("resolveM6SubmissionTargets finds both targets from peer submission id", () => {
  const result = resolveM6SubmissionTargets(
    buildAssessmentFixture(),
    "peer-submission-1",
  );

  assert.equal(result.peerSubmission?._id, "peer-submission-1");
  assert.equal(result.milestoneSubmission?._id, "milestone-submission-1");
  assert.equal(result.studentAssessment?.student, "student-1");
});

test("resolveM6SubmissionTargets finds both targets from milestone submission id", () => {
  const result = resolveM6SubmissionTargets(
    buildAssessmentFixture(),
    "milestone-submission-1",
  );

  assert.equal(result.peerSubmission?._id, "peer-submission-1");
  assert.equal(result.milestoneSubmission?._id, "milestone-submission-1");
  assert.equal(result.studentAssessment?.student, "student-1");
});
