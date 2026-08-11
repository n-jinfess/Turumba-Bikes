// The deal-analysis engine. Deterministic and explainable: given a listing it
// returns an estimated market value, a comparable-new anchor, and a verdict —
// each backed by a list of plain-English reasons a human can check.
//
// No AI, no network. Same input always yields the same output.

import { classifyBrand, classifyType, MARKET, RETAIL_NEW } from './brands.js';
import { assessFit } from './fit.js';

// Condition signals worth money (or worth running from), read from the text.
const POSITIVE = [
  [/\b(new|fresh) (tires|tyres|chain|cables|brakes)\b/i, 0.08, 'recent wear parts'],
  [/\b(tuned|tune[- ]?up|serviced|overhauled|ready to ride)\b/i, 0.06, 'recently serviced'],
  [/\b(excellent|mint|like new|barely used|pristine)\b/i, 0.10, 'excellent condition'],
  [/\b(original owner|garage kept|well maintained)\b/i, 0.05, 'well kept'],
];
const NEGATIVE = [
  [/\b(rust|rusty|corrod)/i, -0.12, 'rust'],
  [/\b(stuck|seized) (seat ?post|post|stem)/i, -0.20, 'seized part'],
  [/\b(crack|bent|dent)/i, -0.35, 'frame damage — walk away'],
  [/\b(flat|needs (air|tubes|work|tune)|not working|as[- ]is)\b/i, -0.10, 'needs work'],
  [/\bmissing\b/i, -0.15, 'missing parts'],
];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const mid = ([lo, hi]) => Math.round((lo + hi) / 2);

/**
 * @param {{title:string, price:number, location?:string, description?:string}} listing
 * @param {{heightIn?:number}} [rider]
 */
export function analyzeListing(listing, rider = {}) {
  const text = `${listing.title} ${listing.description || ''}`;
  const reasons = [];

  const { tier, brand, premium } = classifyBrand(text);
  const type = classifyType(text);

  // Base market range from the knowledge base.
  const base = (MARKET[tier] && MARKET[tier][type]) || MARKET.unknown.unknown;
  let [lo, hi] = base;
  reasons.push(brand
    ? `${cap(brand)} is a ${tierLabel(tier)} — ${tierWhy(tier)}.`
    : `Unbranded/'${type}' listing — valued conservatively.`);
  if (premium) { lo = Math.round(lo * 1.1); hi = Math.round(hi * 1.15); reasons.push('Premium model line — adjusted up.'); }

  // Condition adjustments.
  let adj = 0;
  let hasNegative = false;
  let severe = false;
  for (const [re, w, why] of POSITIVE) if (re.test(text)) { adj += w; reasons.push(`+ ${why}`); }
  for (const [re, w, why] of NEGATIVE) if (re.test(text)) { adj += w; hasNegative = true; if (w <= -0.3) severe = true; reasons.push(`− ${why}`); }
  adj = clamp(adj, -0.6, 0.35);
  lo = Math.round(lo * (1 + adj));
  hi = Math.round(hi * (1 + adj));

  const retailNew = RETAIL_NEW[type] || RETAIL_NEW.unknown;
  const m = mid([lo, hi]);

  // Verdict: compare the asking price (when it's real) to the market MIDPOINT,
  // which is a stricter, more honest bar than "under the top of the range".
  const priceKnown = listing.price > 5;
  let verdict, tone;
  if (!priceKnown) {
    verdict = 'Ask price';
    tone = 'muted';
    reasons.push('Seller listed a placeholder price ($0/$1) — message for the real number.');
  } else if (type === 'kids') {
    verdict = 'Wrong category';
    tone = 'bad';
  } else if (tier === 'bso') {
    verdict = 'Skip — sideways move';
    tone = 'bad';
    reasons.push('Big-box bike: little resale, hard to service — not an upgrade.');
  } else if (severe) {
    verdict = 'Skip — condition risk';
    tone = 'bad';
    reasons.push('Structural damage rarely worth fixing on a used bike at this price.');
  } else if (listing.price <= m * 0.8) {
    verdict = 'Good deal';
    tone = 'good';
  } else if (listing.price <= m * 1.12) {
    verdict = 'Fair — at market';
    tone = 'good';
  } else if (listing.price <= m * 1.4) {
    verdict = 'High — negotiate';
    tone = 'warn';
    reasons.push(`Above the ~$${m} midpoint; offer around $${m}.`);
  } else {
    verdict = 'Overpriced';
    tone = 'bad';
    reasons.push(`Well above the ~$${m} midpoint.`);
  }

  // Honesty guard: a bike with any condition red flag can't be a "Good deal".
  if (hasNegative && verdict === 'Good deal') {
    verdict = 'Fair — check condition';
    tone = 'warn';
  }

  // Fit, if we know the rider.
  let fit = null;
  if (rider.heightIn) fit = assessFit(text, rider.heightIn);
  if (fit && fit.fits === 'no') { verdict = 'Wrong size'; tone = 'bad'; }

  return {
    brand: brand ? cap(brand) : null,
    tier,
    type,
    marketLow: lo,
    marketHigh: hi,
    marketMid: mid([lo, hi]),
    retailNew,
    verdict,
    tone, // 'good' | 'warn' | 'bad' | 'muted' — maps to brand colors
    reasons,
    fit,
    // How confident the range is: high when we recognized the brand + type.
    confidence: tier === 'unknown' || type === 'unknown' ? 'low' : (brand ? 'high' : 'medium'),
  };
}

const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
function tierLabel(t) {
  return {
    'reputable-modern': 'shop-serviceable modern brand',
    'reputable-vintage': 'quality vintage marque',
    budget: 'budget brand',
    bso: 'big-box brand',
    unknown: 'unknown brand',
  }[t];
}
function tierWhy(t) {
  return {
    'reputable-modern': 'standard parts, real resale, any shop can maintain it',
    'reputable-vintage': 'lugged-steel era, repairable and characterful',
    budget: 'rideable but limited resale',
    bso: 'built to a price, poor resale',
    unknown: "can't verify — inspect in person",
  }[t];
}
