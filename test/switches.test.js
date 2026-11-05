const test = require("node:test");
const assert = require("node:assert/strict");
const { createLongBlink, createExpressionHold, createTalkGate } = require("../src/core/switches");

// Feeds a list of [ms, value] samples at 30 fps between the given times.
function feed(detector, from, to, value) {
  const fired = [];
  for (let t = from; t < to; t += 33) if (detector.update(t, value)) fired.push(t);
  return fired;
}

test("a natural blink (150 ms) does not select", () => {
  const d = createLongBlink();
  feed(d, 0, 1000, false);
  assert.deepEqual(feed(d, 1000, 1150, true), []);
  assert.deepEqual(feed(d, 1150, 2000, false), []);
});

test("a long blink (700 ms) selects once, when the eyes open again", () => {
  const d = createLongBlink();
  feed(d, 0, 1000, false);
  assert.deepEqual(feed(d, 1000, 1700, true), []);
  const fired = feed(d, 1700, 2500, false);
  assert.equal(fired.length, 1);
  assert.ok(fired[0] < 1750);
});

test("eyes closed for longer than the limit (resting) do not select", () => {
  const d = createLongBlink({ maxClosedMs: 2000 });
  feed(d, 0, 500, false);
  feed(d, 500, 4000, true);
  assert.deepEqual(feed(d, 4000, 5000, false), []);
});

test("the long-blink threshold is configurable", () => {
  const d = createLongBlink({ minClosedMs: 300 });
  feed(d, 0, 500, false);
  feed(d, 500, 900, true);
  assert.equal(feed(d, 900, 1200, false).length, 1);
});

test("a held expression selects once after holdMs, then needs a release", () => {
  const d = createExpressionHold({ holdMs: 400 });
  assert.deepEqual(feed(d, 0, 300, true), []);
  const fired = feed(d, 300, 2000, true);
  assert.equal(fired.length, 1);
  assert.ok(fired[0] >= 400 && fired[0] < 450);
  feed(d, 2000, 2300, false);
  assert.equal(feed(d, 2300, 3000, true).length, 1);
});

test("a flicker of the expression shorter than holdMs does not select", () => {
  const d = createExpressionHold({ holdMs: 400 });
  for (let i = 0; i < 5; i++) {
    assert.deepEqual(feed(d, i * 400, i * 400 + 200, true), []);
    feed(d, i * 400 + 200, i * 400 + 400, false);
  }
});

test("the talk gate stays closed while talking and for a grace period after", () => {
  const g = createTalkGate({ graceMs: 1500 });
  assert.equal(g.update(0, false), true);
  assert.equal(g.update(100, true), false);
  assert.equal(g.update(1000, true), false);
  assert.equal(g.update(2500, false), false);
  assert.equal(g.update(2700, false), true);
});
