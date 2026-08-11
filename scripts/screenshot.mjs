// Dev helper: render an HTML file to a PNG using the system Chrome via
// puppeteer-core (already present as a transitive dep). Not shipped in the app.
import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const htmlPath = resolve(process.argv[2] || 'out/turumba-demo.html');
const outPath = resolve(process.argv[3] || 'out/turumba-demo.png');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 680, height: 1200, deviceScaleFactor: 2 });
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log('wrote ' + outPath);
