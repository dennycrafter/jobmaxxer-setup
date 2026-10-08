// Checks a master CV on the real tracker page before you save it.
// Usage:  bash setup/check-cv.sh <master-cv.json> [preview.png]
// The JSON can be the master CV itself, or {"cv": <master CV>, ...} as saved in profile/cv.
// Opens index.html in a hidden browser with a fake, empty database (nothing real is touched),
// shows the Master CV page and prints what the page measured:
//   fit: "Page filled", lines left at the bottom, lines running onto page 2, and lines that spill a word or two
//   core: every line on the printed page with its length and how many lines it takes
//   optional: the hidden optional lines, with their length, to bring in when there is space
//   problems / lookAt: order (newest first), dates, places, bullets, summary and header checks from setup/cv-rules.js
// and saves a picture of the page (default setup/cv-preview.png) to show the person.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { reviewCv } = require("./cv-rules");

const ROOT = path.resolve(__dirname, "..");
const [, , cvPath, shotArg] = process.argv;
if (!cvPath) { console.error("Usage: bash setup/check-cv.sh <master-cv.json> [preview.png]"); process.exit(2); }
let cv = JSON.parse(fs.readFileSync(cvPath, "utf8"));
if (cv && cv.cv && cv.cv.sections) cv = cv.cv;
const shot = shotArg || path.join(__dirname, "cv-preview.png");

// Fake window.claude: an empty database holding only this CV. Writes go nowhere.
const fake = (c) => {
  const docs = { "profile/cv": { cv: c, rules: "" } };
  const db = {
    collection: () => ({ onSnapshot: (cb) => { setTimeout(() => cb({ docs: [] }), 0); return () => {}; } }),
    doc: (p) => ({
      onSnapshot: (cb) => { setTimeout(() => cb(docs[p] ? { exists: true, data: () => docs[p] } : { exists: false, data: () => null }), 0); return () => {}; },
      update: async () => {}, set: async () => {},
    }),
  };
  window.claude = { use: async (n) => (n === "db" ? db : n === "sample" ? { json: async () => ({}) } : n === "downloads" ? { save: async () => {} } : null) };
};

(async () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const file = path.join(ROOT, ".check-cv-page.html");
  fs.writeFileSync(file, `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1100 }, colorScheme: "dark" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(fake, cv);
    await page.goto("file://" + file);
    await page.waitForTimeout(900);
    await page.click("#me-btn");
    await page.click('.menuitem[data-tab="cv"]');
    await page.waitForFunction(() => { const p = document.getElementById("m-paper"); return p && p.dataset.fit; }, null, { timeout: 8000 });
    await page.waitForTimeout(300);
    const out = await page.evaluate((c) => {
      const p = document.getElementById("m-paper");
      const fit = JSON.parse(p.dataset.fit);
      const linesOf = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); const tops = []; for (const r of rg.getClientRects()) if (r.width > 0.5 && !tops.some((t) => Math.abs(t - r.top) < 3)) tops.push(r.top); return tops.length; };
      const core = [...p.querySelectorAll("li[data-id], .sum[data-id]")].map((el) => ({ id: el.dataset.id, chars: el.textContent.trim().length, lines: linesOf(el), spills: el.classList.contains("orphan") }));
      const optional = [];
      (c.sections || []).forEach((s) => (s.entries || []).forEach((e) => (e.bullets || []).forEach((b) => { if (b.optional || e.optional) optional.push({ id: b.id, entry: e.id, chars: String(b.text).replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").length, text: b.text }); })));
      return { chip: document.getElementById("m-fit").textContent, fit, core, optional };
    }, cv);
    await page.locator("#m-pwrap").screenshot({ path: shot });
    const checks = reviewCv(cv);
    const fits = !out.fit.over && !out.fit.spills.length && out.fit.linesLeft < 1;
    const ok = fits && !checks.problems.length;
    const result = ok ? "GOOD: one full page, no spills, newest first, consistent" : "NEEDS WORK" + (fits ? " (page fits; fix the problems below)" : "");
    console.log(JSON.stringify({ result, chip: out.chip, problems: checks.problems, lookAt: checks.lookAt, ...out, picture: shot, pageErrors: errors }, null, 2));
    if (!ok) console.log(`
How to fix (only with true facts):
- A spill: shorten that line to 110 characters or less, or add a true detail so it reaches 165 or more.
- Lines left: move the most relevant optional line(s) into the core (remove "optional": true).
- Onto page 2: make the least relevant core line(s) optional, or trim long ones.
- problems: fix every one (order, dates, punctuation, ids). They make the check fail.
- lookAt: not failures. Fix the easy ones; turn the rest (gaps, years only, missing phone) into questions for the person.`);
    else if (checks.lookAt.length) console.log("\nWorth a look (not failures): see lookAt above. Turn gaps and missing details into questions for the person.");
    process.exitCode = ok ? 0 : 1;
  } finally { await browser.close(); fs.rmSync(file, { force: true }); }
})().catch((e) => { console.error("Check failed to run:", e.message); process.exit(2); });
