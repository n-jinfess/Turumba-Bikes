// Build a branded digest from an AI analysis file. This is the second half of
// the skill flow: after Claude writes out/analysis.json, this merges it back
// with the candidate listings and renders the email.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderDigest } from './template.js';

const TONE_SCORE = { good: 100, warn: 60, muted: 40, bad: 10 };

/** Coerce an AI or deterministic analysis into the shape the template needs. */
function normalize(a, source) {
  const marketLow = a.marketLow ?? (Array.isArray(a.market) ? a.market[0] : 0) ?? 0;
  const marketHigh = a.marketHigh ?? (Array.isArray(a.market) ? a.market[1] : 0) ?? 0;
  const retailNew = Array.isArray(a.retailNew) ? a.retailNew : [a.retailNew || 0];
  return {
    verdict: a.verdict || 'Ask price',
    tone: a.tone || 'muted',
    marketLow, marketHigh,
    marketMid: Math.round((marketLow + marketHigh) / 2),
    retailNew,
    reasons: a.reasons || [],
    blurb: a.blurb || '',
    confidence: a.confidence || null,
    fit: a.fit || (a.fitNote ? { fits: 'unknown', note: a.fitNote } : null),
    source,
  };
}

/**
 * @param {string} candidatesPath  out/candidates.json (from `turumba candidates`)
 * @param {string} analysisPath    out/analysis.json   (written by the skill)
 */
export function digestFromAnalysis(candidatesPath, analysisPath) {
  const cand = JSON.parse(readFileSync(resolve(candidatesPath), 'utf8'));
  let ai = {};
  try { ai = JSON.parse(readFileSync(resolve(analysisPath), 'utf8')); } catch { /* AI file optional */ }

  const scored = cand.candidates.map((c) => {
    const hasAi = Boolean(ai[c.id]);
    const analysis = normalize(hasAi ? ai[c.id] : c.deterministic, hasAi ? 'ai' : 'deterministic');
    // The AI may identify what a vague listing actually is ("Bicycles" → the
    // real model); let that override the display title.
    const title = (hasAi && ai[c.id].name) ? ai[c.id].name : c.title;
    return { listing: { id: c.id, title, price: c.price, location: c.location }, analysis };
  });

  // "bad" verdicts (wrong size, kids' bikes, condition risk) belong in the
  // skipped block, not the picks — same as the deterministic digest.
  const picks = scored.filter((x) => x.analysis.tone !== 'bad')
    .sort((x, y) => (TONE_SCORE[y.analysis.tone] || 0) - (TONE_SCORE[x.analysis.tone] || 0));

  const skipped = [
    ...scored.filter((x) => x.analysis.tone === 'bad'),
    ...(cand.skipped || []).map((s) => ({
      listing: { id: s.id, title: s.title, price: s.price, location: s.location },
      analysis: { verdict: s.verdict, tone: 'bad' },
    })),
  ];

  return {
    subscriber: cand.subscriber,
    generatedAt: new Date().toISOString(),
    category: cand.category,
    place: cand.place,
    fit: cand.fit,
    picks,
    skipped,
  };
}

/** Render to {subject, html, text}. */
export function renderFromAnalysis(candidatesPath, analysisPath, { unsubUrl } = {}) {
  const digest = digestFromAnalysis(candidatesPath, analysisPath);
  return renderDigest(digest, { unsubUrl: unsubUrl || '#' });
}
