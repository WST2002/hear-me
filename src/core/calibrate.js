// Calibration: every person blinks differently, so the long-blink threshold is set from their own blinks.

// Durations (ms) of each closed-eye run in a list of [timeMs, closed] frames.
function blinkDurations(frames) {
  const out = [];
  let since = null;
  let last = null;
  for (const [t, closed] of frames) {
    if (closed && since === null) since = t;
    if (!closed && since !== null) {
      out.push(t - since);
      since = null;
    }
    last = t;
  }
  if (since !== null && last !== null) out.push(last - since);
  return out;
}

const percentile = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

// Halfway between their longer natural blinks and their shorter deliberate ones; never below 350 ms.
function longBlinkThreshold(natural, deliberate, { floorMs = 350, defaultMs = 500 } = {}) {
  if (!deliberate.length) return defaultMs;
  const high = natural.length ? percentile(natural, 0.9) : 0;
  const low = percentile(deliberate, 0.25);
  return Math.max(floorMs, Math.round((high + low) / 2));
}

module.exports = { blinkDurations, longBlinkThreshold };
