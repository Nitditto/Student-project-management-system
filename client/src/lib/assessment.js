export const CLO_CODES = ["CLO1", "CLO2", "CLO3", "CLO4", "CLO5", "CLO6", "CLO7"];

export const TEACHER_ASSESSMENT_TABS = [
  { key: "M1", label: "M1-M3 Supervision" },
  { key: "M4", label: "M4 Report Review" },
  { key: "M5", label: "M5 Council Defense" },
  { key: "M6", label: "M6 Peer / ICS" },
  { key: "SUMMARY", label: "CLO Summary" },
];

export const MILESTONE_LABELS = {
  M1: "Proposal",
  M2: "Midterm / PDR-CDR",
  M3: "Logbook / Progress",
  M4: "Report / Thesis",
  M5: "Defense / Council",
  M6: "Peer / ICS",
};

export const createRubricEntries = (codes = CLO_CODES) =>
  codes.map((cloCode) => ({
    cloCode,
    score1to5: "",
    comment: "",
  }));

export const buildRubricPayload = (entries = []) =>
  entries
    .filter((item) => item.score1to5 !== "" && item.score1to5 !== null && item.score1to5 !== undefined)
    .map((item) => ({
      cloCode: item.cloCode,
      score1to5: Number(item.score1to5),
      comment: item.comment || "",
    }));

export const mergeRubricEntries = (existingEntries = [], codes = CLO_CODES) => {
  const byCode = new Map((existingEntries || []).map((item) => [item.cloCode, item]));
  return codes.map((cloCode) => ({
    cloCode,
    score1to5: byCode.get(cloCode)?.score1to5 ?? "",
    comment: byCode.get(cloCode)?.comment ?? "",
  }));
};

export const formatAssessmentScore = (value, suffix = "") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }
  return `${Number(value).toFixed(2)}${suffix}`;
};
