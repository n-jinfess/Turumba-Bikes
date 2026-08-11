<div align="center">

# TURUMBA

**A Jinfessa family tool**

*The secondhand bikes worth going out of your way for — found, filtered, and honestly analyzed.*

</div>

---

Turumba watches secondhand marketplaces for you, throws out the noise, and mails a clean, branded digest that tells you the **truth** about every listing: what it's worth used, what it retails for new, whether it fits, and whether to walk away.

It's built on top of the [`secondhand-mcp`](https://www.npmjs.com/package/secondhand-mcp) server (Facebook Marketplace, eBay, Depop, Poshmark) but adds the three things a raw marketplace feed never gives you:

1. **A realistic filter** — strips accessories, parts, lost-&-stolen community posts, and far-away results, so a search for "road bike" returns *bikes*.
2. **A deterministic deal-analysis engine** — a real valuation with a verdict and plain-English reasons. **No AI, no guessing.** Same listing always yields the same, explainable answer.
3. **A newsletter platform** — subscribers, preferences, a branded email in a human editorial voice, one-click unsubscribe, and a cron scheduler.

## Why "no AI"?

Every verdict comes from rules you can read in [`src/analysis/`](src/analysis/): a brand-tier knowledge base, market-value tables, condition parsing, and fit sizing. That means the analysis is **auditable, free to run, offline, and never hallucinates a price**. If you disagree with a verdict, you can find the exact line that produced it and change it.

## What a digest looks like

```
★ TOP PICK — Cannondale CAAD9 aluminum road bike 56cm — $275
  Arlington, VA · used market $326–$634 · retail new ~$950
  Verdict: GOOD DEAL — priced below what these go for.
  Why: Cannondale is a shop-serviceable modern brand · premium model line · recently serviced

Trek 1000 road bike, some rust — $220
  Verdict: FAIR — CHECK CONDITION (rust noted; not a clean "good deal")

SKIPPED: Huffy 700c — sideways move · Specialized Hotrock 20" — kids' bike
```

Run `npm run demo` to render a full sample to `out/turumba-demo.html`.

## Quickstart

```bash
git clone <your-fork> turumba && cd turumba
npm install
cp .env.example .env         # optional — everything works in dry-run without it

npm run demo                 # render a sample digest to ./out (offline, no network)
npm test                     # run the analysis-engine test suite

# add yourself and generate a real digest from live Facebook Marketplace
node src/index.js subscribe --email you@email.com --name Natai \
  --location "McLean, VA" --max-price 400 --height-in 71 \
  --queries "road bike,cannondale,specialized allez" --freq weekly
node src/index.js run        # dry-run writes HTML to ./out; with SMTP set, it sends

npm run serve                # start the subscription website at http://localhost:4310
```

## How it works

```
subscriber preferences
        │
        ▼
  secondhand-mcp  ──►  parse  ──►  realistic filter  ──►  dedupe
  (Facebook, etc.)                 (accessories, stolen,
        │                           far-away, mountain bikes)
        ▼
  deterministic analysis engine   ──►  rank  ──►  branded email  ──►  SMTP / dry-run
  (brand tier · market value ·
   condition · fit · verdict)
```

Delivery is **dry-run by default**: with no `SMTP_*` set, digests render to `./out` instead of sending, so you can build and review the whole pipeline with zero secrets.

## Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `MARKETPLACES` | Which marketplaces the MCP enables (default `facebook`, no auth needed) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Email delivery. Leave blank for dry-run. |
| `MAIL_FROM_NAME` / `MAIL_FROM_EMAIL` | The From: identity subscribers see |
| `PORT` | Web app port (default 4310) |
| `PUBLIC_BASE_URL` | Base URL used to build unsubscribe links |
| `TURUMBA_CRON_DAILY` / `TURUMBA_CRON_WEEKLY` | Cron expressions for the scheduler |

## CLI

```
turumba serve [--schedule]     start the subscription website (optionally with cron)
turumba schedule               start the cron scheduler only
turumba run [--freq daily]     build + deliver digests now
turumba subscribe ...flags     add a subscriber from the command line
turumba list                   list subscribers
turumba demo                   render a sample digest offline to ./out
```

## Project layout

```
config/
  brand.js         brand tokens (name, palette, voice) — change the look here
  areas.js         optional location gates (e.g. the DMV metro)
src/
  mcp/             stdio client for secondhand-mcp + the realistic filter
  analysis/        the deterministic engine: brands, valuation, fit  ← the heart
  newsletter/      subscriber store, digest builder, branded template, voice
  email/           nodemailer delivery (with dry-run to ./out)
  scheduler/       node-cron recurring digests
  web/             Express signup site + one-click unsubscribe
  index.js         CLI
scripts/
  demo.js          offline end-to-end render
test/              node:test suite for the analysis engine
```

## Extending it

- **New category (not just bikes):** the pipeline is generic. Add a knowledge base beside `analysis/brands.js` and swap the valuation rules.
- **New marketplace:** it comes free with `secondhand-mcp` — set `MARKETPLACES`.
- **Real database:** replace `src/newsletter/subscribers.js` (a JSON-file store) with your DB of choice; nothing else changes.

## Roadmap

- [ ] Per-listing detail enrichment (photos, description) before analysis
- [ ] Sold-comp calibration when marketplaces expose it
- [ ] Price-history tracking to catch drops on watched listings
- [ ] Double opt-in for public signups

## License

MIT © 2026 Jinfessa. See [LICENSE](LICENSE).
