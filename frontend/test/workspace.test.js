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
