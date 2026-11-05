// Records every face sample SmartSpectra sends (blinking, talking, expression, landmarks) to a JSON file,
// so switch logic can be tuned on real data. Usage: node tools/record-face.mjs out.json [seconds]
import fs from "node:fs";
import { SmartSpectraSDK, CameraSelection, faceMetrics, decodeMetrics } from "@smartspectra/node-sdk";

const env = Object.fromEntries(fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const [out, seconds = "30"] = process.argv.slice(2);
const toMs = (ts) => (typeof ts?.toNumber === "function" ? ts.toNumber() : Number(ts)) / 1000;
const rec = { blinking: [], talking: [], expression: [], landmarks: [], validation: [] };

const sdk = new SmartSpectraSDK({ apiKey: env.SMARTSPECTRA_API_KEY, requestedMetrics: [...faceMetrics], enableTelemetry: false });
sdk.on("validationStatus", (code, ts, hint) => rec.validation.push([Number(ts) / 1000, code, hint]));
sdk.on("metrics", (buf) => {
  const face = decodeMetrics(buf).face ?? {};
  for (const s of face.blinking ?? []) rec.blinking.push([toMs(s.timestamp), Boolean(s.detected)]);
  for (const s of face.talking ?? []) rec.talking.push([toMs(s.timestamp), Boolean(s.detected)]);
  for (const e of face.expression ?? []) rec.expression.push([toMs(e.timestamp), (e.scores ?? []).map((x) => [x.type, x.confidence])]);
  for (const l of face.landmarks ?? []) rec.landmarks.push([toMs(l.timestamp), (l.value ?? []).map((p) => [p.x, p.y])]);
});
const real = SmartSpectraSDK.availableCameras().find((c) => !/virtual/i.test(c.name));
sdk.useCamera(real ? CameraSelection.byId(real.id) : CameraSelection.default, { width: 1280, height: 720 });
sdk.start();
console.log(`recording ${seconds}s from ${real?.name ?? "default camera"}`);
setTimeout(async () => {
  await sdk.stopAsync();
  await sdk.destroy();
  fs.writeFileSync(out, JSON.stringify(rec));
  console.log(`saved ${out}: blinking ${rec.blinking.length}, landmarks ${rec.landmarks.length}, points per frame ${rec.landmarks[0]?.[1].length ?? 0}`);
  process.exit(0);
}, Number(seconds) * 1000);
