// The spelling line for the letter board. apply(key) edits the line and tells the app what to do next.
const { completeWith } = require("./predict");

function createComposer() {
  let line = "";
  return {
    text: () => line,
    apply(key) {
      if (key === "Speak") {
        const say = line.trim();
        line = "";
        return say ? { say } : {};
      }
      if (key === "Phrases") return { board: "phrases" };
      if (key.startsWith("+")) {
        line = completeWith(line, key.slice(1));
        return {};
      }
      if (key === "Space") line += " ";
      else if (key === "Delete") line = line.slice(0, -1);
      else if (key === "Clear") line = "";
      else line += key;
      return {};
    },
  };
}

module.exports = { createComposer };
