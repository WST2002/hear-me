// Eye closure from SmartSpectra face landmarks (MediaPipe face-mesh layout).
// The SDK's own blink flag marks only the moment of a blink, so a held blink is measured here instead.

// Indices of the six points around each eye: outer corner, two upper lid, inner corner, two lower lid.
const LEFT = [33, 160, 158, 133, 153, 144];
const RIGHT = [362, 385, 387, 263, 373, 380];
const EYE_POINTS = [...LEFT, ...RIGHT];

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const ratio = (p) => (dist(p[1], p[5]) + dist(p[2], p[4])) / (2 * dist(p[0], p[3]));

// Eye aspect ratio averaged over both eyes, from the 12 eye points in EYE_POINTS order.
// About 0.3-0.4 when open, under about 0.2 when closed.
function eyeOpenness(eye) {
  return (ratio(eye.slice(0, 6)) + ratio(eye.slice(6, 12))) / 2;
}

// Picks the 12 eye points out of a full 468/478-point landmark frame of {x, y} objects.
const eyePoints = (landmarks) => EYE_POINTS.map((i) => [landmarks[i].x, landmarks[i].y]);

// Closed when openness drops below `ratio` of this person's own open level (a slow running average).
// update(null) means "no landmarks this frame": the face tracker loses a face whose eyes are shut,
// so a gap right after the eyes started closing still counts as closed.
function createEyeClosure({ ratio: r = 0.78 } = {}) {
  let open = null;
  let closed = false;
  return {
    update(value) {
      if (value == null) return closed;
      if (open === null) open = value;
      closed = value < r * open;
      if (!closed) open = 0.95 * open + 0.05 * value;
      return closed;
    },
  };
}

module.exports = { eyeOpenness, eyePoints, createEyeClosure };
