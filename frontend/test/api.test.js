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
