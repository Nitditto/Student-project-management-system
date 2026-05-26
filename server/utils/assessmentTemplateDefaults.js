export const DEFAULT_CLO_CODES = [
  "CLO1",
  "CLO2",
  "CLO3",
  "CLO4",
  "CLO5",
  "CLO6",
  "CLO7",
];

export const DEFAULT_MILESTONE_CODES = ["M1", "M2", "M3", "M4", "M5", "M6"];

export const DEFAULT_MILESTONE_WEIGHTS = {
  M1: 10,
  M2: 15,
  M3: 10,
  M4: 25,
  M5: 30,
  M6: 10,
};

export const DEFAULT_CLO_MATRIX = {
  CLO1: { M1: 30, M2: 40, M3: 10, M4: 20, M5: 0, M6: 0 },
  CLO2: { M1: 20, M2: 30, M3: 10, M4: 30, M5: 10, M6: 0 },
  CLO3: { M1: 0, M2: 30, M3: 30, M4: 30, M5: 10, M6: 0 },
  CLO4: { M1: 0, M2: 10, M3: 30, M4: 20, M5: 20, M6: 20 },
  CLO5: { M1: 10, M2: 20, M3: 30, M4: 20, M5: 20, M6: 0 },
  CLO6: { M1: 0, M2: 0, M3: 0, M4: 30, M5: 70, M6: 0 },
  CLO7: { M1: 10, M2: 20, M3: 20, M4: 20, M5: 20, M6: 10 },
};

const SHARED_CLO_DEFINITIONS = [
  {
    code: "CLO1",
    label: "Problem analysis",
    description:
      "Xac dinh, phan tich va dien giai bai toan ky thuat hoac nghien cuu.",
    qaEvidenceHints: ["proposal-minute", "topic-approval"],
  },
  {
    code: "CLO2",
    label: "Solution design",
    description:
      "Thiet ke, phat trien giai phap ky thuat hoac phuong phap nghien cuu phu hop.",
    qaEvidenceHints: ["pdr-cdr", "midterm-report", "technical-report"],
  },
  {
    code: "CLO3",
    label: "Experiment and analysis",
    description:
      "Thuc hien thu nghiem, phan tich va danh gia du lieu, ket qua.",
    qaEvidenceHints: ["experiment-result", "evaluation-report", "demo-video"],
  },
  {
    code: "CLO4",
    label: "Teamwork and communication",
    description:
      "Lam viec nhom hieu qua, the hien vai tro lanh dao va giao tiep chuyen nghiep.",
    qaEvidenceHints: ["ics", "peer-evaluation", "logbook"],
  },
  {
    code: "CLO5",
    label: "Professional ethics",
    description:
      "Tuan thu chuan muc dao duc, an toan va ben vung nghe nghiep.",
    qaEvidenceHints: ["ethics-commitment", "rubric", "meeting-minute"],
  },
  {
    code: "CLO6",
    label: "Presentation and defense",
    description:
      "Bao cao, phan bien, trinh bay va cong bo ket qua dat duoc.",
    qaEvidenceHints: ["reviewer-form", "defense-minute", "defense-video"],
  },
  {
    code: "CLO7",
    label: "Innovation and lifelong learning",
    description:
      "Tu hoc, doi moi sang tao va ap dung cong nghe moi trong giai phap hoac nghien cuu.",
    qaEvidenceHints: ["logbook", "innovation-note", "peer-evaluation"],
  },
];

const SHARED_MILESTONE_DEFINITIONS = [
  {
    code: "M1",
    label: "Proposal",
    weight: 10,
    allowedSources: ["supervisor"],
    allowedRoles: ["supervisor"],
    requiredEvidenceKinds: ["proposal-minute", "topic-approval"],
  },
  {
    code: "M2",
    label: "Midterm / PDR-CDR",
    weight: 15,
    allowedSources: ["supervisor"],
    allowedRoles: ["supervisor"],
    requiredEvidenceKinds: ["midterm-report", "pdr-cdr"],
  },
  {
    code: "M3",
    label: "Logbook and progress",
    weight: 10,
    allowedSources: ["supervisor"],
    allowedRoles: ["supervisor"],
    requiredEvidenceKinds: ["logbook"],
  },
  {
    code: "M4",
    label: "Report / Thesis review",
    weight: 25,
    allowedSources: ["supervisor", "reviewer"],
    allowedRoles: ["supervisor", "reviewer"],
    requiredEvidenceKinds: ["technical-report"],
  },
  {
    code: "M5",
    label: "Defense and council review",
    weight: 30,
    allowedSources: ["reviewer", "chairman", "secretary", "member"],
    allowedRoles: ["reviewer", "chairman", "secretary", "member"],
    requiredEvidenceKinds: ["reviewer-form", "defense-minute", "defense-video"],
  },
  {
    code: "M6",
    label: "Peer / ICS",
    weight: 10,
    allowedSources: ["peer", "student", "supervisor"],
    allowedRoles: ["peer", "student", "supervisor"],
    requiredEvidenceKinds: ["ics", "peer-evaluation"],
  },
];

export const buildDefaultAssessmentTemplate = (projectTrack) => ({
  code: `default-${projectTrack}-2025-v1`,
  name:
    projectTrack === "research"
      ? "Default Research Thesis CLO Template"
      : "Default Capstone CLO Template",
  version: "2025-v1",
  projectTrack,
  status: "active",
  milestoneDefinitions: SHARED_MILESTONE_DEFINITIONS,
  cloDefinitions: SHARED_CLO_DEFINITIONS,
  matrix: DEFAULT_CLO_MATRIX,
  passRules: {
    minimumFinalScore10: 5,
    minimumCloScore5: 3,
    noCondonement: true,
  },
});
