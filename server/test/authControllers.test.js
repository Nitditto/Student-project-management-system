import test from "node:test";
import assert from "node:assert/strict";
import { registerUser, loginUser } from "../controllers/authController.js";
import { User } from "../models/user.js";

process.env.COOKIE_EXPIRE = "5";

// Save original Mongoose methods to restore them after testing
const originalFindOne = User.findOne;
const originalCreate = User.create;

test("registerUser successfully registers new user and issues JWT (TC-AUTH-01)", async () => {
  // Mock User.findOne to simulate that user does not exist
  User.findOne = async () => null;

  // Mock User.create to return a simulated saved user object
  User.create = async (payload) => {
    return {
      ...payload,
      _id: "mocked-user-id",
      generateToken: () => "mocked-jwt-token",
    };
  };

  const req = {
    body: {
      name: "Nguyễn Văn A",
      email: "student.a@school.edu.vn",
      password: "Pass1234!",
      role: "Student",
    },
  };

  let responseStatus = null;
  let responseJson = null;
  let cookiesSet = {};

  let resolvePromise;
  const donePromise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const res = {
    status(code) {
      responseStatus = code;
      return this;
    },
    cookie(name, val, options) {
      cookiesSet[name] = val;
      return this;
    },
    json(data) {
      responseJson = data;
      resolvePromise();
      return this;
    },
  };

  let nextCalled = false;
  let nextError = null;
  const next = (err) => {
    nextCalled = true;
    nextError = err;
    resolvePromise();
  };

  registerUser(req, res, next);
  await donePromise;

  assert.equal(nextCalled, false);
  assert.equal(responseStatus, 201);
  assert.equal(cookiesSet.token, "mocked-jwt-token");
  assert.equal(responseJson.success, true);
  assert.equal(responseJson.user.name, "Nguyễn Văn A");
  assert.equal(responseJson.token, "mocked-jwt-token");

  // Restore methods
  User.findOne = originalFindOne;
  User.create = originalCreate;
});

test("registerUser returns 400 error when fields are incomplete", async () => {
  const req = {
    body: {
      name: "",
      email: "student.a@school.edu.vn",
      password: "Pass1234!",
      role: "",
    },
  };

  let resolvePromise;
  const donePromise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  let nextError = null;
  const next = (err) => {
    nextError = err;
    resolvePromise();
  };

  registerUser(req, {}, next);
  await donePromise;

  assert.notEqual(nextError, null);
  assert.equal(nextError.statusCode, 400);
  assert.equal(nextError.message, "Please provide all required fields");
});

test("loginUser returns 401 error on invalid login credentials (TC-AUTH-02)", async () => {
  // Mock User.findOne to simulate matching user not found
  User.findOne = () => {
    return {
      select: () => null,
    };
  };

  const req = {
    body: {
      email: "student.a@school.edu.vn",
      password: "SaiMatKhau123",
      role: "Student",
    },
  };

  let resolvePromise;
  const donePromise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  let nextError = null;
  const next = (err) => {
    nextError = err;
    resolvePromise();
  };

  loginUser(req, {}, next);
  await donePromise;

  assert.notEqual(nextError, null);
  assert.equal(nextError.statusCode, 401);
  assert.equal(nextError.message, "Invalid email, password or role");

  // Restore methods
  User.findOne = originalFindOne;
});
