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
