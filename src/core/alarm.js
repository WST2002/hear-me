// Emergency call: `count` selects within `withinMs` raise the alarm, wherever the highlight is.
function createBurst({ count = 3, withinMs = 6000 } = {}) {
  let times = [];
  return {
    press(t) {
      times = [...times.filter((x) => t - x < withinMs), t];
      if (times.length < count) return false;
      times = [];
      return true;
    },
  };
}

module.exports = { createBurst };
