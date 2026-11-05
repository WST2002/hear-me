// Webcam probe: does SmartSpectra see blinks, talking, expressions and breathing on this laptop?
// Usage: node tools/camera-check.mjs [seconds]   (reads SMARTSPECTRA_API_KEY from .env)
import fs from "node:fs";
import { SmartSpectraSDK, CameraSelection, breathingMetrics, faceMetrics, decodeMetrics } from "@smartspectra/node-sdk";

const env = Object.fromEntries(fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const apiKey = env.SMARTSPECTRA_API_KEY;
if (!apiKey || apiKey.startsWith("PASTE_")) throw new Error("API key missing: paste it into .env as SMARTSPECTRA_API_KEY=...");

const seconds = Number(process.argv[2] ?? 40);
const sdk = new SmartSpectraSDK({ apiKey, requestedMetrics: process.argv.includes("--breathing") ? [...faceMetrics, ...breathingMetrics] : [...faceMetrics], enableTelemetry: false });
let first = true;
sdk.on("processingStatus", (s) => console.log("status:", s));
sdk.on("validationStatus", (code, _ts, hint) => console.log("validation:", code, hint ?? ""));
sdk.on("error", (code, message) => console.log("error:", code, message));
sdk.on("metrics", (buf, ts) => {
  const m = decodeMetrics(buf);
  if (first) { console.log("first metrics keys:", JSON.stringify(m, (k, v) => (Array.isArray(v) && v.length > 3 ? `[${v.length} items]` : v)).slice(0, 1500)); first = false; }
  const face = m.face ?? {};
  const last = (a) => (Array.isArray(a) && a.length ? a[a.length - 1] : undefined);
  console.log(`t=${(Number(ts) / 1e6).toFixed(1)}s blink=${JSON.stringify(last(face.blinking))} talk=${JSON.stringify(last(face.talking))} expr=${JSON.stringify(last(face.expression)?.scores)?.slice(0, 120)} breath=${JSON.stringify(last(m.breathing?.rate))}`);
});
// Summary at the end: every field path seen, and how often each face signal fired.
const seen = new Map();
const walk = (o, p) => { for (const [k, v] of Object.entries(o ?? {})) { const q = `${p}.${k}`; seen.set(q, (seen.get(q) ?? 0) + 1); if (v && typeof v === "object" && !Array.isArray(v)) walk(v, q); else if (Array.isArray(v) && v[0] && typeof v[0] === "object") walk(v[0], `${q}[]`); } };
sdk.on("metrics", (buf) => walk(decodeMetrics(buf), "m"));
process.on("exit", () => console.log("FIELDS:\n" + [...seen].map(([k, n]) => `${n}\t${k}`).join("\n")));
console.log("cameras:", JSON.stringify(SmartSpectraSDK.availableCameras()));
const real = SmartSpectraSDK.availableCameras().find((c) => !/virtual/i.test(c.name));
console.log("using", real?.name ?? "default camera");
sdk.useCamera(real ? CameraSelection.byId(real.id) : CameraSelection.default, { width: 640, height: 360 });
sdk.start();
setTimeout(async () => { await sdk.stopAsync(); await sdk.destroy(); process.exit(0); }, seconds * 1000);
