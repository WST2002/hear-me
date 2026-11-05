const test = require("node:test");
const assert = require("node:assert/strict");
const { createScanner } = require("../src/core/scanner");

const grid = [
  ["Water", "Food"],
  ["Pain", "Turn me", "Nurse"],
];

test("starts on the first row and steps through rows, wrapping around", () => {
  const s = createScanner(grid);
  assert.deepEqual(s.state(), { mode: "rows", row: 0, cell: null });
  s.tick();
  assert.equal(s.state().row, 1);
  s.tick();
  assert.equal(s.state().row, 0);
});

test("select on a row enters it; then cells step, ending on a Back step", () => {
  const s = createScanner(grid);
  s.tick();
  assert.equal(s.select(), null);
  assert.deepEqual(s.state(), { mode: "cells", row: 1, cell: 0 });
  s.tick(); s.tick();
  assert.equal(s.state().cell, 2);
  s.tick();
  assert.equal(s.state().cell, "back");
  s.tick();
  assert.equal(s.state().cell, 0);
});

test("select on a cell returns its value and goes back to row scanning", () => {
  const s = createScanner(grid);
  s.tick();
  s.select();
  s.tick();
  assert.equal(s.select(), "Turn me");
  assert.deepEqual(s.state(), { mode: "rows", row: 0, cell: null });
});

test("select on Back leaves the row without a value", () => {
  const s = createScanner(grid);
  s.select();
  s.tick(); s.tick();
  assert.equal(s.state().cell, "back");
  assert.equal(s.select(), null);
  assert.equal(s.state().mode, "rows");
});

test("after a missed row, two full rounds without a select keeps cycling", () => {
  const s = createScanner(grid);
  for (let i = 0; i < 4; i++) s.tick();
  assert.equal(s.state().row, 0);
});
