// Undo a wrong phrase: right after a phrase is spoken, one more select inside a short window takes it back.
// Switch-scanning devices do the same ("activate again to de-select"); a long blink takes about a second to
// perform, so the window is longer than a hand switch would need.
function createUndo({ windowMs = 3000 } = {}) {
  let item = null;
  let until = 0;
  const open = (now) => item !== null && now <= until;
  return {
    offer(value, now) { item = value; until = now + windowMs; },
    pending: open,
    take(now) {
      if (!open(now)) return null;
      const taken = item;
      item = null;
      return taken;
    },
    clear() { item = null; },
    secondsLeft: (now) => (open(now) ? Math.ceil((until - now) / 1000) : 0),
  };
}

module.exports = { createUndo };
