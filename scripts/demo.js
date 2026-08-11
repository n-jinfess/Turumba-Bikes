// Offline demo: renders a full Turumba digest to ./out without touching the
// network, using a fixture that mimics the secondhand MCP's search output.
// Run with:  npm run demo   (then open out/turumba-demo.html)

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDigest } from '../src/newsletter/digest.js';
import { renderDigest } from '../src/newsletter/template.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../out');

// A believable spread so the analysis engine's verdicts are visible.
const FIXTURE = `🔍 Found 8 listings for "road bike" on facebook
📍 Location: mclean

**$275** - Cannondale CAAD9 aluminum road bike 56cm, tuned
   📍 Arlington, Virginia
   🆔 1111111111
   📷 3 photos

**$200** - Univega Arrow vintage road bike, ready to ride
   📍 Chantilly, Virginia
   🆔 4682073285357997
   📷 2 photos

**$150** - Specialized Allez road bike, needs new tires
   📍 Fairfax, Virginia
   🆔 4444444444
   📷 2 photos

**$180** - Schwinn Traveler vintage road bike
   📍 Vienna, Virginia
   🆔 2222222222
   📷 1 photo

**$220** - Trek 1000 road bike, some rust on chainstay
   📍 Bethesda, Maryland
   🆔 6666666666
   📷 1 photo

**$95** - Huffy 700c road bike
   📍 Falls Church, Virginia
   🆔 3333333333
   📷 1 photo

**$1** - Vintage Road Bike Collection (pricing in description)
   📍 South Riding, Virginia
   🆔 5555555555
   📷 2 photos

**$120** - Specialized Hotrock kids bike 20 inch
   📍 Reston, Virginia
   🆔 7777777777
   📷 1 photo`;

const subscriber = {
  id: 'demo', email: 'natai.jinfessa1@gmail.com', name: 'Natai',
  location: 'McLean, VA', maxPrice: 400, heightIn: 71,
  queries: ['road bike'], frequency: 'weekly',
  unsubToken: 'demo-token', active: true, createdAt: new Date().toISOString(),
};

const digest = await buildDigest(subscriber, { search: async () => FIXTURE });
const { subject, html, text } = renderDigest(digest, { unsubUrl: 'http://localhost:4310/unsubscribe?token=demo-token' });

await mkdir(OUT, { recursive: true });
await writeFile(resolve(OUT, 'turumba-demo.html'), html);
await writeFile(resolve(OUT, 'turumba-demo.txt'), text);

console.log(`Subject: ${subject}`);
console.log(`Picks: ${digest.picks.length} · Skipped: ${digest.skipped.length}`);
console.log(`Wrote out/turumba-demo.html and out/turumba-demo.txt`);
