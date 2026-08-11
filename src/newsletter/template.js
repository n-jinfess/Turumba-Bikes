// Render a digest into a branded, email-safe HTML document and a plain-text
// alternative. Table-based layout + inline styles for broad client support.

import { brand } from '../../config/brand.js';
import { hook, signoff, verdictGloss, sellerMessage } from './copy.js';

const c = brand.color;
const fbUrl = (id) => `https://www.facebook.com/marketplace/item/${id}`;
const money = (n) => `$${n.toLocaleString('en-US')}`;
const range = ([lo, hi]) => `${money(lo)}–${money(hi)}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const toneColor = (t) => ({ good: c.good, warn: c.warn, bad: c.bad, muted: c.muted }[t] || c.muted);

const dateLabel = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** @returns {{subject:string, html:string, text:string}} */
export function renderDigest(digest, { unsubUrl = '#' } = {}) {
  const { subscriber: sub, picks, category, place, fit } = digest;
  const top = picks[0];
  const rest = picks.slice(1);

  const subject = top
    ? `🚲 Turumba — ${topSubject(top)} near ${place}`
    : `🚲 Turumba — quiet week near ${place}`;

  const html = wrap(digest, unsubUrl, `
    ${intro(digest)}
    ${top ? topPickCard(top, sub) : ''}
    ${rest.length ? restTable(rest) : ''}
    ${digest.skipped.length ? skippedBlock(digest.skipped) : ''}
    ${fit ? fitReminder(fit) : ''}
    ${signoffBlock()}
  `);

  const text = renderText(digest, unsubUrl);
  return { subject, html, text };
}

function topSubject(top) {
  const price = top.listing.price > 5 ? ` at ${money(top.listing.price)}` : '';
  const name = top.listing.title.length > 30 ? top.listing.title.slice(0, 28) + '…' : top.listing.title;
  return `${name}${price} — ${top.analysis.verdict}`;
}

// ── HTML sections ─────────────────────────────────────────────────────────────

function intro(d) {
  return row(`
    <p style="margin:0;font-size:15px;line-height:1.6;color:${c.text};">
      Hi ${esc(d.subscriber.name)} — ${esc(hook(d.picks.length, d.category, d.place))}
    </p>`);
}

function topPickCard(item, sub) {
  const { listing: l, analysis: a } = item;
  const price = l.price > 5 ? money(l.price) : 'Ask';
  const dealCheck = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${c.hairline};border-radius:8px;margin:12px 0;">
      <tr>
        ${cell('Listed', price, c.ink)}
        ${cell('Used market', range([a.marketLow, a.marketHigh]), c.ink, true)}
        ${cell('Retail new', `~${money(a.retailNew[0])}`, c.bad)}
      </tr>
    </table>`;
  const badge = `<span style="display:inline-block;background:${tint(a.tone)};color:${toneColor(a.tone)};font-size:11px;font-weight:700;letter-spacing:.5px;padding:5px 11px;border-radius:5px;">${esc(a.verdict.toUpperCase())}</span>`;
  const reasons = a.reasons.slice(0, 4).map((r) => `<li style="margin:2px 0;">${esc(r)}</li>`).join('');

  return row(`
    <div style="margin-bottom:10px;"><span style="display:inline-block;background:${c.gold};color:${c.ink};font-size:11px;font-weight:700;letter-spacing:1.5px;padding:4px 10px;border-radius:4px;">★ TOP PICK</span></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${c.hairline};border-radius:12px;">
      <tr><td style="padding:18px 20px;">
        <table role="presentation" width="100%"><tr>
          <td style="font-size:18px;font-weight:700;color:${c.ink};">${esc(shortTitle(l.title))}</td>
          <td align="right"><span style="display:inline-block;background:${c.ink};color:${c.goldSoft};font-size:16px;font-weight:700;padding:5px 12px;border-radius:6px;">${price}</span></td>
        </tr></table>
        <div style="font-size:13px;color:${c.muted};margin:6px 0 2px;">📍 ${esc(l.location || 'nearby')}</div>
        ${dealCheck}
        ${badge}
        <p style="margin:12px 0;font-size:14px;line-height:1.6;color:${c.text};">${esc(a.blurb || verdictGloss(a))}</p>
        ${a.confidence ? `<div style="font-size:11px;color:${c.muted};margin:-6px 0 8px;">Analysis confidence: ${esc(a.confidence)}${a.source === 'ai' ? ' · read description &amp; photos' : ' · from listing title'}</div>` : ''}
        <div style="font-size:12px;color:${c.muted};margin-bottom:12px;">Why:<ul style="margin:6px 0 0;padding-left:18px;color:${c.text};font-size:13px;">${reasons}</ul></div>
        <a href="${fbUrl(l.id)}" style="display:inline-block;background:${c.ink};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;">View on Marketplace →</a>
        <div style="margin-top:14px;background:${c.paper};border-left:3px solid ${c.gold};border-radius:0 6px 6px 0;padding:12px 14px;">
          <div style="font-size:11px;letter-spacing:1px;color:${c.warn};font-weight:700;margin-bottom:5px;">MESSAGE TO SEND THE SELLER</div>
          <div style="font-size:13px;line-height:1.55;color:${c.text};font-style:italic;">“${esc(sellerMessage(sub))}”</div>
        </div>
      </td></tr>
    </table>`);
}

