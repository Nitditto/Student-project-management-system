import test from "node:test";
import assert from "node:assert/strict";
import {
  toIdString,
  isSameId,
  getProjectMemberIds,
  isProjectMember,
  generateSixDigitCode,
  generateQrToken,
  roundScore,
  computeAttendanceRate,
} from "../utils/workflowHelpers.js";

test("toIdString handles various input patterns", () => {
  assert.equal(toIdString(""), "");
  assert.equal(toIdString(null), "");
  assert.equal(toIdString(undefined), "");
  assert.equal(toIdString("abc"), "abc");
  assert.equal(toIdString({ _id: "12345" }), "12345");
  assert.equal(toIdString(123), "123");
});

test("isSameId correctly checks equality across forms", () => {
  assert.equal(isSameId("123", "123"), true);
  assert.equal(isSameId("123", { _id: "123" }), true);
  assert.equal(isSameId({ _id: "123" }, { _id: "123" }), true);
  assert.equal(isSameId("123", "456"), false);
  assert.equal(isSameId(null, "123"), false);
  assert.equal(isSameId("123", null), false);
  assert.equal(isSameId(null, null), false);
});

test("getProjectMemberIds returns unique combined array of representative and members", () => {
  const project = {
    student: "stud-1",
    members: ["stud-1", "stud-2", "stud-3", { _id: "stud-4" }],
  };

  const memberIds = getProjectMemberIds(project);
  assert.deepEqual(memberIds, ["stud-1", "stud-2", "stud-3", "stud-4"]);

  const emptyProject = {};
  assert.deepEqual(getProjectMemberIds(emptyProject), []);
});

test("isProjectMember verifies membership status correctly", () => {
  const project = {
    student: "stud-1",
    members: ["stud-1", "stud-2"],
  };

  assert.equal(isProjectMember(project, "stud-1"), true);
  assert.equal(isProjectMember(project, "stud-2"), true);
  assert.equal(isProjectMember(project, "stud-3"), false);
  assert.equal(isProjectMember(project, { _id: "stud-2" }), true);
});

test("generateSixDigitCode creates exactly 6 numeric characters string", () => {
  const code = generateSixDigitCode();
  assert.equal(typeof code, "string");
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);
});

test("generateQrToken creates valid hex string token", () => {
  const token = generateQrToken();
  assert.equal(typeof token, "string");
  assert.match(token, /^[0-9a-f]{32}$/);
});

test("roundScore rounds to specified decimal precision", () => {
  assert.equal(roundScore(4.3567), 4.36);
  assert.equal(roundScore(4.3567, 1), 4.4);
  assert.equal(roundScore(4.3567, 3), 4.357);
  assert.equal(roundScore(5), 5);
  assert.equal(roundScore(null), null);
  assert.equal(roundScore(undefined), null);
  assert.equal(roundScore("invalid"), null);
});

test("computeAttendanceRate processes attendance figures correctly", () => {
  assert.equal(
    computeAttendanceRate({
      totalSessions: 10,
      presentSessions: 8,
      excusedSessions: 1,
    }),
    90.0,
  );

  assert.equal(
    computeAttendanceRate({
      totalSessions: 8,
      presentSessions: 4,
      excusedSessions: 0,
    }),
    50.0,
  );

  assert.equal(
    computeAttendanceRate({
      totalSessions: 0,
      presentSessions: 0,
      excusedSessions: 0,
    }),
    0,
  );
});
