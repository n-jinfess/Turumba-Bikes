import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeListing } from '../src/analysis/valuation.js';
import { classifyBrand, classifyType } from '../src/analysis/brands.js';
import { parseListings, filterRealistic, parseDetails } from '../src/mcp/filter.js';
import { targetFrame } from '../src/analysis/fit.js';

test('classifies brand tiers correctly', () => {
  assert.equal(classifyBrand('Cannondale CAAD9 road bike').tier, 'reputable-modern');
  assert.equal(classifyBrand('Cannondale CAAD9 road bike').premium, true);
  assert.equal(classifyBrand('Univega Arrow road bike').tier, 'reputable-vintage');
  assert.equal(classifyBrand('Huffy 700c road bike').tier, 'bso');
  assert.equal(classifyBrand('generic no-name bike').tier, 'unknown');
});

test('classifies bike type', () => {
  assert.equal(classifyType('Specialized Hotrock kids bike 20 inch'), 'kids');
  assert.equal(classifyType('Trek road bike 12 speed'), 'road');
  assert.equal(classifyType('Giant mountain bike hardtail'), 'mountain');
});

test('good deal when priced well below market for a reputable brand', () => {
  const a = analyzeListing({ title: 'Cannondale CAAD9 road bike 56cm', price: 200 });
  assert.equal(a.tone, 'good');
  assert.match(a.verdict, /Good deal|Fair/);
});

test('big-box bike is a skip regardless of price', () => {
  const a = analyzeListing({ title: 'Huffy 700c road bike', price: 60 });
  assert.equal(a.verdict, 'Skip — sideways move');
  assert.equal(a.tone, 'bad');
});

test('frame damage tanks the value with an explicit reason', () => {
  const a = analyzeListing({ title: 'Trek 1000 road bike, cracked frame', price: 150 });
  assert.ok(a.reasons.some((r) => /walk away/i.test(r)));
});

test('placeholder price becomes an "ask price" verdict', () => {
  const a = analyzeListing({ title: 'Univega Arrow road bike', price: 1 });
  assert.equal(a.verdict, 'Ask price');
});

test('fit: wrong size overrides an otherwise good deal', () => {
  const a = analyzeListing({ title: 'Cannondale CAAD9 road bike 49cm', price: 200 }, { heightIn: 71 });
  assert.equal(a.verdict, 'Wrong size');
});

test('target frame for 5\'11" is L / 57–59cm', () => {
  const f = targetFrame(71);
  assert.equal(f.letter, 'M/L');
  assert.match(f.cm, /55–57/);
});

test('parseDetails extracts description and photo urls for the AI pass', () => {
  const text = [
    '📋 Listing Details',
    '🔗 https://www.facebook.com/marketplace/item/4682073285357997',
    '**Description:** Univega Arrow 200$, Schwinn Traveler 180$.',
    '📍 Chantilly, VA',
    '🖼️ Photos (2):',
    '   https://cdn.example.com/a.jpg',
    '   https://cdn.example.com/b.jpg',
  ].join('\n');
  const d = parseDetails(text);
  assert.match(d.description, /Univega Arrow 200\$/);
  assert.equal(d.photos.length, 2);
  assert.equal(d.photos[0], 'https://cdn.example.com/a.jpg');
  assert.equal(d.location, 'Chantilly, VA');
});

test('realistic filter drops accessories and stolen posts', () => {
  const text = [
    '**$40** - Bike helmet\n   📍 Vienna, Virginia\n   🆔 1',
    '**$0** - STOLEN bike please return\n   📍 Arlington, Virginia\n   🆔 2',
    '**$200** - Univega Arrow road bike\n   📍 Chantilly, Virginia\n   🆔 3',
  ].join('\n\n');
  const { kept, dropped } = filterRealistic(parseListings(text));
  assert.equal(kept.length, 1);
  assert.equal(kept[0].id, '3');
  assert.equal(dropped.length, 2);
});
