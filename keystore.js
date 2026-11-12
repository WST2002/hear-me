// Where Hear Me finds the SmartSpectra API key: a key pasted in the app (saved in the app's own data folder)
// or, for developers, SMARTSPECTRA_API_KEY in .env. The key never reaches the renderer's storage.
const fs = require("fs");
const path = require("path");

const FILE = "api-key.txt";
const isPlaceholder = (key) => /^(paste_|your_key)/i.test(key);

function readApiKey({ envFile, dataDir }) {
  const saved = path.join(dataDir, FILE);
  if (fs.existsSync(saved)) {
    const key = fs.readFileSync(saved, "utf8").trim();
    if (key && !isPlaceholder(key)) return key;
  }
  if (!fs.existsSync(envFile)) return "";
  const line = fs.readFileSync(envFile, "utf8").split(/\r?\n/).find((l) => l.startsWith("SMARTSPECTRA_API_KEY="));
  const key = line ? line.slice(line.indexOf("=") + 1).trim() : "";
  return isPlaceholder(key) ? "" : key;
}

function saveApiKey(dataDir, raw) {
  const key = String(raw ?? "").trim();
  if (!key) throw new Error("The API key is empty: paste the key from physiology.presagetech.com.");
  if (isPlaceholder(key)) throw new Error("That is the placeholder text: paste your real key from physiology.presagetech.com.");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, FILE), key, { mode: 0o600 });
}

// Delete the pasted key from this computer (a .env file, if a developer made one, is left alone).
function forgetApiKey(dataDir) {
  fs.rmSync(path.join(dataDir, FILE), { force: true });
}

module.exports = { readApiKey, saveApiKey, forgetApiKey };
