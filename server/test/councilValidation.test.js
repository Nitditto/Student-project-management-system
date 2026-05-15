import test from "node:test";
import assert from "node:assert/strict";
import { getCouncilMembersValidationMessage } from "../utils/councilValidation.js";

test("accepts a council with exactly one chairman and one secretary", () => {
  const result = getCouncilMembersValidationMessage([
    { teacher: "teacher-a", role: "chairman", weight: 1.5 },
    { teacher: "teacher-b", role: "secretary", weight: 1 },
    { teacher: "teacher-c", role: "member", weight: 1 },
  ]);

  assert.equal(result, null);
});

test("rejects councils with more than one chairman", () => {
  const result = getCouncilMembersValidationMessage([
    { teacher: "teacher-a", role: "chairman", weight: 1.5 },
    { teacher: "teacher-b", role: "chairman", weight: 1 },
    { teacher: "teacher-c", role: "secretary", weight: 1 },
  ]);

  assert.equal(result, "Council must have exactly one chairman");
});

test("rejects councils with duplicate teachers", () => {
  const result = getCouncilMembersValidationMessage([
    { teacher: "teacher-a", role: "chairman", weight: 1.5 },
    { teacher: "teacher-a", role: "secretary", weight: 1 },
  ]);

  assert.equal(result, "Council members must not contain duplicate teachers");
});
