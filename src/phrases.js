// The two boards. A cell is { en, hi } to speak a phrase, or { key } for a letter-board key,
// or { action } for an app action (open the letter board, call for help).
const phrase = (en, hi) => ({ en, hi });

const phrases = [
  { row: "Quick", items: [{ en: "Call for help", hi: "मदद बुलाओ", action: "alarm" }, phrase("Yes", "हाँ"), phrase("No", "नहीं"), phrase("I'm in pain", "दर्द हो रहा है")] },
  { row: "Needs", items: [phrase("Water, please", "पानी चाहिए"), phrase("I'm hungry", "भूख लगी है"), phrase("Toilet", "टॉयलेट जाना है"), phrase("Medicine", "दवाई")] },
  { row: "Body", items: [phrase("Turn me over", "करवट बदल दो"), phrase("Lift my head", "सिर ऊपर करो"), phrase("Too hot", "बहुत गर्मी है"), phrase("Too cold", "बहुत ठंड है")] },
  { row: "People", items: [phrase("Call the nurse", "नर्स को बुलाओ"), phrase("Call my family", "घरवालों को बुलाओ"), phrase("Thank you", "शुक्रिया"), phrase("Please stay with me", "मेरे पास रहो")] },
  { row: "More", items: [{ en: "Spell a word", hi: "शब्द लिखें", action: "letters" }, phrase("I love you", "आपसे प्यार है"), phrase("I'm tired", "थकान हो रही है")] },
];

// Most frequent English letters first, so common words need fewer steps.
const keys = (row, list) => ({ row, items: list.map((key) => ({ key })) });
const letters = [
  keys("Done", ["Speak", "Space", "Delete", "Clear", "Phrases"]),
  keys("E T A", ["E", "T", "A", "O", "I", "N"]),
  keys("S H R", ["S", "H", "R", "D", "L", "U"]),
  keys("C M W", ["C", "M", "W", "F", "G", "Y"]),
  keys("P B V", ["P", "B", "V", "K", "J", "X", "Q", "Z"]),
];

module.exports = { phrases, letters };
