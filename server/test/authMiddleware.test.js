import test from "node:test";
import assert from "node:assert/strict";
import { isAuthorized } from "../middleware/authMiddleware.js";

test("isAuthorized allows request when user has permitted role", () => {
  const middleware = isAuthorized("Admin", "Teacher");
  
  const req = {
    user: {
      role: "Teacher",
    },
  };
  
  let nextCalled = false;
  let errorPassed = null;
  
  const next = (err) => {
    nextCalled = true;
    errorPassed = err;
  };

  middleware(req, {}, next);

  assert.equal(nextCalled, true);
  assert.equal(errorPassed, undefined);
});

test("isAuthorized blocks request and returns 403 Error when user has prohibited role", () => {
  const middleware = isAuthorized("Admin");
  
  const req = {
    user: {
      role: "Student",
    },
  };
  
  let nextCalled = false;
  let errorPassed = null;
  
  const next = (err) => {
    nextCalled = true;
    errorPassed = err;
  };

  middleware(req, {}, next);

  assert.equal(nextCalled, true);
  assert.notEqual(errorPassed, null);
  assert.equal(errorPassed.statusCode, 403);
  assert.equal(
    errorPassed.message,
    "Role Student is not authorized to access this resource"
  );
});
