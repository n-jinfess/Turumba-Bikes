// Produce the candidate set an AI analysis pass works from. This is the
// hand-off point between the deterministic app and the (skill-driven) AI:
//
//   deterministic triage  →  fetch full details (description + photos)  →  candidates.json
//
// The AI never sees the raw noisy feed — only the shortlist worth reading.

import { buildDigest } from './digest.js';
import { getListingDetails } from '../mcp/client.js';
import { parseDetails } from '../mcp/filter.js';
import { areaFor } from '../../config/areas.js';

const fbUrl = (id) => `https://www.facebook.com/marketplace/item/${id}`;

/**
 * @param {import('./subscribers.js').Subscriber} sub
 * @param {Object} [opts]
 * @param {number} [opts.limit] how many top picks to enrich with details
 * @param {(args:object)=>Promise<string>} [opts.search] injectable for tests
 * @param {(id:string)=>Promise<string>} [opts.details] injectable for tests
 */
export async function gatherCandidates(sub, opts = {}) {
  const { limit = 6 } = opts;
  const details = opts.details || ((id) => getListingDetails(id));

  const digest = await buildDigest(sub, { area: areaFor(sub.location), search: opts.search });
  const top = digest.picks.slice(0, limit);

  const candidates = [];
  for (const { listing, analysis } of top) {
    let d = { description: '', photos: [] };
    try { d = parseDetails(await details(listing.id)); } catch { /* keep going */ }
    candidates.push({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      priceKnown: listing.price > 5,
      location: listing.location,
      url: fbUrl(listing.id),
      description: d.description,
      photos: d.photos,
      // The deterministic verdict is the baseline the AI should improve on,
      // not replace wholesale — keep the ones it already got right.
      deterministic: analysis,
    });
  }

  return {
    subscriber: sub,
    generatedAt: new Date().toISOString(),
    category: digest.category,
    place: digest.place,
    fit: digest.fit,
    candidates,
    // Carry the deterministic "skipped" list through untouched.
    skipped: digest.skipped.map(({ listing, analysis }) => ({
      id: listing.id, title: listing.title, price: listing.price,
      location: listing.location, verdict: analysis.verdict,
    })),
  };
}
