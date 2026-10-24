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
