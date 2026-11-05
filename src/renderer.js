// Palak renderer: camera signals from SmartSpectra -> select switches -> row-column scanner -> spoken phrase.
const { SmartSpectraSDK, faceMetrics } = require("@smartspectra/node-sdk/renderer");
const { decodeMetrics } = require("@smartspectra/node-sdk/messages");
const { createLongBlink, createExpressionHold, createTalkGate } = require("./core/switches");
const { createScanner } = require("./core/scanner");
const { board } = require("./phrases");

const SURPRISE = 8; // presage.smartspectra.ExpressionType.SURPRISE
const $ = (id) => document.getElementById(id);

const scanner = createScanner(board.map((r) => r.items));
const longBlink = createLongBlink();
const brows = createExpressionHold({ holdMs: 400 });
const gate = createTalkGate();
let sdk = null;
let stream = null;
let gateOpen = true;
let lastTick = 0;

const toMs = (ts) => (typeof ts?.toNumber === "function" ? ts.toNumber() : Number(ts)) / 1000;

function drawBoard() {
  const { mode, row, cell } = scanner.state();
  $("board").innerHTML = board
    .map((r, i) => {
      const rowLit = i === row;
      const cells = r.items
        .map(([en, hi], j) => `<div class="cell${rowLit && mode === "cells" && cell === j ? " lit" : ""}">${en}<small>${hi}</small></div>`)
        .join("");
      const back = `<div class="cell back${rowLit && cell === "back" ? " lit" : ""}">Back</div>`;
      return `<div class="row${rowLit ? " lit" : ""}"><div class="name">${r.row}</div>${cells}${back}</div>`;
    })
    .join("");
}

function speak([en, hi]) {
  const hindi = $("hindi").checked;
  const text = hindi ? hi : en;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = hindi ? "hi-IN" : "en-IN";
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith(hindi ? "hi" : "en"));
  if (voice) u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  $("said").textContent = `${en} · ${hi}`;
  const item = document.createElement("li");
  item.textContent = `${new Date().toLocaleTimeString()}  ${en}`;
  $("history").prepend(item);
}

function onSelect(now) {
  const value = scanner.select();
  lastTick = now;
  if (value) speak(value);
  drawBoard();
}

function onMetrics(buf) {
  const face = decodeMetrics(buf).face;
  if (!face) return;
  for (const s of face.talking ?? []) gateOpen = gate.update(toMs(s.timestamp), Boolean(s.detected));
  for (const s of face.blinking ?? []) {
    if (longBlink.update(toMs(s.timestamp), Boolean(s.detected)) && gateOpen) onSelect(performance.now());
  }
  if ($("use-brows").checked) {
    for (const e of face.expression ?? []) {
      const surprise = (e.scores ?? []).find((x) => x.type === SURPRISE)?.confidence ?? 0;
      if (brows.update(toMs(e.timestamp), surprise >= 60) && gateOpen) onSelect(performance.now());
    }
  }
  $("state").textContent = gateOpen ? "Scanning" : "Paused while talking";
}

function scanLoop() {
  const now = performance.now();
  if (sdk && gateOpen && now - lastTick >= Number($("speed").value)) {
    scanner.tick();
    lastTick = now;
    drawBoard();
  }
  requestAnimationFrame(scanLoop);
}

// Laptops often list a virtual camera first (vendor effects apps); prefer a real one, which keeps 30 fps.
async function openCamera() {
  const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
  const real = cams.find((d) => !/virtual/i.test(d.label)) ?? cams[0];
  return navigator.mediaDevices.getUserMedia({
    video: { deviceId: real ? { exact: real.deviceId } : undefined, width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 } },
  });
}

async function start() {
  const apiKey = await window.palak.apiKey();
  if (!apiKey) {
    $("hint").textContent = "API key missing: add SMARTSPECTRA_API_KEY to .env";
    return;
  }
  $("consent").classList.add("hidden");
  $("app").classList.remove("hidden");
  sdk = new SmartSpectraSDK({ apiKey, requestedMetrics: [...faceMetrics], enableTelemetry: false });
  stream = await openCamera();
  $("preview").srcObject = stream;
  sdk.useMediaStream(stream);
  sdk.on("validationStatus", (code, _ts, hint) => { $("hint").textContent = code === 0 ? "Camera ready" : hint || "Adjust position"; });
  sdk.on("metrics", onMetrics);
  sdk.on("error", (code, message) => { $("hint").textContent = `Camera error ${code}: ${message}`; });
  await sdk.start();
  lastTick = performance.now();
}

async function stop() {
  if (!sdk) return;
  await sdk.stop();
  await sdk.destroy();
  sdk = null;
  stream.getTracks().forEach((t) => t.stop());
  stream = null;
  $("app").classList.add("hidden");
  $("consent").classList.remove("hidden");
}

$("start").addEventListener("click", start);
$("stop").addEventListener("click", stop);
$("speed").addEventListener("input", () => { $("speed-out").textContent = `${(Number($("speed").value) / 1000).toFixed(1)} s`; });
drawBoard();
requestAnimationFrame(scanLoop);
