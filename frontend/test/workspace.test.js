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

test("activity keeps 50 newest entries with unique IDs and ISO timestamps", async () => {
  const { createActivityEntry, appendActivity } = await import("../src/lib/workspace.js");
  const now = new Date("2026-10-24T10:00:00.000Z");
  let history = [];
  for (let index = 0; index < 60; index++) {
    history = appendActivity(history, createActivityEntry("login", 200, 12.7, { accessToken: "secret", index }, now));
  }
  assert.equal(history.length, 50);
  assert.equal(new Set(history.map(({ id }) => id)).size, 50);
  assert.equal(history[0].data.index, 59);
  assert.equal(history[0].duration, 13);
  assert.equal(history[0].time, now.toISOString());
  assert.equal(history[0].path, "/api/auth/login");
  assert.equal(history[0].data.accessToken, "[hidden]");
});

test("a synchronous request lock prevents duplicate requests before React rerenders", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: useAuthWorkspace } = await import("../src/hooks/useAuthWorkspace.js");
  const { default: api } = await import("../src/services/api.js");
  const previous = api.defaults.adapter;
  let dispatches = 0;
  let workspace;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  api.defaults.adapter = async (config) => {
    dispatches++;
    await pending;
    return { status: 200, data: { message: "Signed out" }, config };
  };
  function Probe() { workspace = useAuthWorkspace(); return null; }
  try {
    renderToStaticMarkup(createElement(Probe));
    const first = workspace.run("logout");
    const duplicate = await workspace.run("logout");
    assert.equal(duplicate, null);
    release();
    await first;
    assert.equal(dispatches, 1);
    await workspace.run("logout");
    assert.equal(dispatches, 2, "lock releases after completion");
  } finally {
    release();
    api.defaults.adapter = previous;
  }
});

test("rendering the workspace never automatically refreshes or dispatches auth requests", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: useAuthWorkspace } = await import("../src/hooks/useAuthWorkspace.js");
  const { default: api } = await import("../src/services/api.js");
  const previous = api.defaults.adapter;
  let dispatches = 0;
  api.defaults.adapter = async () => { dispatches++; throw new Error("Unexpected request"); };
  function Probe() {
    const workspace = useAuthWorkspace();
    assert.equal(workspace.sessionStatus, "signed-out");
    assert.equal(workspace.busy, "");
    return null;
  }
  try {
    renderToStaticMarkup(createElement(Probe));
    renderToStaticMarkup(createElement(Probe));
    await Promise.resolve();
    assert.equal(dispatches, 0);
  } finally { api.defaults.adapter = previous; }
});
