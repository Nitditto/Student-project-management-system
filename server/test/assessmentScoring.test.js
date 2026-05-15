import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMilestonesFromTemplate,
  computeFinalCloResults,
  computeIndividualFinalScore,
  computeIndividualM6FromSubmission,
  computeMilestoneAggregate,
  computePassStatus,
  computeTeamFinalScore,
} from "../services/assessmentScoringService.js";
import { buildDefaultAssessmentTemplate } from "../utils/assessmentTemplateDefaults.js";

const template = buildDefaultAssessmentTemplate("capstone");

test("computeMilestoneAggregate uses weighted average between assessors", () => {
  const [m1] = buildMilestonesFromTemplate(template);
  m1.assessorSubmissions = [
    {
      assessor: "teacher-a",
      role: "supervisor",
      source: "supervisor",
      submissionType: "teacher",
      weight: 1,
      approvalStatus: "approved",
      cloEntries: [{ cloCode: "CLO1", score1to5: 4, comment: "" }],
    },
    {
      assessor: "teacher-b",
      role: "supervisor",
      source: "supervisor",
      submissionType: "teacher",
      weight: 2,
      approvalStatus: "approved",
      cloEntries: [{ cloCode: "CLO1", score1to5: 5, comment: "" }],
    },
  ];

  const result = computeMilestoneAggregate({ milestone: m1, template });
  const clo1 = result.aggregatedCloScores.find((item) => item.cloCode === "CLO1");
  assert.equal(clo1.score5, 4.67);
  assert.equal(result.componentScore10, 9.34);
});

test("final CLO result follows mapping matrix and no-condonement can fail result", () => {
  const milestones = buildMilestonesFromTemplate(template);
  milestones.find((item) => item.code === "M1").componentScore10 = 8;
  milestones.find((item) => item.code === "M1").componentScore5 = 4;
  milestones.find((item) => item.code === "M1").aggregatedCloScores = [
    { cloCode: "CLO1", score5: 4, status: "achieved", contributionWeight: 30 },
    { cloCode: "CLO2", score5: 4, status: "achieved", contributionWeight: 20 },
    { cloCode: "CLO5", score5: 2, status: "not_achieved", contributionWeight: 10 },
    { cloCode: "CLO7", score5: 4, status: "achieved", contributionWeight: 10 },
  ];
  milestones.find((item) => item.code === "M2").componentScore10 = 8;
  milestones.find((item) => item.code === "M2").componentScore5 = 4;
  milestones.find((item) => item.code === "M2").aggregatedCloScores = [
    { cloCode: "CLO1", score5: 4, status: "achieved", contributionWeight: 40 },
    { cloCode: "CLO2", score5: 4, status: "achieved", contributionWeight: 30 },
    { cloCode: "CLO3", score5: 4, status: "achieved", contributionWeight: 30 },
    { cloCode: "CLO4", score5: 4, status: "achieved", contributionWeight: 10 },
    { cloCode: "CLO5", score5: 2, status: "not_achieved", contributionWeight: 20 },
    { cloCode: "CLO7", score5: 4, status: "achieved", contributionWeight: 20 },
  ];
  milestones.find((item) => item.code === "M3").componentScore10 = 8;
  milestones.find((item) => item.code === "M3").componentScore5 = 4;
  milestones.find((item) => item.code === "M3").aggregatedCloScores = [
    { cloCode: "CLO1", score5: 4, status: "achieved", contributionWeight: 10 },
    { cloCode: "CLO2", score5: 4, status: "achieved", contributionWeight: 10 },
    { cloCode: "CLO3", score5: 4, status: "achieved", contributionWeight: 30 },
    { cloCode: "CLO4", score5: 4, status: "achieved", contributionWeight: 30 },
    { cloCode: "CLO5", score5: 2, status: "not_achieved", contributionWeight: 30 },
    { cloCode: "CLO7", score5: 4, status: "achieved", contributionWeight: 20 },
  ];
  milestones.find((item) => item.code === "M4").componentScore10 = 9;
  milestones.find((item) => item.code === "M4").componentScore5 = 4.5;
  milestones.find((item) => item.code === "M4").aggregatedCloScores = [
    { cloCode: "CLO1", score5: 4.5, status: "achieved", contributionWeight: 20 },
    { cloCode: "CLO2", score5: 4.5, status: "achieved", contributionWeight: 30 },
    { cloCode: "CLO3", score5: 4.5, status: "achieved", contributionWeight: 30 },
    { cloCode: "CLO4", score5: 4.5, status: "achieved", contributionWeight: 20 },
    { cloCode: "CLO5", score5: 4.5, status: "achieved", contributionWeight: 20 },
    { cloCode: "CLO6", score5: 4.5, status: "achieved", contributionWeight: 30 },
    { cloCode: "CLO7", score5: 4.5, status: "achieved", contributionWeight: 20 },
  ];
  milestones.find((item) => item.code === "M5").componentScore10 = 8;
  milestones.find((item) => item.code === "M5").componentScore5 = 4;
  milestones.find((item) => item.code === "M5").aggregatedCloScores = [
    { cloCode: "CLO2", score5: 4, status: "achieved", contributionWeight: 10 },
    { cloCode: "CLO3", score5: 4, status: "achieved", contributionWeight: 10 },
    { cloCode: "CLO4", score5: 4, status: "achieved", contributionWeight: 20 },
    { cloCode: "CLO5", score5: 4, status: "achieved", contributionWeight: 20 },
    { cloCode: "CLO6", score5: 4, status: "achieved", contributionWeight: 70 },
    { cloCode: "CLO7", score5: 4, status: "achieved", contributionWeight: 20 },
  ];

  const assessment = { milestones };
  const cloResults = computeFinalCloResults({ assessment, template });
  const teamFinalScore = computeTeamFinalScore({ assessment, template });
  const passStatus = computePassStatus({ finalScore10: teamFinalScore, cloResults, template });

  assert.equal(cloResults.find((item) => item.cloCode === "CLO1").score5, 4.1);
  assert.equal(cloResults.find((item) => item.cloCode === "CLO5").status, "not_achieved");
  assert.equal(teamFinalScore, 7.45);
  assert.equal(passStatus, "fail");
});

test("individual M6 scoring changes student final score independently", () => {
  const milestones = buildMilestonesFromTemplate(template);
  milestones.find((item) => item.code === "M1").componentScore10 = 8;
  milestones.find((item) => item.code === "M2").componentScore10 = 8;
  milestones.find((item) => item.code === "M3").componentScore10 = 8;
  milestones.find((item) => item.code === "M4").componentScore10 = 8;
  milestones.find((item) => item.code === "M5").componentScore10 = 8;

  const peerSubmission = {
    cloEntries: [
      { cloCode: "CLO4", score1to5: 5, comment: "" },
      { cloCode: "CLO7", score1to5: 4, comment: "" },
    ],
  };

  const studentAssessment = computeIndividualM6FromSubmission({
    submission: peerSubmission,
    template,
  });
  const officialFinalScore = computeIndividualFinalScore({
    assessment: { milestones },
    template,
    studentAssessment,
  });

  assert.equal(studentAssessment.individualM6Score5, 4.67);
  assert.equal(studentAssessment.individualM6Score10, 9.34);
  assert.equal(officialFinalScore, 8.13);
});
