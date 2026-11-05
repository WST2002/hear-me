const test = require("node:test");
const assert = require("node:assert/strict");
const { createComposer } = require("../src/core/composer");

test("letters build a word, Space and Delete edit it", () => {
  const c = createComposer();
  for (const k of ["H", "I", "Space", "M", "A", "X", "Delete"]) c.apply(k);
  assert.equal(c.text(), "HI MA");
});

test("Speak returns the text to say and clears the line", () => {
  const c = createComposer();
  for (const k of ["N", "O"]) c.apply(k);
  assert.deepEqual(c.apply("Speak"), { say: "NO" });
  assert.equal(c.text(), "");
});

test("Speak on an empty line says nothing", () => {
  assert.deepEqual(createComposer().apply("Speak"), {});
});

test("Clear empties the line, Delete on empty is harmless", () => {
  const c = createComposer();
  c.apply("Delete");
  c.apply("A");
  c.apply("Clear");
  assert.equal(c.text(), "");
});

test("Phrases asks to switch back to the phrase board", () => {
  assert.deepEqual(createComposer().apply("Phrases"), { board: "phrases" });
});

test("a suggested word (+WORD) completes the word being typed", () => {
  const c = createComposer();
  for (const k of ["I", "Space", "W", "A"]) c.apply(k);
  c.apply("+WATER");
  assert.equal(c.text(), "I WATER ");
});
