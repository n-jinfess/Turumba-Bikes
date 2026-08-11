// Email delivery. If SMTP isn't configured, we run in DRY-RUN: the rendered
// HTML is written to ./out so you can open and review it. This makes the whole
// platform runnable end-to-end with zero secrets.

import nodemailer from 'nodemailer';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../out');

let cached;
function transport() {
  if (cached !== undefined) return cached;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER) { cached = null; return null; } // dry-run
  cached = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return cached;
}

/**
 * @param {{to:string, subject:string, html:string, text:string, slug?:string}} msg
 * @returns {Promise<{delivered:boolean, path?:string, id?:string}>}
 */
export async function sendMail({ to, subject, html, text, slug }) {
  const t = transport();
  const from = `"${process.env.MAIL_FROM_NAME || 'Turumba'}" <${process.env.MAIL_FROM_EMAIL || 'hello@turumba.family'}>`;

  if (!t) {
    await mkdir(OUT, { recursive: true });
    const safe = (slug || to).replace(/[^a-z0-9]+/gi, '_');
    const path = resolve(OUT, `${safe}.html`);
    await writeFile(path, html);
    return { delivered: false, path };
  }
  const info = await t.sendMail({ from, to, subject, html, text });
  return { delivered: true, id: info.messageId };
}

export function isDryRun() { return transport() === null; }
