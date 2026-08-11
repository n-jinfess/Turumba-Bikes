// Bike domain knowledge, encoded as data so every verdict is explainable and
// deterministic — no model, no guessing. Edit the tables, change the advice.
//
// "Tier" is about serviceability and resale, which is what actually protects a
// buyer: a reputable frame can be maintained by any shop and holds value; a
// big-box "bike-shaped object" (BSO) is built to a price and often can't be
// economically serviced.

/** @typedef {'reputable-modern'|'reputable-vintage'|'budget'|'bso'|'unknown'} Tier */

// Reputable marques a shop will happily service. Vintage (lugged-steel era)
// and modern are separated because they value very differently.
const REPUTABLE_MODERN = [
  'cannondale', 'trek', 'specialized', 'giant', 'bianchi', 'cervelo', 'cervélo',
  'santa cruz', 'kona', 'marin', 'jamis', 'salsa', 'surly', 'all-city',
  'felt', 'scott', 'cube', 'orbea', 'canyon', 'fuji', 'gt', 'diamondback',
];
const REPUTABLE_VINTAGE = [
  'univega', 'nishiki', 'miyata', 'panasonic', 'centurion', 'motobecane',
  'peugeot', 'raleigh', 'schwinn', 'puch', 'lotus', 'bridgestone', 'trek',
  'bianchi', 'fuji', 'gitane', 'windsor', 'concord',
];
// Big-box / department-store brands. Real bikes exist, but resale and
// serviceability are poor — usually a sideways move, not an upgrade.
const BSO = [
  'huffy', 'kent', 'roadmaster', 'magna', 'hyper', 'genesis', 'next',
  'ozone', 'mongoose', 'royce union', 'hiland', 'max4out', 'vilano',
  'schwinn signature', 'northwoods', 'dynacraft', 'zebra', 'polygon',
];

// Model lines that materially raise value within a reputable brand.
const PREMIUM_MODELS = [
  'caad', 'allez', 'tarmac', 'roubaix', 'domane', 'emonda', 'madone',
  'synapse', 'supersix', 'defy', 'tcr', 'contend', 'sirrus',
];

/** @returns {{tier: Tier, brand: string|null, premium: boolean}} */
export function classifyBrand(title) {
  const t = title.toLowerCase();
  const found = (list) => list.find((b) => t.includes(b)) || null;

  const premium = PREMIUM_MODELS.some((m) => t.includes(m));
  const modern = found(REPUTABLE_MODERN);
  const vintage = found(REPUTABLE_VINTAGE);
  const bso = found(BSO);

  // BSO wins ties (e.g. "Schwinn Signature") so we never over-value a big-box bike.
  if (bso) return { tier: 'bso', brand: bso, premium: false };
  if (premium && modern) return { tier: 'reputable-modern', brand: modern, premium: true };
  if (modern) return { tier: 'reputable-modern', brand: modern, premium };
  if (vintage) return { tier: 'reputable-vintage', brand: vintage, premium };
  return { tier: 'unknown', brand: null, premium: false };
}

/** Rough bike type from the title. */
export function classifyType(title) {
  const t = title.toLowerCase();
  if (/\b(kids?|child|youth|20"|16"|24")\b/.test(t)) return 'kids';
  if (/\b(mountain|mtb|hardtail|trail|fat ?bike)\b/.test(t)) return 'mountain';
  if (/\b(hybrid|commuter|comfort|cruiser)\b/.test(t)) return 'hybrid';
  if (/\b(gravel|cyclocross|cx)\b/.test(t)) return 'gravel';
  if (/\b(road|racing|drop bar|10 ?speed|12 ?speed|21 ?speed)\b/.test(t)) return 'road';
  return 'unknown';
}

// Typical used market value (USD, good working order) by tier+type. Ranges are
// deliberately conservative; they anchor the verdict, not a precise appraisal.
export const MARKET = {
  'reputable-modern': { road: [280, 520], gravel: [400, 750], hybrid: [180, 400], mountain: [350, 750], kids: [80, 180], unknown: [220, 480] },
  'reputable-vintage': { road: [110, 240], hybrid: [90, 190], mountain: [90, 200], kids: [50, 110], unknown: [90, 200] },
  budget: { road: [60, 130], hybrid: [50, 110], mountain: [50, 120], kids: [30, 85], unknown: [50, 110] },
  bso: { road: [40, 95], hybrid: [30, 85], mountain: [30, 95], kids: [25, 65], unknown: [30, 85] },
  unknown: { road: [80, 190], hybrid: [60, 150], mountain: [70, 190], kids: [40, 100], unknown: [70, 170] },
};

// A comparable NEW bike's retail, for the "what you'd pay new" anchor.
export const RETAIL_NEW = {
  road: [950, 1400], gravel: [1200, 1800], hybrid: [600, 1000],
  mountain: [900, 1600], kids: [300, 500], unknown: [700, 1200],
};
