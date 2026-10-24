import test from "node:test";
import assert from "node:assert/strict";
import { AUTH_ACTIONS, getAction, modeFromPath, pathFromMode } from "../src/lib/workspace.js";

test("action metadata contains only the seven supported backend routes", () => {
  assert.equal(Object.keys(AUTH_ACTIONS).length, 7);
  assert.deepEqual(getAction("getMe"), { method: "GET", path: "/api/auth/me" });
  assert.throws(() => getAction("resetPassword"));
  assert.throws(() => getAction("toString"));
});

test("form modes map to routes with a predictable login fallback", () => {
  for (const mode of ["login", "register", "verify"]) {
    assert.equal(modeFromPath(pathFromMode(mode)), mode);
  }
  assert.equal(modeFromPath("/verify/"), "verify");
  assert.equal(modeFromPath("/unrecognized"), "login");
});

test("payloads preserve email case, password spaces, and verification leading zeroes", async () => {
  const { payloadForAction } = await import("../src/lib/workspace.js");
  const fields = { username: "  Alex  ", email: "  Alex@Example.com  ", password: " Pa ss! ", otp: "012345", extra: "secret" };
  assert.deepEqual(payloadForAction("register", fields), { username: "Alex", email: "Alex@Example.com", password: " Pa ss! " });
  assert.deepEqual(payloadForAction("login", fields), { email: "Alex@Example.com", password: " Pa ss! " });
  assert.deepEqual(payloadForAction("verifyEmail", fields), { email: "Alex@Example.com", otp: "012345" });
  assert.equal(payloadForAction("getMe", fields), undefined);
});

test("activity redaction deeply hides credentials without mutating API responses", async () => {
  const { redactData } = await import("../src/lib/workspace.js");
  const response = { accessToken: "sensitive", user: { email: "Alex@example.com" }, nested: [{ password: "secret", OTP: "001234", authorization: "Bearer secret" }], message: "eyJhbGciOiJub25lIn0.eyJleHAiOjF9.signature" };
  const safe = redactData(response);
  assert.equal(safe.accessToken, "[hidden]");
  assert.equal(safe.nested[0].OTP, "[hidden]");
  assert.equal(safe.nested[0].password, "[hidden]");
  assert.equal(safe.nested[0].authorization, "[hidden]");
  assert.equal(safe.message, "[hidden]");
  assert.equal(response.nested[0].password, "secret");
  assert.equal(safe.user.email, "Alex@example.com");
  const cycle = {}; cycle.self = cycle;
  assert.equal(redactData(cycle).self, "[circular]");
});
