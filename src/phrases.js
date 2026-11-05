// The phrase board: rows of short needs a caregiver hears most often. Each phrase has English and Hindi text.
const board = [
  { row: "Needs", items: [["Water, please", "पानी चाहिए"], ["I'm hungry", "भूख लगी है"], ["Toilet", "टॉयलेट जाना है"], ["Medicine", "दवाई"]] },
  { row: "Body", items: [["I'm in pain", "दर्द हो रहा है"], ["Turn me over", "करवट बदल दो"], ["Too hot", "बहुत गर्मी है"], ["Too cold", "बहुत ठंड है"]] },
  { row: "People", items: [["Call the nurse", "नर्स को बुलाओ"], ["Call my family", "घरवालों को बुलाओ"], ["Yes", "हाँ"], ["No", "नहीं"]] },
  { row: "Feelings", items: [["Thank you", "शुक्रिया"], ["I love you", "मैं तुमसे प्यार करता हूँ"], ["I'm tired", "मैं थक गया हूँ"], ["Please stay with me", "मेरे पास रहो"]] },
];

module.exports = { board };
