const test = require("node:test");
const assert = require("node:assert/strict");
const { suggest, completeWith } = require("../src/core/predict");

test("suggests common words for the last word being typed, most useful first", () => {
  const words = suggest("WA");
  assert.equal(words[0], "WATER");
  assert.ok(words.length <= 4);
  assert.ok(words.every((w) => w.startsWith("WA")));
});

test("works on the last word of a longer line", () => {
  assert.ok(suggest("I WANT ME").includes("MEDICINE"));
});

test("an empty last word suggests nothing", () => {
  assert.deepEqual(suggest("I WANT "), []);
  assert.deepEqual(suggest(""), []);
});

test("completeWith replaces the last partial word and adds a space", () => {
  assert.equal(completeWith("I WANT WA", "WATER"), "I WANT WATER ");
  assert.equal(completeWith("ME", "MEDICINE"), "MEDICINE ");
});
