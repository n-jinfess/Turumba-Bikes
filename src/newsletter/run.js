// Build and deliver digests for subscribers. This is the job the scheduler and
// the `turumba run` CLI command both call.

import { active } from './subscribers.js';
import { buildDigest } from './digest.js';
import { renderDigest } from './template.js';
import { sendMail, isDryRun } from '../email/send.js';
import { areaFor } from '../../config/areas.js';

const baseUrl = () => process.env.PUBLIC_BASE_URL || 'http://localhost:4310';

/**
 * @param {Object} [opts]
 * @param {'daily'|'weekly'} [opts.frequency] only send to subscribers on this cadence
 * @param {import('./subscribers.js').Subscriber[]} [opts.subscribers] override the audience
 * @returns {Promise<Array<{email:string, delivered:boolean, subject:string, picks:number, path?:string}>>}
 */
export async function runDigests(opts = {}) {
  const audience = opts.subscribers
    || (await active()).filter((s) => !opts.frequency || s.frequency === opts.frequency);

  const results = [];
  for (const sub of audience) {
    const digest = await buildDigest(sub, { area: areaFor(sub.location) });
    const unsubUrl = `${baseUrl()}/unsubscribe?token=${sub.unsubToken}`;
    const { subject, html, text } = renderDigest(digest, { unsubUrl });
    const res = await sendMail({ to: sub.email, subject, html, text, slug: `digest_${sub.name}` });
    results.push({ email: sub.email, delivered: res.delivered, subject, picks: digest.picks.length, path: res.path });
  }
  return results;
}

export function deliveryMode() {
  return isDryRun() ? 'DRY-RUN (writing HTML to ./out)' : 'SMTP';
}
