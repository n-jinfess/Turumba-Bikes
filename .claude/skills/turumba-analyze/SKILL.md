---
name: turumba-analyze
description: AI analysis pass for Turumba. Reads the shortlisted secondhand-bike listings (descriptions + photos), judges each one truthfully like a bike expert, and renders the branded digest. Use when the user wants smarter-than-deterministic analysis of Turumba candidates, or says "run the AI analysis / turumba-analyze". Run from the turumba repo root.
---

# Turumba — AI analysis pass

Turumba's deterministic engine is great at triage but blind to model/year/groupset and to what a photo actually shows. This skill adds the missing intelligence: **you** read each shortlisted listing's description and photos and give an honest expert verdict, then render the branded digest.

Keep it **truthful over flattering** — Turumba's whole promise is "we'd rather send nothing than a bad lead." Never oversell. Only claim what the description or photos actually support.

## Steps

**1. Pick the target.** Ask the user for a stored subscriber `--email`, or an ad-hoc run (`--location`, `--queries`, `--max-price`, `--height-in`). If they don't care, use `--location "McLean, VA" --queries "road bike" --height-in 71`.

**2. Gather candidates** (deterministic triage + fetched details, hits the live marketplace):
```bash
node src/index.js candidates --email <email>          # or: --location "..." --queries "..." --height-in 71
```
This writes `out/candidates.json`: each candidate has `title, price, location, url, description, photos[]`, the rider `fit` target, and the `deterministic` baseline verdict.

**3. Read `out/candidates.json`.** For **each** candidate, analyze truthfully:
- **Read the description.** If it bundles several bikes with prices in the text (a "collection" listing), pull out each bike + its price and judge them individually in your reasons.
- **Look at the photos.** Download 1–2 and view them — this is the whole point:
  ```bash
  curl -s -o /tmp/turumba_<id>.jpg "<photo-url>"
  ```
  then Read the image. Check for rust, cracks/dents at frame joints, drivetrain wear, flat/rotted tires, overall care. Only pull a couple of photos per bike to stay efficient.
- **Identify model/year/groupset** if you can (e.g. "CAAD9 with 105" vs "CAAD with Sora") and let it refine value beyond the brand-tier baseline.
- **Check fit** against the rider target in the candidates file.
- **Decide:** verdict, tone, refined market range, retail-new range, confidence, 2–4 short reasons, and a one-line blurb in Turumba's voice (warm, specific, honest — see `config/brand.js`; the curator is named there).

Improve on the deterministic baseline where reading changed the answer; keep it where the baseline was already right. If you genuinely can't tell condition, set `confidence: "low"` and use a hedged verdict like "Worth a look — verify condition".

**4. Write `out/analysis.json`**, keyed by listing id:
```json
{
  "1234567890": {
    "verdict": "Good deal",
    "tone": "good",
    "marketLow": 300,
    "marketHigh": 450,
    "retailNew": [950, 1400],
    "confidence": "high",
    "reasons": [
      "CAAD9 with a 105 groupset — a real step above entry tier",
      "Photos show a clean drivetrain and no rust at the joints"
    ],
    "blurb": "This is the one to text about today — priced under market and it looks cared for.",
    "fitNote": "Listed 56cm — matches your L target."
  }
}
```
- `tone` must be one of `good | warn | bad | muted` (drives the badge color).
- `verdict` is a short label; suggested set: `Good deal`, `Fair — at market`, `Worth a look — verify condition`, `High — negotiate`, `Overpriced`, `Skip — condition risk`, `Wrong size`, `Ask price`.

**5. Render the branded digest:**
```bash
node src/index.js render      # merges candidates + analysis → out/digest.html + out/digest.txt
```

**6. Offer next:** preview it (`node scripts/screenshot.mjs out/digest.html out/digest.png`, then show the PNG), create a Gmail draft, or send. Ask before sending anything outward.

## Guardrails
- Truthful, not promotional. A photo that reveals hidden damage **downgrades** the verdict — say so in the reasons.
- No fabrication: if the description is thin and there are no photos, say confidence is low rather than inventing detail.
- Stay in Turumba's voice for the `blurb`: a friend who knows bikes, not a retailer.
