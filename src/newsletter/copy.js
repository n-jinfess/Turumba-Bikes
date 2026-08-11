// Voice. Turumba reads like a friend who knows the category writing to you —
// not a retailer. The reference points are editorial newsletters (Acquired,
// Resy): a specific hook, a named human, honesty over hype, a warm sign-off.
//
// Everything here is deterministic (index-seeded, not random) so a given digest
// always reads the same — no AI, no slop.

import { brand } from '../../config/brand.js';

/** Pick a deterministic item from a list, seeded by a number (e.g. deal count). */
const pick = (list, seed) => list[Math.abs(seed) % list.length];

/**
 * The opening hook. Editorial, specific, honest about a thin or rich week.
 * @param {number} count number of real leads found
 * @param {string} category e.g. "road bikes"
 * @param {string} place e.g. "McLean"
 */
export function hook(count, category, place) {
  if (count === 0) {
    return `Quiet week for ${category} near ${place} — nothing under your ceiling worth a text yet. That's the honest read; I'd rather send you nothing than filler.`;
  }
  if (count === 1) {
    return `One lead near ${place} actually earned its spot this week. Everything else was placeholder prices and bikes in the wrong size — so here's the one that's real.`;
  }
  const openers = [
    `${count} listings near ${place} made it past the noise this week.`,
    `I went through the ${category} feed near ${place} so you didn't have to — ${count} are worth your time.`,
    `${count} real ${category} surfaced near ${place}. The rest was accessories and stolen-bike posts.`,
  ];
  return pick(openers, count);
}

/** Warm, human sign-off in the curator's voice. */
export function signoff() {
  return `Happy hunting,\n${brand.curator} · ${brand.name}`;
}

/** One-line, plain-English gloss on a verdict — the "why it matters" sentence. */
export function verdictGloss(a) {
  switch (a.verdict) {
    case 'Good deal': return `Priced below what these go for — move quickly if the size is right.`;
    case 'Fair — at market': return `Priced right. The win here isn't a discount, it's a bike a shop can actually keep running.`;
    case 'Fair — check condition': return `Priced fairly, but there's a condition note — inspect it closely before you commit.`;
    case 'Skip — condition risk': return `Structural damage rarely pays to fix on a used bike. I'd pass.`;
    case 'High — negotiate': return `A little rich. There's room to make an offer.`;
    case 'Overpriced': return `Asking more than the market — only worth it if the condition is exceptional.`;
    case 'Skip — sideways move': return `Same tier as a big-box bike. Buying this wouldn't move you forward.`;
    case 'Wrong size': return `Doesn't fit your frame — a great price in the wrong size still hurts.`;
    case 'Wrong category': return `A kids' bike, not what you're after.`;
    case 'Ask price': return `Real bike, hidden price. Worth a message to find out.`;
    default: return '';
  }
}

/** A ready-to-send opener the subscriber can paste to a seller. */
export function sellerMessage({ heightIn }) {
  const h = heightIn ? `I'm ${Math.floor(heightIn / 12)}'${heightIn % 12}" — ` : '';
  return `Hi! Interested for getting into cycling. ${h}what's the frame size (cm or inches), and are the wheels 27" or 700c? Does everything shift/brake and hold air? Thanks!`;
}
