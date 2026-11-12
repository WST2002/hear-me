// Row-column scanning, the standard way to choose from a grid with a single switch:
// the highlight steps through rows; a select enters the row, then steps through its cells and a final Back step.
function createScanner(grid) {
  let mode = "rows";
  let row = 0;
  let cell = null;

  const stepsInRow = () => grid[row].length + 1; // cells + Back

  return {
    state: () => ({ mode, row, cell }),
    // Jump straight to a cell (used after an undo, so the person is back on the item they took back).
    goTo(r, c) {
      mode = "cells";
      row = r;
      cell = c;
    },
    tick() {
      if (mode === "rows") {
        row = (row + 1) % grid.length;
        return;
      }
      const next = (cell === "back" ? 0 : cell + 1) % stepsInRow();
      cell = next === grid[row].length ? "back" : next;
    },
    select() {
      if (mode === "rows") {
        mode = "cells";
        cell = 0;
        return null;
      }
      const value = cell === "back" ? null : grid[row][cell];
      mode = "rows";
      row = 0;
      cell = null;
      return value;
    },
  };
}

module.exports = { createScanner };
