// Hear Me renderer: camera signals from SmartSpectra -> select switches -> row-column scanner -> spoken words.
const { SmartSpectraSDK, faceMetrics } = require("@smartspectra/node-sdk/renderer");
const { decodeMetrics } = require("@smartspectra/node-sdk/messages");
const { createLongBlink, createExpressionHold, createTalkGate } = require("./core/switches");
const { createScanner } = require("./core/scanner");
const { createComposer } = require("./core/composer");
const { createBurst } = require("./core/alarm");
const { blinkDurations, longBlinkThreshold } = require("./core/calibrate");
const { eyeOpenness, eyePoints, createEyeClosure } = require("./core/eyes");
const { phrases, letters } = require("./phrases");
const { suggest } = require("./core/predict");

const SURPRISE = 8; // presage.smartspectra.ExpressionType.SURPRISE
const $ = (id) => document.getElementById(id);

// Settings stay on this computer only (localStorage); nothing about the person is stored.
const settings = { speed: 1600, brows: false, hindi: false, blinkMs: 500, mine: "", hideFace: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem("hearme.settings") || "{}")); } catch {}
const saveSettings = () => { try { localStorage.setItem("hearme.settings", JSON.stringify(settings)); } catch {} };

// The phrase board gets a "Mine" row with the caregiver's own phrases; the letter board a "Words" row of suggestions.
function buildBoard(name) {
  if (name === "letters") {
    const words = suggest(composer.text());
    return words.length ? [{ row: "Words", items: words.map((w) => ({ key: `+${w}`, label: w })) }, ...letters] : letters;
  }
  const mine = settings.mine.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 5).map((l) => ({ en: l, hi: l }));
  return mine.length ? [phrases[0], { row: "Mine", items: mine }, ...phrases.slice(1)] : phrases;
}
let boardName = "phrases";
let board = null;
let scanner = null;
// Eyes shut for up to 5 s select; longer is resting.
const MAX_CLOSED_MS = 5000;
let longBlink = createLongBlink({ minClosedMs: settings.blinkMs, maxClosedMs: MAX_CLOSED_MS });
const closure = createEyeClosure();
const brows = createExpressionHold({ holdMs: 400 });
const gate = createTalkGate();
// Panic shortcut: four long blinks inside 3 s. Normal use cannot reach that, because of the pause after each phrase.
const burst = createBurst({ count: 4, withinMs: 3000 });
const AFTER_PHRASE_MS = 1500;
const composer = createComposer();
let sdk = null;
let stream = null;
let gateOpen = true;
let lastTick = 0;
let quietUntil = 0;
// The SDK sends no face data while the face is badly placed; the board waits instead of scanning blind.
let lastFaceAt = 0;
let eyesClosed = false;
let lastHint = "";
// Live readings for the eye meter (and for reading the app state while testing).
const live = { openness: 0, openLevel: 0, closed: false, faceFrames: 0, selects: 0 };
window.hearMeLive = live;
let alarm = null;
let calibration = null; // { phase, until, frames: { natural: [], deliberate: [] } }

const toMs = (ts) => (typeof ts?.toNumber === "function" ? ts.toNumber() : Number(ts)) / 1000;

function cellHtml(c, lit) {
  const label = c.label ?? c.key ?? c.en;
  const sub = c.hi ? `<small>${c.hi}</small>` : "";
  return `<div class="cell${lit ? " lit" : ""}${c.action ? " action" : ""}">${label}${sub}</div>`;
}

function drawBoard() {
  const { mode, row, cell } = scanner.state();
  $("board").innerHTML = board
    .map((r, i) => {
      const rowLit = i === row;
      const cells = r.items.map((c, j) => cellHtml(c, rowLit && mode === "cells" && cell === j)).join("");
      const back = `<div class="cell back${rowLit && cell === "back" ? " lit" : ""}">Back</div>`;
      return `<div class="row${rowLit ? " lit" : ""}"><div class="name">${r.row}</div>${cells}${back}</div>`;
    })
    .join("");
  $("compose").classList.toggle("hidden", boardName !== "letters");
  $("compose").textContent = composer.text() || "…";
}

function switchBoard(name) {
  boardName = name;
  board = buildBoard(name);
  scanner = createScanner(board.map((r) => r.items));
}

function say(text, lang) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang.slice(0, 2)));
  if (voice) u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  const item = document.createElement("li");
  item.textContent = `${new Date().toLocaleTimeString()}  ${text}`;
  $("history").prepend(item);
}

function speakPhrase({ en, hi }) {
  say(settings.hindi ? hi : en, settings.hindi ? "hi-IN" : "en-IN");
  $("said").textContent = `${en} · ${hi}`;
}

