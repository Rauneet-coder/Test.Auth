import test from "node:test";
import assert from "node:assert/strict";
import { assertAuthResponse } from "../src/services/api.js";

test("success validation rejects HTML, arrays, empty data and incomplete identities", () => {
  for (const data of ["<html>fallback</html>", [], null, {}, { message: "OK" }, { message: "OK", user: { username: "Alex" } }]) {
    assert.throws(() => assertAuthResponse("login", { status: 200, data }), { code: "INVALID_RESPONSE" });
  }
});

test("success validation requires tokens only on token-issuing endpoints", () => {
  const data = { message: "OK", user: { username: "Alex", email: "Alex@example.com" } };
  assert.throws(() => assertAuthResponse("refreshToken", { status: 200, data }));
  assert.equal(assertAuthResponse("getMe", { status: 200, data }).data, data);
  assert.equal(assertAuthResponse("login", { status: 200, data: { ...data, accessToken: "memory-token" } }).status, 200);
});

test("request errors distinguish offline, timeout and unavailable backend", async () => {
  const { describeRequestError } = await import("../src/services/api.js");
  assert.equal(describeRequestError({}, { online: false }).kind, "offline");
  assert.equal(describeRequestError({ code: "ECONNABORTED" }).kind, "timeout");
  assert.equal(describeRequestError({ code: "ERR_NETWORK" }).kind, "connection");
  assert.equal(describeRequestError({ response: { status: 500, data: "<html>error</html>" } }).message, "Request failed (500). Please try again.");
});

test("unexpected backend error shapes cannot break error handling", async () => {
  const { describeRequestError } = await import("../src/services/api.js");
  assert.equal(describeRequestError({ response: { status: 400, data: { errors: "wrong shape", message: "Invalid email" } } }).message, "Invalid email");
  assert.equal(describeRequestError({ response: { status: 400, data: { errors: [{ message: "Use a valid email." }, null, { message: 2 }] } } }).message, "Use a valid email.");
});
