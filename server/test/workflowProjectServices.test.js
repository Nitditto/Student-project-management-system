import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureTeacherOwnsProject,
  ensureProjectMember,
  ensureProjectEditable,
} from "../services/workflowProjectServices.js";

test("ensureTeacherOwnsProject allows designated supervisor and throws 403 error for others", () => {
  const validProject = {
    supervisor: "teacher-123",
  };

  // Normal pass
  assert.doesNotThrow(() => {
    ensureTeacherOwnsProject(validProject, "teacher-123");
  });

  // Invalid supervisor throws 403
  assert.throws(
    () => {
      ensureTeacherOwnsProject(validProject, "teacher-other");
    },
    (err) => {
      return err.statusCode === 403 && err.message === "Teacher is not assigned to this project";
    }
  );
});

test("ensureProjectMember allows valid student and throws 403 error for external users", () => {
  const project = {
    student: "student-1",
    members: ["student-1", "student-2"],
  };

  // Normal pass
  assert.doesNotThrow(() => {
    ensureProjectMember(project, "student-2");
  });

  // Invalid member throws 403
  assert.throws(
    () => {
      ensureProjectMember(project, "student-intruder");
    },
    (err) => {
      return err.statusCode === 403 && err.message === "User is not a member of this project";
    }
  );
});

test("ensureProjectEditable allows active projects and throws 400 error if archiveLocked is true", () => {
  const activeProject = {
    archiveLocked: false,
  };

  const archivedProject = {
    archiveLocked: true,
  };

  // Normal pass
  assert.doesNotThrow(() => {
    ensureProjectEditable(activeProject);
  });

  // Archived locked project throws 400
  assert.throws(
    () => {
      ensureProjectEditable(archivedProject);
    },
    (err) => {
      return (
        err.statusCode === 400 &&
        err.message === "Project has been archived after final defense and can no longer be edited"
      );
    }
  );
});
