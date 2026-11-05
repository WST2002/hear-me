// Turns per-frame camera signals into deliberate "select" presses.
// Each detector takes update(timeMs, value) once per frame and returns true on the frame the press happens.

// A blink held longer than a natural one (natural blinks last ~100-300 ms). Fires when the eyes open again,
// so a person resting with closed eyes (longer than maxClosedMs) never selects anything.
function createLongBlink({ minClosedMs = 500, maxClosedMs = 2000 } = {}) {
  let closedSince = null;
  return {
    update(t, closed) {
      if (closed) {
        if (closedSince === null) closedSince = t;
        return false;
      }
      if (closedSince === null) return false;
      const held = t - closedSince;
      closedSince = null;
      return held >= minClosedMs && held <= maxClosedMs;
    },
  };
}

// An expression (for example raised eyebrows / surprise) held for holdMs. Fires once, then waits for a release.
function createExpressionHold({ holdMs = 400 } = {}) {
  let since = null;
  let fired = false;
  return {
    update(t, active) {
      if (!active) {
        since = null;
        fired = false;
        return false;
      }
      if (since === null) since = t;
      if (!fired && t - since >= holdMs) {
        fired = true;
        return true;
      }
      return false;
    },
  };
}

// Open (true) only when the person has not been talking for graceMs, so speech never triggers a select.
function createTalkGate({ graceMs = 1500 } = {}) {
  let lastTalk = -Infinity;
  return {
    update(t, talking) {
      if (talking) lastTalk = t;
      return t - lastTalk > graceMs;
    },
  };
}

module.exports = { createLongBlink, createExpressionHold, createTalkGate };
