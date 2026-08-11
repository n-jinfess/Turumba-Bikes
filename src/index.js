#!/usr/bin/env node
// Turumba CLI.
//
//   turumba serve                 start the subscription website
//   turumba schedule              start the cron scheduler (recurring digests)
//   turumba run [--freq daily]    build + deliver digests now
//   turumba subscribe ...flags    add a subscriber from the command line
//   turumba list                  list subscribers
//   turumba demo                  render a sample digest offline to ./out
//
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { startServer } from './web/server.js';
import { startScheduler } from './scheduler/cron.js';
import { runDigests, deliveryMode } from './newsletter/run.js';
import { upsert, all } from './newsletter/subscribers.js';
import { gatherCandidates } from './newsletter/candidates.js';
import { renderFromAnalysis } from './newsletter/render.js';

const [cmd, ...rest] = process.argv.slice(2);
const flags = parseFlags(rest);

const commands = {
  async serve() {
    startServer();
    if (flags.schedule) startScheduler();
  },

  async schedule() { startScheduler(); },

  async run() {
    console.log(`[turumba] delivery: ${deliveryMode()}`);
    const results = await runDigests({ frequency: flags.freq });
    if (!results.length) return console.log('[turumba] no active subscribers.');
    for (const r of results) {
      const where = r.delivered ? 'sent' : `wrote ${r.path}`;
      console.log(`  • ${r.email} — ${r.picks} pick(s) — ${where}`);
    }
  },

  async subscribe() {
    const sub = await upsert({
      email: flags.email, name: flags.name, location: flags.location,
      maxPrice: flags.maxPrice, heightIn: flags.heightIn,
      queries: flags.queries, frequency: flags.freq,
    });
    console.log(`[turumba] subscribed ${sub.email} (${sub.frequency}) — watching: ${sub.queries.join(', ')}`);
  },

  async list() {
    const list = await all();
    if (!list.length) return console.log('[turumba] no subscribers yet.');
    for (const s of list) {
      console.log(`  ${s.active ? '✓' : '×'} ${s.email} · ${s.location} · <$${s.maxPrice} · ${s.frequency} · [${s.queries.join(', ')}]`);
    }
  },

  // Step 1 of the AI flow: emit the shortlist (triage + fetched details) for a skill to read.
  async candidates() {
    const sub = await resolveSubscriber(flags);
    console.log(`[turumba] gathering candidates for ${sub.email} — this hits the live marketplace…`);
    const data = await gatherCandidates(sub, { limit: Number(flags.limit) || 6 });
    const out = resolve(process.cwd(), flags.out || 'out/candidates.json');
    mkdirSync(resolve(out, '..'), { recursive: true });
    writeFileSync(out, JSON.stringify(data, null, 2));
    console.log(`[turumba] wrote ${data.candidates.length} candidate(s) → ${out}`);
    console.log(`[turumba] next: have the turumba-analyze skill read it and write out/analysis.json, then run "turumba render".`);
  },

  // Step 2 of the AI flow: build the branded digest from the skill's analysis.
  async render() {
    const cPath = flags.candidates || 'out/candidates.json';
    const aPath = flags.analysis || 'out/analysis.json';
    const { subject, html, text } = renderFromAnalysis(cPath, aPath, { unsubUrl: flags.unsubUrl });
    const htmlOut = resolve(process.cwd(), flags.out || 'out/digest.html');
    mkdirSync(resolve(htmlOut, '..'), { recursive: true });
    writeFileSync(htmlOut, html);
    writeFileSync(htmlOut.replace(/\.html$/, '.txt'), text);
    console.log(`Subject: ${subject}`);
    console.log(`[turumba] wrote ${htmlOut}`);
  },

  async demo() { await import('../scripts/demo.js'); },

  help() { printHelp(); },
};

(commands[cmd] || commands.help)().catch((e) => {
  console.error(`[turumba] error: ${e.message}`);
  process.exit(1);
});

// Resolve a subscriber from --email (stored) or build an ad-hoc one from flags.
async function resolveSubscriber(f) {
  if (f.email) {
    const found = (await all()).find((s) => s.email.toLowerCase() === String(f.email).toLowerCase());
    if (found) return found;
  }
  if (!f.location) throw new Error('provide --email of a subscriber, or --location plus --queries for an ad-hoc run');
  return {
    id: 'adhoc', email: f.email || 'you@example.com', name: f.name || 'friend',
    location: f.location, maxPrice: Number(f.maxPrice) || 400,
    heightIn: f.heightIn ? Number(f.heightIn) : undefined,
    queries: (f.queries ? String(f.queries).split(',') : ['road bike']).map((s) => s.trim()).filter(Boolean),
    frequency: f.freq || 'weekly', unsubToken: 'adhoc', active: true,
    createdAt: new Date().toISOString(),
  };
}

function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    f[key] = val;
  }
  return f;
}

function printHelp() {
  console.log(`Turumba — ${'a Jinfessa family tool'}

  turumba serve [--schedule]      start the subscription website (optionally with cron)
  turumba schedule                start the cron scheduler only
  turumba run [--freq daily]      build + deliver digests now (deterministic)
  turumba subscribe --email a@b.com --name Natai --location "McLean, VA" \\
                    --max-price 400 --height-in 71 --queries "road bike,cannondale" --freq weekly
  turumba list                    list subscribers
  turumba demo                    render a sample digest offline to ./out

  AI analysis (run via the turumba-analyze skill):
  turumba candidates --email a@b.com [--limit 6]   emit shortlist + details → out/candidates.json
  turumba render [--analysis out/analysis.json]    build branded digest from the skill's analysis
`);
}
