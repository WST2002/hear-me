// Word suggestions for the letter board: a short list of words that matter in care, then common English words.
// Order is priority, so the most useful completion comes first.
const WORDS = `WATER PAIN HELP TOILET MEDICINE NURSE DOCTOR FAMILY HUNGRY THIRSTY TIRED SLEEP COLD HOT BLANKET PILLOW
TURN LIGHT FAN TV PHONE MUSIC PRAY CALL COME STAY LEAVE STOP WAIT PLEASE THANKS YES NO MAYBE LATER NOW TODAY TOMORROW
MOM MUMMY PAPA DAD SON DAUGHTER WIFE HUSBAND BROTHER SISTER FRIEND BABY
HEAD BACK LEG ARM HAND STOMACH CHEST THROAT EYES MOUTH NOSE EAR TEETH FEET SKIN
ITCH SORE HURT BREATHE COUGH NAUSEA DIZZY SCARED HAPPY SAD BORED LONELY ANGRY OKAY BETTER WORSE
FOOD TEA COFFEE MILK JUICE SOUP RICE BREAD FRUIT SUGAR SALT
I ME MY YOU YOUR WE HE SHE THEY IT THE A AN AND OR BUT NOT WANT NEED LIKE LOVE FEEL KNOW THINK SEE HEAR
WHAT WHERE WHEN WHO WHY HOW IS ARE WAS AM BE DO DONT CAN CANT WILL HAVE GO GET GIVE TAKE MAKE OPEN CLOSE
UP DOWN LEFT RIGHT HERE THERE MORE LESS AGAIN SORRY GOOD BAD BIG SMALL WASH BATH CLEAN CHANGE CLOTHES WINDOW DOOR`
  .split(/\s+/)
  .filter(Boolean);

const lastWord = (line) => line.split(" ").pop();

// Up to `max` words that start with the word being typed.
function suggest(line, max = 4) {
  const prefix = lastWord(line);
  if (!prefix) return [];
  return WORDS.filter((w) => w.startsWith(prefix) && w !== prefix).slice(0, max);
}

// The line with its last partial word replaced by `word`, ready for the next word.
function completeWith(line, word) {
  const parts = line.split(" ");
  parts[parts.length - 1] = word;
  return `${parts.join(" ")} `;
}

module.exports = { suggest, completeWith };
