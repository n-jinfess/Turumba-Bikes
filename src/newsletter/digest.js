// Turn a subscriber's preferences into a ranked, analyzed digest.
// Pipeline:  MCP search  →  parse  →  realistic filter  →  dedupe  →  analyze  →  rank.

import { searchMarketplace } from '../mcp/client.js';
import { parseListings, filterRealistic, locationGate } from '../mcp/filter.js';
import { analyzeListing } from '../analysis/valuation.js';
import { targetFrame } from '../analysis/fit.js';

// Hunting road bikes, drop obvious mountain bikes so comparisons stay honest.
const EXCLUDE_MTB = /\b(mountain bike|\bmtb\b|capra|marlin|fuel ex|hardtail|full susp|trail bike)\b/i;

// Ranking: surface actionable, well-priced, in-category first.
const SCORE = {
  'Good deal': 100, 'Fair — at market': 80, 'Fair — check condition': 70,
  'Ask price': 55, 'High — negotiate': 40, 'Overpriced': 20,
  'Skip — condition risk': 6, 'Skip — sideways move': 5,
  'Wrong size': 4, 'Wrong category': 3,
};

/**
 * @param {import('./subscribers.js').Subscriber} sub
 * @param {Object} [opts]
 * @param {{nearStates:string[], farCities:string[]}} [opts.area] location gate
 * @param {(args:object)=>Promise<string>} [opts.search] injectable for tests/offline
 */
export async function buildDigest(sub, opts = {}) {
  const search = opts.search || searchMarketplace;
  const inArea = opts.area ? locationGate(opts.area) : undefined;

  // Facebook's location resolver wants a bare city ("McLean"), not "McLean, VA".
  const searchLocation = (sub.location || '').split(',')[0].trim() || sub.location;

  const seen = new Set();
  const raw = [];
  for (const query of sub.queries) {
    let text = '';
    try {
      text = await search({ query, location: searchLocation, maxPrice: sub.maxPrice, limit: 25 });
    } catch (e) {
      // A single failed query shouldn't sink the whole digest.
      continue;
    }
    const { kept } = filterRealistic(parseListings(text), { inArea, exclude: EXCLUDE_MTB });
    for (const l of kept) {
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      raw.push(l);
    }
  }

  const analyzed = raw.map((l) => ({ listing: l, analysis: analyzeListing(l, { heightIn: sub.heightIn }) }));
  analyzed.sort((a, b) => (SCORE[b.analysis.verdict] || 0) - (SCORE[a.analysis.verdict] || 0));

  const isPick = (x) => (SCORE[x.analysis.verdict] || 0) >= SCORE['Overpriced'];
  const picks = analyzed.filter(isPick);
  const skipped = analyzed.filter((x) => !isPick(x));

  const category = sub.queries.some((q) => /road/i.test(q)) ? 'road bikes' : 'bikes';
  const place = (sub.location || '').split(',')[0].trim() || 'your area';

  return {
    subscriber: sub,
    generatedAt: new Date().toISOString(),
    category,
    place,
    fit: sub.heightIn ? targetFrame(sub.heightIn) : null,
    picks,
    skipped,
    stats: { found: analyzed.length, picks: picks.length, skipped: skipped.length },
  };
}
