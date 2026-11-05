const test = require("node:test");
const assert = require("node:assert/strict");
const { createBurst } = require("../src/core/alarm");

test("three selects within the window raise the alarm", () => {
  const b = createBurst({ count: 3, withinMs: 6000 });
  assert.equal(b.press(0), false);
  assert.equal(b.press(2000), false);
  assert.equal(b.press(4000), true);
});

test("selects spread over a longer time do not raise it", () => {
  const b = createBurst({ count: 3, withinMs: 6000 });
  b.press(0);
  b.press(4000);
  assert.equal(b.press(8000), false);
  assert.equal(b.press(9000), true);
});

test("after an alarm the count starts again", () => {
  const b = createBurst({ count: 3, withinMs: 6000 });
  b.press(0); b.press(100); b.press(200);
  assert.equal(b.press(300), false);
  assert.equal(b.press(400), false);
  assert.equal(b.press(500), true);
});
