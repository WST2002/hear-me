// Benchmark the long-blink switch on recorded eye landmarks (no camera, no SDK, no credits needed).
// Usage: node tools/benchmark.mjs
// Each clip lists how many deliberate long blinks it really contains (written down when it was recorded).
// It reports natural blinks seen, false selects, missed long blinks and how fast a select follows the eyes opening.
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { eyeOpenness, createEyeClosure } = require("../src/core/eyes");
const { createLongBlink } = require("../src/core/switches");
const { blinkDurations } = require("../src/core/calibrate");

const CLIPS = [
  { file: "fixtures/eyes-1.json", long: 1, about: "eyes open, natural blinks, one long closure (18.4–22.1 s)" },
  { file: "fixtures/private/seg-warm.json", long: 0, about: "eyes open, natural blinks only" },
  { file: "fixtures/private/seg-blink.json", long: 1, about: "one deliberate ~1 s blink" },
];
const MIN_MS = 500;
const MAX_MS = 5000;

const rows = [];
for (const clip of CLIPS) {
  if (!fs.existsSync(clip.file)) continue;
  const { frames } = JSON.parse(fs.readFileSync(clip.file, "utf8"));
  const closure = createEyeClosure();
  const blink = createLongBlink({ minClosedMs: MIN_MS, maxClosedMs: MAX_MS });
  const closedFrames = [];
  const selects = [];
  let lastOpenAfterClose = null;
  let wasClosed = false;
  for (const [t, eye] of frames) {
    const closed = closure.update(eye ? eyeOpenness(eye) : null);
    closedFrames.push([t, closed]);
    if (wasClosed && !closed) lastOpenAfterClose = t;
    wasClosed = closed;
    if (blink.update(t, closed)) selects.push({ t, latency: lastOpenAfterClose === null ? 0 : t - lastOpenAfterClose });
  }
  const closures = blinkDurations(closedFrames);
  const natural = closures.filter((d) => d < MIN_MS).length;
  const seconds = (frames.at(-1)[0] - frames[0][0]) / 1000;
  const hits = Math.min(selects.length, clip.long);
  rows.push({
    clip: clip.file.split("/").pop(), about: clip.about, seconds: seconds.toFixed(1),
    natural, longExpected: clip.long, selects: selects.length,
    falseSelects: Math.max(0, selects.length - clip.long), missed: clip.long - hits,
    latencyMs: selects.map((s) => Math.round(s.latency)).join(", ") || "-",
  });
}

const total = (k) => rows.reduce((s, r) => s + Number(r[k]), 0);
console.log("| clip | what it contains | length (s) | natural blinks | long blinks | selects | false selects | missed | select comes (ms after the eyes open) |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (const r of rows) console.log(`| ${r.clip} | ${r.about} | ${r.seconds} | ${r.natural} | ${r.longExpected} | ${r.selects} | ${r.falseSelects} | ${r.missed} | ${r.latencyMs} |`);
console.log(`\nTotal: ${total("seconds").toFixed(1)} s of recordings, ${total("natural")} natural blinks, ${total("falseSelects")} false selects, ${total("longExpected") - total("missed")}/${total("longExpected")} long blinks selected.`);
console.log("One person, development data, threshold 500 ms. This shows the method, not accuracy across people.");
