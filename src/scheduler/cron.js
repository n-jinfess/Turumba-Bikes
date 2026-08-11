// Cron scheduling for recurring digests. Kept separate from the web server so
// you can run the scheduler as its own process (or let the web app start it).

import cron from 'node-cron';
import { runDigests, deliveryMode } from '../newsletter/run.js';

// Default cadences. Override with TURUMBA_CRON_DAILY / TURUMBA_CRON_WEEKLY.
const DAILY = process.env.TURUMBA_CRON_DAILY || '0 8 * * *';       // 8am every day
const WEEKLY = process.env.TURUMBA_CRON_WEEKLY || '0 8 * * 1';     // 8am Mondays

export function startScheduler(log = console.log) {
  log(`[turumba] scheduler up · delivery: ${deliveryMode()}`);
  log(`[turumba]   daily  digests @ "${DAILY}"`);
  log(`[turumba]   weekly digests @ "${WEEKLY}"`);

  cron.schedule(DAILY, async () => {
    const r = await runDigests({ frequency: 'daily' });
    log(`[turumba] daily run → ${r.length} subscriber(s)`);
  });
  cron.schedule(WEEKLY, async () => {
    const r = await runDigests({ frequency: 'weekly' });
    log(`[turumba] weekly run → ${r.length} subscriber(s)`);
  });
}