function restTable(items) {
  const rows = items.map(({ listing: l, analysis: a }) => `
    <tr>
      <td style="padding:9px 0;border-top:1px solid ${c.hairline};font-size:14px;color:${c.text};">
        <a href="${fbUrl(l.id)}" style="color:${c.inkSoft};font-weight:600;text-decoration:none;">${esc(shortTitle(l.title))}</a>
        <span style="color:${c.muted};font-size:12px;"> · ${esc((l.location || '').split(',')[0])}</span>
      </td>
      <td align="center" style="padding:9px 0;border-top:1px solid ${c.hairline};font-weight:700;color:${c.ink};font-size:14px;">${l.price > 5 ? money(l.price) : 'Ask'}</td>
      <td align="center" style="padding:9px 0;border-top:1px solid ${c.hairline};color:${c.muted};font-size:13px;">${range([a.marketLow, a.marketHigh])}</td>
      <td align="right" style="padding:9px 0;border-top:1px solid ${c.hairline};color:${toneColor(a.tone)};font-weight:600;font-size:13px;">${esc(a.verdict)}</td>
    </tr>`).join('');
  return row(`
    <div style="font-size:13px;font-weight:700;letter-spacing:1px;color:${c.ink};text-transform:uppercase;border-bottom:2px solid ${c.ink};padding-bottom:6px;margin-top:6px;">Also worth a look — deal check</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
      <tr style="font-size:10px;color:${c.muted};text-transform:uppercase;letter-spacing:.5px;">
        <td style="padding:6px 0;">Bike</td><td align="center">Listed</td><td align="center">Market</td><td align="right">Verdict</td>
      </tr>
      ${rows}
    </table>`);
}

function skippedBlock(items) {
  const lines = items.slice(0, 6).map(({ listing: l, analysis: a }) =>
    `<strong>${esc(shortTitle(l.title))}</strong> — ${esc(a.verdict.toLowerCase())}`).join('<br>');
  return row(`
    <div style="background:#faf3f2;border-radius:10px;padding:14px 16px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:${c.bad};margin-bottom:6px;">✕ SKIPPED (so you don't waste a trip)</div>
      <div style="font-size:13px;line-height:1.7;color:#6b4a48;">${lines}</div>
    </div>`);
}

function fitReminder(fit) {
  return row(`
    <div style="background:${c.ink};border-radius:10px;padding:16px 18px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:${c.gold};margin-bottom:7px;">📐 YOUR FIT</div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#d7ded8;">Target frame <strong style="color:#fff;">${esc(fit.cm)}</strong> (size ${esc(fit.letter)}). Always ask a seller the frame size and whether the wheels are 27" or 700c before you drive out.</p>
    </div>`);
}

function signoffBlock() {
  const [line1, line2] = signoff().split('\n');
  return row(`<p style="margin:2px 0 0;font-size:15px;line-height:1.6;color:${c.text};">${esc(line1)}<br><strong>${esc(line2)}</strong></p>`);
}

// ── Shell ─────────────────────────────────────────────────────────────────────

