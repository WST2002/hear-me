// Feeds a recorded clip through SmartSpectra frame by frame (custom input, real-time pace) and saves the eye
// landmarks, so switch logic can be checked on a real face without sitting in front of the camera.
// Usage: node tools/replay-face.mjs clip.mp4 out.json [width] [height]
import fs from "node:fs";
import { spawn } from "node:child_process";
import { SmartSpectraSDK, faceMetrics, decodeMetrics, FrameTransform, PixelFormat } from "@smartspectra/node-sdk";

const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const env = Object.fromEntries(fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const [clip, out, w = "640", h = "360"] = process.argv.slice(2);
const W = Number(w), H = Number(h), FRAME = W * H * 3;
const EYE = [33, 160, 158, 133, 153, 144, 362, 385, 387, 263, 373, 380];
const toMs = (ts) => (typeof ts?.toNumber === "function" ? ts.toNumber() : Number(ts)) / 1000;
const rec = { size: [W, H], frames: [], blinkFlags: [] };

const sdk = new SmartSpectraSDK({ apiKey: env.SMARTSPECTRA_API_KEY, requestedMetrics: [...faceMetrics], enableTelemetry: false });
sdk.on("metrics", (buf) => {
  const face = decodeMetrics(buf).face ?? {};
  for (const l of face.landmarks ?? []) {
    const p = l.value ?? [];
    if (p.length >= 468) rec.frames.push([Math.round(toMs(l.timestamp)), EYE.map((i) => [p[i].x, p[i].y])]);
  }
  for (const s of face.blinking ?? []) if (s.detected) rec.blinkFlags.push(Math.round(toMs(s.timestamp)));
});
sdk.useCustomInput(FrameTransform.kNone);
sdk.start();

const ff = spawn(FFMPEG, ["-loglevel", "error", "-i", clip, "-vf", `scale=${W}:${H}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"]);
let pending = Buffer.alloc(0);
const queue = [];
ff.stdout.on("data", (d) => {
  pending = Buffer.concat([pending, d]);
  while (pending.length >= FRAME) { queue.push(pending.subarray(0, FRAME)); pending = pending.subarray(FRAME); }
});
const t0 = Date.now() * 1000;
let n = 0;
const timer = setInterval(async () => {
  const frame = queue.shift();
  if (frame) {
    sdk.sendFrame(Buffer.from(frame), W, H, W * 3, PixelFormat.kRGB, t0 + n * 33333);
    n++;
    return;
  }
  if (ff.exitCode === null) return;
  clearInterval(timer);
  setTimeout(async () => {
    await sdk.stopAsync();
    await sdk.destroy();
    fs.writeFileSync(out, JSON.stringify(rec));
    console.log(`fed ${n} frames at ${W}x${H}; landmark frames ${rec.frames.length}; blink flags ${rec.blinkFlags.length}`);
    process.exit(0);
  }, 2000);
}, 33);
