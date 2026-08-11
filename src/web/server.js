// Subscription web app: a branded landing/signup page, a subscribe endpoint,
// and one-click unsubscribe. Intentionally dependency-light (just Express) and
// server-rendered so it deploys anywhere Node runs.

import express from 'express';
import { upsert, unsubscribe, all } from '../newsletter/subscribers.js';
import { landingPage, resultPage } from './pages.js';

export function createServer() {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.get('/', (_req, res) => res.send(landingPage()));

  app.get('/healthz', async (_req, res) => {
    res.json({ ok: true, subscribers: (await all()).length });
  });

  app.post('/subscribe', async (req, res) => {
    try {
      const sub = await upsert({
        email: req.body.email,
        name: req.body.name,
        location: req.body.location,
        maxPrice: req.body.maxPrice,
        heightIn: req.body.heightIn || undefined,
        queries: req.body.queries,
        frequency: req.body.frequency,
      });
      res.send(resultPage({
        title: `You're on the list, ${escapeHtml(sub.name)}.`,
        body: `We'll watch <strong>${escapeHtml(sub.queries.join(', '))}</strong> near <strong>${escapeHtml(sub.location || 'your area')}</strong> under $${sub.maxPrice}, ${sub.frequency}. No filler — we only write when something's worth your time.`,
      }));
    } catch (e) {
      res.status(400).send(resultPage({ title: 'Hmm, that didn\'t work.', body: escapeHtml(e.message), error: true }));
    }
  });

  app.get('/unsubscribe', async (req, res) => {
    const ok = await unsubscribe(String(req.query.token || ''));
    res.send(resultPage({
      title: ok ? 'You\'re unsubscribed.' : 'Nothing to do.',
      body: ok ? 'No more Turumba digests. Come back anytime.' : 'That link didn\'t match an active subscription.',
    }));
  });

  return app;
}

export function startServer(port = Number(process.env.PORT) || 4310, log = console.log) {
  const app = createServer();
  return app.listen(port, () => log(`[turumba] web up on http://localhost:${port}`));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