function wrap(d, unsubUrl, inner) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.paper};margin:0;padding:24px 0;font-family:${brand.fontSans};">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${c.card};border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(20,37,29,.08);">
  <tr><td style="background:${c.ink};padding:28px 32px 22px;">
    <div style="font-size:26px;letter-spacing:6px;font-weight:700;color:#fff;font-family:${brand.fontSerif};">${brand.name.toUpperCase()}</div>
    <div style="height:2px;width:44px;background:${c.gold};margin:12px 0 10px;"></div>
    <div style="font-size:12px;letter-spacing:1px;color:${c.gold};text-transform:uppercase;">${esc(brand.tagline)}</div>
  </td></tr>
  <tr><td style="background:${c.inkSoft};padding:12px 32px;">
    <table role="presentation" width="100%"><tr>
      <td style="font-size:12px;color:#a9bbb0;letter-spacing:.5px;">🚲 BIKE WATCH · ${esc(d.place)}</td>
      <td align="right" style="font-size:12px;color:#a9bbb0;">${dateLabel(d.generatedAt)} · under ${money(d.subscriber.maxPrice)}</td>
    </tr></table>
  </td></tr>
  ${inner}
  <tr><td style="padding:24px 32px 30px;text-align:center;">
    <div style="height:1px;background:${c.hairline};margin-bottom:18px;"></div>
    <div style="font-size:15px;letter-spacing:4px;font-weight:700;color:${c.ink};font-family:${brand.fontSerif};">${brand.name.toUpperCase()}</div>
    <div style="font-size:11px;color:${c.muted};margin-top:6px;line-height:1.6;">
      Filtered for realistic listings — accessories, lost/stolen posts &amp; far-away items removed<br>
      ${esc(brand.tagline)} · <a href="${unsubUrl}" style="color:${c.muted};">unsubscribe</a>
    </div>
  </td></tr>
</table></td></tr></table>`;
}

const row = (inner) => `<tr><td style="padding:20px 32px 0;">${inner}</td></tr>`;
function cell(label, value, color, border) {
  return `<td width="33%" style="padding:10px 8px;text-align:center;${border ? `border-left:1px solid ${c.hairline};border-right:1px solid ${c.hairline};` : ''}">
    <div style="font-size:10px;letter-spacing:.5px;color:${c.muted};text-transform:uppercase;">${label}</div>
    <div style="font-size:16px;font-weight:700;color:${color};margin-top:3px;">${value}</div>
  </td>`;
}
const tint = (tone) => ({ good: '#e7efe8', warn: '#f7efdd', bad: '#f7e6e4', muted: '#eee' }[tone] || '#eee');
const cap = (s) => String(s).replace(/\b\w/g, (x) => x.toUpperCase());
const shortTitle = (t) => (t.length > 40 ? t.slice(0, 38) + '…' : t);

// ── Plain-text alternative ────────────────────────────────────────────────────

export function renderText(d, unsubUrl) {
  const L = [];
  L.push(`TURUMBA — ${d.category} near ${d.place}`, brand.tagline, '');
  L.push(hook(d.picks.length, d.category, d.place), '');
  d.picks.forEach(({ listing: l, analysis: a }, i) => {
    const price = l.price > 5 ? money(l.price) : 'Ask price';
    L.push(`${i === 0 ? '★ TOP PICK — ' : ''}${shortTitle(l.title)} — ${price}`);
    L.push(`  ${l.location || 'nearby'} · market ${range([a.marketLow, a.marketHigh])} · retail new ~${money(a.retailNew[0])}`);
    L.push(`  Verdict: ${a.verdict} — ${a.blurb || verdictGloss(a)}`);
    L.push(`  ${fbUrl(l.id)}`, '');
  });
  if (d.skipped.length) {
    L.push('SKIPPED:');
    d.skipped.slice(0, 6).forEach(({ listing: l, analysis: a }) =>
      L.push(`  - ${shortTitle(l.title)} — ${a.verdict}`));
    L.push('');
  }
  if (d.fit) L.push(`YOUR FIT: target frame ${d.fit.cm} (${d.fit.letter}).`, '');
  L.push(signoff(), '', `Unsubscribe: ${unsubUrl}`);
  return L.join('\n');
}
