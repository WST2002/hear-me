// What to do with a SmartSpectra SDK error: retry quietly (busy laptop, network blip) or stop and tell the
// caregiver exactly what to fix, instead of retrying forever while the board looks alive.
const CREDITS = 4;
const AUTH = 2;
const RETRY_ALWAYS = new Set([5, 6, 8, 9, 10, 11]);

function errorAdvice(code, message, retryable) {
  if (code === CREDITS) {
    return { retry: false, askKey: true, text: "The Presage API key has run out of measurement credits. Add credits or create a new key at physiology.presagetech.com, then paste it here." };
  }
  if (code === AUTH) {
    return { retry: false, askKey: true, text: "Presage did not accept this API key. Check it at physiology.presagetech.com and paste it again." };
  }
  if (RETRY_ALWAYS.has(code) || retryable) return { retry: true, askKey: false, text: `Camera error ${code}: ${message}` };
  return { retry: false, askKey: false, text: `The camera stopped (error ${code}: ${message}). Press start to try again.` };
}

module.exports = { errorAdvice };