// A loud repeating two-tone beep until a caregiver presses "I'm here".
function startAlarm() {
  if (alarm) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = "square";
  amp.gain.value = 0.25;
  osc.connect(amp).connect(ctx.destination);
  osc.start();
  const flip = setInterval(() => { osc.frequency.value = osc.frequency.value > 700 ? 600 : 900; }, 400);
  alarm = { ctx, flip };
  $("said").textContent = "Help needed! · मदद चाहिए!";
  $("alarm").classList.remove("hidden");
}

function stopAlarm() {
  if (!alarm) return;
  clearInterval(alarm.flip);
  alarm.ctx.close();
  alarm = null;
  $("alarm").classList.add("hidden");
}

function onSelect(now) {
  live.selects++;
  if (burst.press(now)) {
    startAlarm();
    return;
  }
  if (now < quietUntil) return;
  lastTick = now;
  const value = scanner.select();
  if (value?.action === "alarm") startAlarm();
  else if (value?.action === "letters") switchBoard("letters");
  else if (value?.key) {
    const r = composer.apply(value.key);
    if (r.say) { say(r.say, "en-IN"); $("said").textContent = r.say; }
    switchBoard(r.board ?? "letters");
  } else if (value) speakPhrase(value);
  if (value) quietUntil = now + AFTER_PHRASE_MS;
  drawBoard();
}

// --- calibration: 10 s of normal blinking, then 10 s of long blinks; sets this person's threshold ---------------
function startCalibration() {
  calibration = { phase: "natural", until: performance.now() + 10000, frames: { natural: [], deliberate: [] } };
  $("calib").textContent = "Step 1 of 2: look at the screen and blink normally (10 s)";
}

function calibrationFrame(t, closed) {
  const now = performance.now();
  calibration.frames[calibration.phase].push([t, closed]);
  if (now < calibration.until) return;
  if (calibration.phase === "natural") {
    calibration.phase = "deliberate";
    calibration.until = now + 10000;
    $("calib").textContent = "Step 2 of 2: do three long blinks, about one second each (10 s)";
    return;
  }
  const natural = blinkDurations(calibration.frames.natural);
  const deliberate = blinkDurations(calibration.frames.deliberate).filter((d) => d > 300);
  settings.blinkMs = longBlinkThreshold(natural, deliberate);
  longBlink = createLongBlink({ minClosedMs: settings.blinkMs, maxClosedMs: MAX_CLOSED_MS });
  saveSettings();
  $("calib").textContent = `Done: a blink longer than ${settings.blinkMs} ms now selects (${deliberate.length} long blinks seen)`;
  calibration = null;
}

function onMetrics(buf) {
  const face = decodeMetrics(buf).face;
  if (!face) return;
  for (const s of face.talking ?? []) gateOpen = gate.update(toMs(s.timestamp), Boolean(s.detected));
  for (const l of face.landmarks ?? []) {
    const t = toMs(l.timestamp);
    const points = l.value ?? [];
    const value = points.length >= 468 ? eyeOpenness(eyePoints(points)) : null;
    if (value !== null) {
      lastFaceAt = performance.now();
      live.openness = value;
      live.faceFrames++;
    }
    const closed = closure.update(value);
    eyesClosed = closed;
    live.closed = closed;
    if (calibration) { calibrationFrame(t, closed); continue; }
    if (longBlink.update(t, closed) && gateOpen) onSelect(performance.now());
  }
  if (settings.brows && !calibration) {
    for (const e of face.expression ?? []) {
      const surprise = (e.scores ?? []).find((x) => x.type === SURPRISE)?.confidence ?? 0;
      if (brows.update(toMs(e.timestamp), surprise >= 60) && gateOpen) onSelect(performance.now());
    }
  }
  $("state").textContent = calibration ? "Calibrating" : gateOpen ? "Scanning" : "Paused while talking";
}

// Privacy view: instead of the camera picture, two drawn eyes that open and close with the measured eye openness.
let shownOpen = 1;
function drawEyes(seeing) {
  $("preview").classList.toggle("hidden", settings.hideFace);
  $("eye-view").classList.toggle("hidden", !settings.hideFace);
  if (!settings.hideFace) return;
  const target = !seeing ? 0.5 : eyesClosed ? 0.04 : Math.min(1, live.openness / 0.33);
  shownOpen += (target - shownOpen) * 0.5;
  for (const lid of document.querySelectorAll("#eye-view .lid, #eye-view .lid-line")) lid.setAttribute("ry", String(Math.max(1, 40 * shownOpen)));
}

