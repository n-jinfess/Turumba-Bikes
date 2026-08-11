// Parse the secondhand MCP's text output into structured listings, then apply
// a "realistic" filter that strips the noise a raw marketplace feed is full of:
// accessories/parts, lost-&-stolen community posts, and far-away results.

/**
 * @typedef {Object} Listing
 * @property {number} price      0 or 1 means "price in description" placeholder
 * @property {string} title
 * @property {string} location
 * @property {string} id
 */

const RE_LISTING =
  /\*\*\$([0-9.,]+)\*\*\s*-\s*(.+?)\n(?:\s*📍\s*(.+?)\n)?\s*🆔\s*(\d+)/g;

/**
 * Parse the MCP's get_listing_details text into structured fields, so an AI
 * analysis pass (or a human) has the description and photos to work from.
 * @returns {{url:string, description:string, photos:string[], location:string}}
 */
export function parseDetails(text) {
  const url = (text.match(/🔗\s*(\S+)/) || [])[1] || '';
  const location = ((text.match(/\n\s*📍\s*(.+)/) || [])[1] || '').trim();
  const descM = text.match(/\*\*Description:\*\*\s*([\s\S]*?)(?:\n\s*(?:📍|🚚|🖼️)|$)/);
  const description = (descM ? descM[1] : '').trim();
  const photoSection = text.split(/🖼️[^\n]*\n/)[1] || '';
  const photos = [];
  const re = /(https?:\/\/\S+)/g;
  let m;
  while ((m = re.exec(photoSection)) !== null) photos.push(m[1]);
  return { url, description, photos, location };
}

/** Parse MCP search text into structured listings. @returns {Listing[]} */
export function parseListings(text) {
  const out = [];
  let m;
  RE_LISTING.lastIndex = 0;
  while ((m = RE_LISTING.exec(text)) !== null) {
    out.push({
      price: parseFloat(m[1].replace(/,/g, '')),
      title: m[2].trim(),
      location: (m[3] || '').trim(),
      id: m[4],
    });
  }
  return out;
}

// Titles that are accessories/parts, not a whole item.
const ACCESSORY =
  /(helmet|pump|inner ?tube|\btubes?\b|\block\b|\bmounts?\b|reflector|saddle|seat ?post|\bracks?\b|\bpegs?\b|bar tape|handlebar|mirror|\blights?\b|glove|shorts?|jersey|pedal|\bwheels?\b|\brims?\b|\btires?\b|tyre|strap|\bplugs?\b|bottle|cage|valve|\bparts?\b|\bstems?\b|brakes?\b|derailleur|shifters?|\bchains?\b|cassette|cranks?\b|\bstand\b|shoes?\b|cleat|\bdvd\b|topps|\bcards?\b|frame only)/i;

// Community posts that aren't sales.
const NOISE =
  /\b(stolen|lost|help me find|please return|reward|missing|wanted|iso\b|in search of)\b/i;

/**
 * Build a location gate from a home city. We can't compute true distance from
 * the MCP output, so we approximate: keep the home metro's states, drop a
 * curated block-list of far-away towns in those states.
 */
export function locationGate({ nearStates, farCities }) {
  const near = new RegExp(nearStates.join('|'), 'i');
  const far = new RegExp(`\\b(${farCities.join('|')})\\b`, 'i');
  return (loc) => {
    if (!loc) return true; // no location given — keep, let a human judge
    if (!near.test(loc)) return false;
    if (far.test(loc)) return false;
    return true;
  };
}

/**
 * @param {Listing[]} listings
 * @param {Object} opts
 * @param {(loc:string)=>boolean} [opts.inArea]  location gate (see locationGate)
 * @param {RegExp} [opts.exclude]  extra category exclusions (e.g. mountain bikes)
 * @returns {{ kept: Listing[], dropped: Listing[] }}
 */
export function filterRealistic(listings, opts = {}) {
  const { inArea = () => true, exclude } = opts;
  const kept = [];
  const dropped = [];
  for (const l of listings) {
    const reject =
      ACCESSORY.test(l.title) ||
      NOISE.test(l.title) ||
      (exclude && exclude.test(l.title)) ||
      !inArea(l.location);
    (reject ? dropped : kept).push(l);
  }
  return { kept, dropped };
}
