const test = require("node:test");
const assert = require("node:assert/strict");
const { blinkDurations, longBlinkThreshold } = require("../src/core/calibrate");

test("blinkDurations measures each closed run from per-frame samples", () => {
  const frames = [];
  const add = (from, to, closed) => { for (let t = from; t < to; t += 33) frames.push([t, closed]); };
  add(0, 1000, false); add(1000, 1150, true); add(1150, 2000, false); add(2000, 2800, true); add(2800, 3000, false);
  const d = blinkDurations(frames);
  assert.equal(d.length, 2);
  assert.ok(Math.abs(d[0] - 165) < 40);
  assert.ok(Math.abs(d[1] - 825) < 40);
});

test("the threshold sits between natural and deliberate blinks", () => {
  const t = longBlinkThreshold([120, 150, 180, 200, 260], [700, 800, 900]);
  assert.ok(t > 260 && t < 700, `got ${t}`);
});

test("the threshold never drops below 500 ms, so natural blinks stay ignored", () => {
  assert.equal(longBlinkThreshold([100, 120], [300, 320, 340]), 500);
});

test("a slow natural closure (looking down, about 450 ms) never selects after calibration", () => {
  assert.ok(longBlinkThreshold([150, 200, 450], [480, 520, 600]) > 450);
});

test("with no deliberate blinks it keeps the default", () => {
  assert.equal(longBlinkThreshold([100, 150], []), 500);
});