function scanLoop() {
  const now = performance.now();
  // Hold the highlight still while the eyes are shut, so the choice is the one they closed their eyes on.
  // The tracker sends no landmarks while the eyes are shut, but past the longest blink that counts, the face is gone.
  const sinceFace = now - lastFaceAt;
  const seeing = sinceFace < 1000 || (eyesClosed && sinceFace < MAX_CLOSED_MS);
  $("paused").classList.toggle("hidden", !sdk || seeing);
  $("paused").textContent = `Paused: ${lastHint || "looking for a face"}`;
  // Setup hints matter only while there is no face data; once the eyes are tracked, say so.
  if (sdk && !recovering) $("hint").textContent = seeing ? "Camera ready" : lastHint || "Looking for a face…";
  drawEyes(seeing);
  $("meter-fill").style.width = `${Math.min(100, (live.openness / 0.45) * 100)}%`;
  $("meter").classList.toggle("closed", seeing && eyesClosed);
  $("meter-text").textContent = !seeing ? "Eyes: no face data" : eyesClosed ? "Eyes: closed" : "Eyes: open";
  if (sdk && seeing && gateOpen && !calibration && !alarm && !eyesClosed && now - lastTick >= settings.speed) {
    scanner.tick();
    lastTick = now;
    drawBoard();
  }
}

// Laptops often list a virtual camera first (vendor effects apps); prefer a real one, which keeps 30 fps.
// 640x360 keeps the frame pump above the 25 fps the SDK needs on a laptop CPU.
async function openCamera() {
  const replay = await window.hearMe.replay();
  if (replay) {
    const clip = document.createElement("video");
    clip.src = replay;
    clip.muted = true;
    await clip.play();
    return clip.captureStream(30);
  }
  const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
  const real = cams.find((d) => !/virtual/i.test(d.label)) ?? cams[0];
  return navigator.mediaDevices.getUserMedia({
    video: { deviceId: real ? { exact: real.deviceId } : undefined, width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 } },
  });
}

async function start() {
  const apiKey = await window.hearMe.apiKey();
  if (!apiKey) {
    $("consent-error").textContent = "API key missing: add SMARTSPECTRA_API_KEY to the .env file.";
    return;
  }
  $("consent").classList.add("hidden");
  $("app").classList.remove("hidden");
  sdk = new SmartSpectraSDK({ apiKey, requestedMetrics: [...faceMetrics], enableTelemetry: false });
  stream = await openCamera();
  $("preview").srcObject = stream;
  sdk.useMediaStream(stream);
  sdk.on("validationStatus", (code, _ts, hint) => {
    lastHint = code === 0 ? "" : hint || "Adjust position";
  });
  sdk.on("metrics", onMetrics);
  sdk.on("error", (code, message) => {
    $("hint").textContent = `Camera error ${code}: ${message}`;
    recover();
  });
  await sdk.start();
  lastTick = performance.now();
}

// The SDK stops for good after an error (for example when a busy laptop drops below 25 fps).
// Rebuild it and carry on, so the person is never left with a board that silently stopped listening.
let recovering = false;
async function recover() {
  if (recovering || !sdk) return;
  recovering = true;
  lastHint = "restarting the camera";
  await new Promise((r) => setTimeout(r, 1500));
  try {
    await sdk.reset();
    await sdk.start();
  } catch (e) {
    $("hint").textContent = `Restart failed: ${e.message}`;
  }
  recovering = false;
}

async function stop() {
  if (!sdk) return;
  stopAlarm();
  await sdk.stop();
  sdk.destroy();
  sdk = null;
  stream.getTracks().forEach((t) => t.stop());
  stream = null;
  $("app").classList.add("hidden");
  $("consent").classList.remove("hidden");
}

function bindSettings() {
  $("speed").value = settings.speed;
  $("speed-out").textContent = `${(settings.speed / 1000).toFixed(1)} s`;
  $("use-brows").checked = settings.brows;
  $("hindi").checked = settings.hindi;
  $("speed").addEventListener("input", () => {
    settings.speed = Number($("speed").value);
    $("speed-out").textContent = `${(settings.speed / 1000).toFixed(1)} s`;
    saveSettings();
  });
  $("use-brows").addEventListener("change", () => { settings.brows = $("use-brows").checked; saveSettings(); });
  $("hindi").addEventListener("change", () => { settings.hindi = $("hindi").checked; saveSettings(); });
  $("hide-face").checked = settings.hideFace;
  $("hide-face").addEventListener("change", () => { settings.hideFace = $("hide-face").checked; saveSettings(); });
  $("mine").value = settings.mine;
  $("mine").addEventListener("change", () => {
    settings.mine = $("mine").value;
    saveSettings();
    if (boardName === "phrases") switchBoard("phrases");
    drawBoard();
  });
}

$("start").addEventListener("click", start);
$("stop").addEventListener("click", stop);
$("calibrate").addEventListener("click", startCalibration);
$("alarm-stop").addEventListener("click", stopAlarm);
// A USB switch or a caregiver's keyboard works too: Space selects, like a long blink.
document.addEventListener("keydown", (e) => {
  if (e.code !== "Space" || !sdk || e.target.closest("input, textarea, select")) return;
  e.preventDefault();
  onSelect(performance.now());
});
bindSettings();
switchBoard("phrases");
drawBoard();
setInterval(scanLoop, 50);
