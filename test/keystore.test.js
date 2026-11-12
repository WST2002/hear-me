const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { readApiKey, saveApiKey } = require("../keystore");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "hearme-"));

test("no key anywhere gives an empty string", () => {
  assert.equal(readApiKey({ envFile: path.join(tmp(), ".env"), dataDir: tmp() }), "");
});

test("a key in .env is read", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, ".env"), "OTHER=1\nSMARTSPECTRA_API_KEY= abc123 \n");
  assert.equal(readApiKey({ envFile: path.join(dir, ".env"), dataDir: tmp() }), "abc123");
});

test("a key pasted in the app is saved and read back, without a .env file", () => {
  const data = tmp();
  saveApiKey(data, "  pasted-key  ");
  assert.equal(readApiKey({ envFile: path.join(tmp(), ".env"), dataDir: data }), "pasted-key");
});

test("an empty or placeholder key is refused", () => {
  assert.throws(() => saveApiKey(tmp(), "   "), /empty/);
  assert.throws(() => saveApiKey(tmp(), "PASTE_YOUR_KEY_HERE"), /placeholder/);
});

test("the .env placeholder from .env.example counts as no key", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, ".env"), "SMARTSPECTRA_API_KEY=PASTE_YOUR_KEY_HERE\n");
  assert.equal(readApiKey({ envFile: path.join(dir, ".env"), dataDir: tmp() }), "");
});

test("forgetting the key removes the saved file, and a .env key still works for developers", () => {
  const { forgetApiKey } = require("../keystore");
  const data = tmp();
  saveApiKey(data, "pasted-key");
  forgetApiKey(data);
  assert.equal(readApiKey({ envFile: path.join(tmp(), ".env"), dataDir: data }), "");
  forgetApiKey(data); // nothing saved: no error
});
