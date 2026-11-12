const test = require("node:test");
const assert = require("node:assert/strict");
const { errorAdvice } = require("../src/core/errors");

test("credits used up: stop retrying and say what to do", () => {
  const a = errorAdvice(4, "SmartSpectra measurement credits have been exhausted.", false);
  assert.equal(a.retry, false);
  assert.equal(a.askKey, true);
  assert.match(a.text, /credits/i);
  assert.match(a.text, /physiology\.presagetech\.com/);
});

test("wrong key: stop retrying and ask for the key again", () => {
  const a = errorAdvice(2, "Authentication failed", false);
  assert.equal(a.retry, false);
  assert.equal(a.askKey, true);
  assert.match(a.text, /key/i);
});

test("a busy laptop (processing failed) or a network blip is retried", () => {
  assert.equal(errorAdvice(8, "fps below 25", true).retry, true);
  assert.equal(errorAdvice(5, "network", true).retry, true);
});

test("an unknown error the SDK marks as not retryable is not retried forever", () => {
  const a = errorAdvice(3, "Configuration failed", false);
  assert.equal(a.retry, false);
  assert.match(a.text, /Configuration failed/);
});
