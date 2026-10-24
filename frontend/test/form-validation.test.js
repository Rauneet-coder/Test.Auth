import test from "node:test";
import assert from "node:assert/strict";
import * as validation from "../src/lib/formValidation.js";

test("email accepts mixed case and plus addressing", () => {
  assert.equal(validation.validateEmail("Test.User+news@Example.com"), "");
});
test("email rejects blank, malformed, and whitespace-padded identifiers", () => {
  for (const value of ["", "   ", "someone", "a@@example.com", "a b@example.com", " a@example.com "]) {
    assert.notEqual(validation.validateEmail(value), "", value);
  }
});

test("registration matches backend policy without inventing lowercase requirements", () => {
  assert.equal(validation.validatePassword("PASSWORD1!", true), "");
  assert.equal(validation.validatePassword("Password1 ", true), "");
});
test("registration detects each missing password requirement", () => {
  for (const value of ["A1!", "password1!", "Password!", "Password1"]) {
    assert.notEqual(validation.validatePassword(value, true), "", value);
  }
  assert.equal(validation.getPasswordRequirements("Password1!").every(({ met }) => met), true);
});
test("login accepts existing passwords without registration policy", () => {
  assert.equal(validation.validatePassword("old", false), "");
  assert.notEqual(validation.validatePassword("", false), "");
});

test("username length boundaries match the backend", () => {
  assert.notEqual(validation.validateUsername("ab"), "");
  assert.equal(validation.validateUsername("abc"), "");
  assert.equal(validation.validateUsername("a".repeat(30)), "");
  assert.notEqual(validation.validateUsername("a".repeat(31)), "");
});
test("username does not gain an unsupported character restriction", () => {
  assert.equal(validation.validateUsername("Alex Morgan"), "");
  assert.equal(validation.validateUsername("alex.morgan"), "");
});

test("OTP normalization preserves zeroes and supports formatted paste", () => {
  assert.equal(validation.normalizeOtp("01 23-45"), "012345");
  assert.equal(validation.normalizeOtp("code: 1234567"), "123456");
  assert.equal(validation.normalizeOtp("abcdef"), "");
});
test("OTP requires exactly six ASCII digits", () => {
  assert.equal(validation.validateOtp("012345"), "");
  for (const value of ["", "12345", "1234567", "12a456", "１２３４５６"]) {
    assert.notEqual(validation.validateOtp(value), "", value);
  }
});

test("each mode requires only the fields used by its endpoint", () => {
  assert.deepEqual(validation.validateForm("login", { email: "a@example.com", password: "old" }), {});
  assert.deepEqual(validation.validateForm("verify", { email: "a@example.com", otp: "012345" }), {});
  assert.deepEqual(validation.validateForm("register", { username: "Alex", email: "a@example.com", password: "PASSWORD1!" }), {});
});
test("registration reports all invalid fields but does not require OTP", () => {
  assert.deepEqual(Object.keys(validation.validateForm("register", {})).sort(), ["email", "password", "username"]);
});
test("verification still requires an email when a valid code is present", () => {
  assert.deepEqual(Object.keys(validation.validateForm("verify", { otp: "123456" })), ["email"]);
});
