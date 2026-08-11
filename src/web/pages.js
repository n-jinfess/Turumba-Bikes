// Server-rendered pages for the subscription site. Same brand tokens as the
// email, so the whole product reads as one thing.
import { brand } from '../../config/brand.js';

const c = brand.color;

function shell(title, inner) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  :root{color-scheme:light}
  *{box-sizing:border-box}
  body{margin:0;background:${c.paper};color:${c.text};font-family:${brand.fontSans};line-height:1.6}
  .wrap{max-width:560px;margin:0 auto;padding:0 20px 60px}
  header{background:${c.ink};color:#fff;padding:40px 20px 34px;text-align:center;margin-bottom:34px}
  .mark{font-family:${brand.fontSerif};font-size:34px;letter-spacing:8px;font-weight:700}
  .rule{height:2px;width:52px;background:${c.gold};margin:14px auto 12px}
  .tag{font-size:12px;letter-spacing:1.5px;color:${c.gold};text-transform:uppercase}
  h1{font-family:${brand.fontSerif};font-size:26px;color:${c.ink};margin:0 0 6px}
  .lede{font-size:16px;color:${c.text};margin:0 0 26px}
  form{background:${c.card};border:1px solid ${c.hairline};border-radius:14px;padding:24px}
  label{display:block;font-size:12px;letter-spacing:.4px;text-transform:uppercase;color:${c.muted};margin:14px 0 5px;font-weight:600}
  input,select{width:100%;padding:11px 12px;border:1px solid ${c.hairline};border-radius:8px;font-size:15px;background:#fff;color:${c.ink}}
  .row{display:flex;gap:12px}.row>div{flex:1}
  button{margin-top:22px;width:100%;background:${c.ink};color:#fff;border:0;border-radius:9px;padding:14px;font-size:15px;font-weight:600;cursor:pointer}
  button:hover{background:${c.inkSoft}}
  .fine{font-size:12px;color:${c.muted};margin-top:14px;text-align:center}
  .foot{text-align:center;margin-top:30px;font-size:12px;color:${c.muted}}
  .foot .mk{font-family:${brand.fontSerif};letter-spacing:3px;color:${c.ink};font-weight:700}
  .card-note{background:${c.card};border:1px solid ${c.hairline};border-left:4px solid ${c.gold};border-radius:10px;padding:16px 18px;margin-bottom:26px;font-size:14px}
</style></head><body>
<header><div class="mark">${brand.name.toUpperCase()}</div><div class="rule"></div><div class="tag">${brand.tagline}</div></header>
<div class="wrap">${inner}
  <div class="foot"><span class="mk">${brand.name.toUpperCase()}</span><br>${brand.tagline}</div>
</div></body></html>`;
}

export function landingPage() {
  return shell(`${brand.name} — secondhand deals, honestly analyzed`, `
    <h1>The secondhand bikes worth going out of your way for.</h1>
    <p class="lede">Turumba watches Facebook Marketplace for you, throws out the accessories and stolen-bike posts, and tells you the truth about every listing — what it's worth, what it retails for new, and whether to walk. No AI guesswork. No filler emails.</p>
    <div class="card-note">Every verdict is deterministic and explainable — brand tier, market value, condition, and fit, from rules you can read. We'd rather send you nothing than a bad lead.</div>
    <form method="post" action="/subscribe">
      <div class="row">
        <div><label>Name</label><input name="name" placeholder="Natai" required></div>
        <div><label>Email</label><input name="email" type="email" placeholder="you@email.com" required></div>
      </div>
      <label>Where are you hunting?</label>
      <input name="location" placeholder="McLean, VA" required>
      <div class="row">
        <div><label>Max price ($)</label><input name="maxPrice" type="number" value="400" min="20" required></div>
        <div><label>Your height (in)</label><input name="heightIn" type="number" placeholder="71" min="48" max="84"></div>
      </div>
      <label>What are you looking for? (comma-separated)</label>
      <input name="queries" placeholder="road bike, cannondale, specialized allez" required>
      <label>How often?</label>
      <select name="frequency"><option value="weekly">Weekly</option><option value="daily">Daily</option></select>
      <button type="submit">Watch the market for me →</button>
      <div class="fine">One-click unsubscribe in every email. Height is optional — it unlocks fit analysis.</div>
    </form>`);
}

export function resultPage({ title, body, error }) {
  return shell(`${brand.name} — ${title}`, `
    <h1 style="${error ? `color:${c.bad}` : ''}">${title}</h1>
    <p class="lede">${body}</p>
    <p><a href="/" style="color:${c.inkSoft};font-weight:600;">← back to Turumba</a></p>`);
}
