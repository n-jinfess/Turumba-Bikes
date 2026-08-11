// A dead-simple JSON-file subscriber store. No database to stand up; good for a
// family tool and easy to inspect. Swap this module for a real DB later without
// touching the rest of the app.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dirname, '../../data/subscribers.json');

/**
 * @typedef {Object} Subscriber
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string} location        home city for the search
 * @property {number} maxPrice
 * @property {number} [heightIn]       enables fit analysis
 * @property {string[]} queries        search terms, e.g. ["road bike","cannondale"]
 * @property {'daily'|'weekly'} frequency
 * @property {string} unsubToken       used in the unsubscribe link
 * @property {boolean} active
 * @property {string} createdAt        ISO string
 */

async function load() {
  if (!existsSync(FILE)) return [];
  try { return JSON.parse(await readFile(FILE, 'utf8')); }
  catch { return []; }
}

async function save(list) {
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(list, null, 2));
}

export async function all() { return load(); }

export async function active() {
  return (await load()).filter((s) => s.active);
}

/** Add or update a subscriber by email. @returns {Promise<Subscriber>} */
export async function upsert(input, now = new Date().toISOString()) {
  const list = await load();
  const email = String(input.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('invalid email');

  const existing = list.find((s) => s.email === email);
  const sub = {
    id: existing?.id || randomUUID(),
    email,
    name: input.name?.trim() || existing?.name || 'friend',
    location: input.location?.trim() || existing?.location || '',
    maxPrice: Number(input.maxPrice) || existing?.maxPrice || 400,
    heightIn: input.heightIn != null ? Number(input.heightIn) : existing?.heightIn,
    queries: normalizeQueries(input.queries) || existing?.queries || ['road bike'],
    frequency: input.frequency || existing?.frequency || 'weekly',
    unsubToken: existing?.unsubToken || randomUUID(),
    active: true,
    createdAt: existing?.createdAt || now,
  };
  const next = existing ? list.map((s) => (s.email === email ? sub : s)) : [...list, sub];
  await save(next);
  return sub;
}

export async function unsubscribe(token) {
  const list = await load();
  let changed = false;
  const next = list.map((s) => {
    if (s.unsubToken === token && s.active) { changed = true; return { ...s, active: false }; }
    return s;
  });
  if (changed) await save(next);
  return changed;
}

function normalizeQueries(q) {
  if (!q) return null;
  const arr = Array.isArray(q) ? q : String(q).split(',');
  const cleaned = arr.map((s) => s.trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}
