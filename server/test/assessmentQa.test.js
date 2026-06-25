import test from "node:test";
import assert from "node:assert/strict";
import { computeQaEvidenceSummary } from "../services/assessmentQaService.js";

// Mock template with expected required evidence kinds
const templateFixture = {
  milestoneDefinitions: [
    { code: "M1", requiredEvidenceKinds: ["proposal-file", "proposal-slides"] },
    { code: "M2", requiredEvidenceKinds: ["milestone-report"] },
    { code: "M5", requiredEvidenceKinds: ["defense-slides", "reviewer-form"] },
  ],
};

test("computeQaEvidenceSummary returns 0% completeness when no evidence exists", () => {
  const assessment = {
    milestones: [
      { code: "M1", evidenceRefs: [], assessorSubmissions: [] },
      { code: "M2", evidenceRefs: [], assessorSubmissions: [] },
      { code: "M5", evidenceRefs: [], assessorSubmissions: [] },
    ],
    studentAssessments: [],
  };

  const result = computeQaEvidenceSummary({
    assessment,
    template: templateFixture,
    reviewerFormReady: false,
  });

  assert.equal(result.completenessPercent, 0);
  assert.deepEqual(result.missingItems.sort(), [
    "defense-slides",
    "milestone-report",
    "proposal-file",
    "proposal-slides",
    "reviewer-form",
  ].sort());
  assert.equal(result.availableEvidenceKinds.length, 0);
});

test("computeQaEvidenceSummary handles partial evidence attachments", () => {
  const assessment = {
    milestones: [
      {
        code: "M1",
        evidenceRefs: [{ kind: "proposal-file", fileUrl: "/path/to/prop.pdf" }],
        assessorSubmissions: [
          {
            evidenceRefs: [
              { kind: "proposal-slides", fileUrl: "/path/to/slides.pptx" },
            ],
          },
        ],
      },
      { code: "M2", evidenceRefs: [], assessorSubmissions: [] },
      { code: "M5", evidenceRefs: [], assessorSubmissions: [] },
    ],
    studentAssessments: [
      {
        peerSubmission: {
          evidenceRefs: [{ kind: "other-random-evidence", fileUrl: "/random" }],
        },
      },
    ],
  };

  const result = computeQaEvidenceSummary({
    assessment,
    template: templateFixture,
    reviewerFormReady: false,
  });

  // Expected evidence types are 5: "proposal-file", "proposal-slides", "milestone-report", "defense-slides", "reviewer-form".
  // Provided matching expected ones are 2: "proposal-file", "proposal-slides"
  // 2 / 5 = 40%
  assert.equal(result.completenessPercent, 40);
  assert.deepEqual(result.missingItems.sort(), [
    "defense-slides",
    "milestone-report",
    "reviewer-form",
  ].sort());
  assert.equal(result.availableEvidenceKinds.includes("proposal-file"), true);
  assert.equal(result.availableEvidenceKinds.includes("proposal-slides"), true);
  assert.equal(result.availableEvidenceKinds.includes("other-random-evidence"), true);
});

test("computeQaEvidenceSummary calculates 100% completeness and resolves reviewerFormReady trigger", () => {
  const assessment = {
    milestones: [
      {
        code: "M1",
        evidenceRefs: [
          { kind: "proposal-file", fileUrl: "/file" },
          { kind: "proposal-slides", fileUrl: "/slides" },
        ],
      },
      {
        code: "M2",
        evidenceRefs: [{ kind: "milestone-report", fileUrl: "/report" }],
      },
      {
        code: "M5",
        evidenceRefs: [{ kind: "defense-slides", fileUrl: "/defense-slides" }],
      },
    ],
  };

  // With reviewerFormReady = true, the "reviewer-form" gets marked as resolved dynamically
  const result = computeQaEvidenceSummary({
    assessment,
    template: templateFixture,
    reviewerFormReady: true,
  });

  assert.equal(result.completenessPercent, 100);
  assert.equal(result.missingItems.length, 0);
  assert.equal(result.availableEvidenceKinds.includes("reviewer-form"), true);
});

test("computeQaEvidenceSummary calculates completeness dynamically from deadlines and submissions", () => {
  const assessment = {
    milestones: [],
    studentAssessments: [],
  };

  const deadlines = [
    {
      _id: "dl1",
      requiredQaKinds: ["proposal-minute", "topic-approval"],
    },
    {
      _id: "dl2",
      requiredQaKinds: ["midterm-report"],
    },
    {
      _id: "dl3",
      requiredQaKinds: ["reviewer-form"],
    },
    {
      _id: "dl4",
      requiredQaKinds: [],
    }
  ];

  const submissions = [
    {
      deadlineId: "dl1",
      status: "SUBMITTED",
    },
    {
      deadlineId: "dl2",
      status: "PENDING",
    },
    {
      deadlineId: "dl3",
      status: "PENDING",
    }
  ];

  const result1 = computeQaEvidenceSummary({
    assessment,
    template: templateFixture,
    reviewerFormReady: false,
    deadlines,
    submissions,
  });

  assert.equal(result1.completenessPercent, 50);
  assert.deepEqual(result1.missingItems.sort(), ["midterm-report", "reviewer-form"].sort());

  const result2 = computeQaEvidenceSummary({
    assessment,
    template: templateFixture,
    reviewerFormReady: true,
    deadlines,
    submissions,
  });

  assert.equal(result2.completenessPercent, 75);
  assert.deepEqual(result2.missingItems.sort(), ["midterm-report"].sort());
});
