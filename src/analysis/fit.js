// Rider fit. Frame size matters more than brand for a first real bike, so we
// make it a first-class part of the analysis.

/**
 * Map rider height to a target road-frame size range (cm, center-to-top) and
 * standover. Values follow standard road-bike sizing charts.
 * @param {number} heightIn rider height in inches
 */
export function targetFrame(heightIn) {
  const table = [
    [62, 63, '47–49 cm', 'XS'],
    [64, 65, '49–51 cm', 'S'],
    [66, 67, '51–53 cm', 'S/M'],
    [68, 69, '53–55 cm', 'M'],
    [70, 71, '55–57 cm', 'M/L'],
    [72, 73, '57–59 cm', 'L'],
    [74, 75, '59–61 cm', 'XL'],
    [76, 99, '61–63 cm', 'XXL'],
  ];
  for (const [lo, hi, cm, letter] of table) {
    if (heightIn >= lo && heightIn <= hi) return { cm, letter };
  }
  return heightIn < 62 ? { cm: '≤47 cm', letter: 'XXS' } : { cm: '≥63 cm', letter: 'XXL' };
}

// Frame size tokens we can read straight out of a listing title/description.
const SIZE_CM = /\b(4[7-9]|5[0-9]|6[0-3])\s?cm\b/i;
const SIZE_LETTER = /\b(XS|S|M|L|XL|XXL|small|medium|large)\b/;

/**
 * If the listing states a size, judge whether it fits the rider.
 * @returns {{stated: string|null, fits: 'yes'|'no'|'unknown', note: string}}
 */
export function assessFit(text, heightIn) {
  const target = targetFrame(heightIn);
  const cm = text.match(SIZE_CM);
  if (cm) {
    const n = parseInt(cm[1], 10);
    const [lo, hi] = target.cm.replace(/[^\d–-]/g, '').split(/[–-]/).map(Number);
    const fits = n >= lo - 2 && n <= hi + 2 ? 'yes' : 'no';
    return { stated: `${n} cm`, fits, note: fits === 'yes' ? `Matches your ${target.cm} target.` : `You want ${target.cm}; this is ${n} cm.` };
  }
  const letter = text.match(SIZE_LETTER);
  if (letter) {
    const stated = letter[1].toUpperCase().replace('SMALL', 'S').replace('MEDIUM', 'M').replace('LARGE', 'L');
    const fits = stated.includes(target.letter) || target.letter.includes(stated) ? 'yes' : 'unknown';
    return { stated, fits, note: `Listed ${stated}; you're a ${target.letter}. Confirm the cm number.` };
  }
  return { stated: null, fits: 'unknown', note: `No size listed — ask before you go (you want ${target.cm}).` };
}
