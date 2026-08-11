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
import { startServer } from './web/server.js';
import { startScheduler } from './scheduler/cron.js';
import { runDigests, deliveryMode } from './newsletter/run.js';
import { upsert, all } from './newsletter/subscribers.js';

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

  async demo() { await import('../scripts/demo.js'); },

  help() { printHelp(); },
};

(commands[cmd] || commands.help)().catch((e) => {
  console.error(`[turumba] error: ${e.message}`);
  process.exit(1);
});

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
  turumba run [--freq daily]      build + deliver digests now
  turumba subscribe --email a@b.com --name Natai --location "McLean, VA" \\
                    --max-price 400 --height-in 71 --queries "road bike,cannondale" --freq weekly
  turumba list                    list subscribers
  turumba demo                    render a sample digest offline to ./out
`);
}
