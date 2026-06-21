import test from "node:test";
import assert from "node:assert/strict";
import { buildStudentAttendanceSummary } from "../services/attendanceServices.js";

// Session mock records helper
const buildSession = ({ id, title, startsAt, studentId, status, excused = false }) => ({
  _id: id,
  title,
  startsAt,
  endsAt: new Date(new Date(startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString(),
  records: [
    {
      student: studentId,
      status: excused ? "excused" : status,
      checkedInAt: status === "present" ? new Date().toISOString() : null,
      checkInMethod: status === "present" ? "qr" : null,
      leaveRequest: excused
        ? {
            status: "approved",
            reason: "Sick leave",
            note: "Doctor note uploaded",
          }
        : null,
    },
    {
      student: "other-student",
      status: "present",
    },
  ],
});

test("buildStudentAttendanceSummary calculates correct rate and warning logic when above/below 70%", () => {
  const studentId = "student-abc";

  // Case 1: Student is present 2 sessions, excused 1 session, absent 1 session.
  // Formula: (2 present + 1 excused) / 4 total * 100 = 75%.
  // 75% is >= 70%, so warning should be false.
  const sessions = [
    buildSession({ id: "s1", title: "Meeting 1", startsAt: "2025-02-01T08:00:00Z", studentId, status: "present" }),
    buildSession({ id: "s2", title: "Meeting 2", startsAt: "2025-02-05T08:00:00Z", studentId, status: "absent" }),
    buildSession({ id: "s3", title: "Meeting 3", startsAt: "2025-02-10T08:00:00Z", studentId, status: "present" }),
    buildSession({ id: "s4", title: "Meeting 4", startsAt: "2025-02-15T08:00:00Z", studentId, status: "pending", excused: true }),
  ];

  const summary = buildStudentAttendanceSummary(sessions, studentId);

  assert.equal(summary.totalSessions, 4);
  assert.equal(summary.presentSessions, 2);
  assert.equal(summary.absentSessions, 1);
  assert.equal(summary.excusedSessions, 1);
  assert.equal(summary.attendanceRate, 75.0);
  assert.equal(summary.warning, false);

  // Case 2: Student is present 1 session, absent 2 sessions.
  // Formula: 1 present / 3 total * 100 = 33.3%.
  // 33.3% is < 70%, so warning should be true.
  const badSessions = [
    buildSession({ id: "s1", title: "Meeting 1", startsAt: "2025-02-01T08:00:00Z", studentId, status: "present" }),
    buildSession({ id: "s2", title: "Meeting 2", startsAt: "2025-02-05T08:00:00Z", studentId, status: "absent" }),
    buildSession({ id: "s3", title: "Meeting 3", startsAt: "2025-02-10T08:00:00Z", studentId, status: "absent" }),
  ];

  const badSummary = buildStudentAttendanceSummary(badSessions, studentId);

  assert.equal(badSummary.totalSessions, 3);
  assert.equal(badSummary.attendanceRate, 33.3);
  assert.equal(badSummary.warning, true);
});

test("buildStudentAttendanceSummary orders meeting history chronologically by startsAt date", () => {
  const studentId = "student-abc";

  // Input sessions out of chronological order
  const sessions = [
    buildSession({ id: "s3", title: "Meeting 3", startsAt: "2025-02-10T08:00:00Z", studentId, status: "present" }),
    buildSession({ id: "s1", title: "Meeting 1", startsAt: "2025-02-01T08:00:00Z", studentId, status: "present" }),
    buildSession({ id: "s2", title: "Meeting 2", startsAt: "2025-02-05T08:00:00Z", studentId, status: "absent" }),
  ];

  const summary = buildStudentAttendanceSummary(sessions, studentId);

  assert.equal(summary.history[0]._id, "s1");
  assert.equal(summary.history[1]._id, "s2");
  assert.equal(summary.history[2]._id, "s3");
});
