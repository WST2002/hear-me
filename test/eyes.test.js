const test = require("node:test");
const assert = require("node:assert/strict");
const { eyeOpenness, createEyeClosure } = require("../src/core/eyes");
const { createLongBlink } = require("../src/core/switches");
const fixture = require("../fixtures/eyes-1.json");

// Runs the recorded eye points through closure detection and the long-blink switch; returns select times (s).
function selects(frames, opts) {
  const closure = createEyeClosure();
  const blink = createLongBlink(opts);
  const t0 = frames[0][0];
  return frames.filter(([t, eye]) => blink.update(t, closure.update(eyeOpenness(eye)))).map(([t]) => (t - t0) / 1000);
}

test("eye openness is about 0.35 for open eyes in the recording", () => {
  const values = fixture.frames.slice(0, 60).map(([, eye]) => eyeOpenness(eye)).sort();
  assert.ok(Math.abs(values[30] - 0.35) < 0.05, `median ${values[30]}`);
});

test("the recorded long closure (18.4 s to 22.1 s) selects exactly once, when the eyes open", () => {
  const fired = selects(fixture.frames, { minClosedMs: 500, maxClosedMs: 5000 });
  assert.equal(fired.length, 1, `fired at ${fired}`);
  assert.ok(fired[0] > 22 && fired[0] < 22.3, `fired at ${fired[0]}`);
});

test("natural blinks in the recording select nothing", () => {
  const before = fixture.frames.filter(([t]) => (t - fixture.frames[0][0]) / 1000 < 18);
  assert.deepEqual(selects(before, { minClosedMs: 500, maxClosedMs: 5000 }), []);
});

test("closure follows each person's own open-eye level", () => {
  const c = createEyeClosure({ ratio: 0.78 });
  for (let i = 0; i < 30; i++) c.update(0.25);
  assert.equal(c.update(0.24), false);
  assert.equal(c.update(0.15), true);
});

test("a gap in the data counts as closed only if the eyes were closing before it", () => {
  const c = createEyeClosure();
  for (let i = 0; i < 30; i++) c.update(0.35);
  assert.equal(c.update(null), false);
  c.update(0.2);
  assert.equal(c.update(null), true);
  assert.equal(c.update(0.35), false);
});
