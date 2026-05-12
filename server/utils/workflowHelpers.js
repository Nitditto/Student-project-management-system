import crypto from "crypto";

export const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

export const isSameId = (left, right) => {
  return toIdString(left) !== "" && toIdString(left) === toIdString(right);
};

export const getProjectMemberIds = (project) => {
  const ids = new Set();

  if (project?.student) {
    ids.add(toIdString(project.student));
  }

  for (const member of project?.members || []) {
    ids.add(toIdString(member));
  }

  return Array.from(ids).filter(Boolean);
};

export const isProjectMember = (project, userId) => {
  return getProjectMemberIds(project).includes(toIdString(userId));
};

export const generateSixDigitCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

export const generateQrToken = () => {
  return crypto.randomBytes(16).toString("hex");
};

export const roundScore = (value, precision = 2) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export const computeAttendanceRate = ({
  totalSessions,
  presentSessions,
  excusedSessions,
}) => {
  if (!totalSessions) return 0;
  return roundScore(
    ((presentSessions + excusedSessions) / totalSessions) * 100,
    1,
  );
};
