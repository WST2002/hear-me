const test = require("node:test");
const assert = require("node:assert/strict");
const { createUndo } = require("../src/core/undo");
const { createScanner } = require("../src/core/scanner");

test("a second select inside the window undoes the last phrase", () => {
  const u = createUndo({ windowMs: 3000 });
  u.offer({ en: "Water" }, 1000);
  assert.equal(u.pending(2000), true);
  assert.deepEqual(u.take(3500), { en: "Water" });
  assert.equal(u.pending(3600), false, "one undo per phrase");
  assert.equal(u.take(3700), null);
});

test("after the window closes, a select is a normal select again", () => {
  const u = createUndo({ windowMs: 3000 });
  u.offer({ en: "Water" }, 1000);
  assert.equal(u.pending(4001), false);
  assert.equal(u.take(4001), null);
});

test("clear() drops the offer (for example when the alarm starts)", () => {
  const u = createUndo({ windowMs: 3000 });
  u.offer({ en: "Water" }, 1000);
  u.clear();
  assert.equal(u.take(1500), null);
});

test("seconds left counts down for the on-screen hint", () => {
  const u = createUndo({ windowMs: 3000 });
  u.offer({ en: "Water" }, 1000);
  assert.equal(u.secondsLeft(1000), 3);
  assert.equal(u.secondsLeft(2100), 2);
  assert.equal(u.secondsLeft(5000), 0);
});

test("the scanner can return to a cell, so after an undo the person is back where they were", () => {
  const s = createScanner([["Yes", "No"], ["Water", "Food", "Toilet"]]);
  s.goTo(1, 2);
  assert.deepEqual(s.state(), { mode: "cells", row: 1, cell: 2 });
  assert.equal(s.select(), "Toilet");
});
