// Order and consistency rules for a master CV. Used by setup/check-cv.js (and tests).
// reviewCv(cv, today?) returns:
//   problems: things to fix before saving (the check says NEEDS WORK)
//   lookAt:   things worth a look or a question to the person (don't fail the check)
// Plain JS, no browser needed.

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SEASONS = { spring: 2, summer: 5, fall: 8, autumn: 8, winter: 11 };
const PRESENT = /^(present|current|currently|now|today|ongoing)$/i;
const CLICHES = ["hard-working", "hardworking", "hard working", "passionate", "results-driven", "results driven", "dynamic", "team player", "go-getter", "detail-oriented", "detail oriented", "self-starter", "self starter", "highly motivated", "proven track record", "synergy", "think outside the box"];
const WEAK_OPENERS = /^(responsible for|duties (included|include)|worked on|helped (with|to)?|tasked with|in charge of|assisted (with|in)?)\b/i;
const SELF = /^(i|my|me)\b/i;

const label = (e) => e.org || e.role || e.id;
const fmt = (m) => (m == null || !isFinite(m) ? "?" : SHORT[((m % 12) + 12) % 12] + " " + Math.floor(m / 12));

// One side of a date range -> {m (months since year 0), present, yearOnly, bad}
function parsePoint(raw, isEnd) {
  let s = String(raw || "").trim().replace(/\.$/, "");
  const out = { raw: s, m: null, present: false, yearOnly: false, expected: false, bad: [] };
  if (!s) return out;
  if (/^expected\s+/i.test(s)) { out.expected = true; s = s.replace(/^expected\s+/i, ""); }
  if (PRESENT.test(s)) { out.present = true; if (s !== "Present") out.bad.push(`write "Present" (not "${s}")`); return out; }
  let mt;
  if ((mt = s.match(/^([A-Za-z]+)\.?\s+(\d{4})$/))) {
    const w = mt[1].toLowerCase(), y = +mt[2];
    if (w.slice(0, 3) in MONTHS && (w.length === 3 || "january february march april may june july august september october november december sept".split(" ").includes(w))) {
      out.m = y * 12 + MONTHS[w.slice(0, 3)];
      const want = SHORT[MONTHS[w.slice(0, 3)]];
      if (mt[1] !== want || /\./.test(s)) out.bad.push(`write "${want} ${y}" (not "${raw}")`);
    } else if (w in SEASONS) { out.m = y * 12 + SEASONS[w]; out.yearOnly = true; }
    else out.m = null;
    return out;
  }
  if ((mt = s.match(/^(\d{1,2})\/(\d{4})$/))) { const mo = +mt[1] - 1, y = +mt[2]; out.m = y * 12 + mo; out.bad.push(`write "${SHORT[mo]} ${y}" (not "${raw}")`); return out; }
  if ((mt = s.match(/^(\d{4})$/))) { out.m = +mt[1] * 12 + (isEnd ? 11 : 0); out.yearOnly = true; return out; }
  return out;
}

// "Jan 2025 – Present", "Jun 2023 – Aug 2024", "Sep 2026", "Expected May 2026", "2022 – 2024"
function parseRange(raw) {
  const s = String(raw || "").trim();
  const r = { raw: s, start: null, end: null, has: false, bad: [] };
  if (!s) return r;
  const parts = s.split(/\s*(?:–|—|-|\bto\b|\buntil\b)\s*/i).filter((x) => x !== "");
  if (parts.length > 2) return r;
  if (parts.length === 2) {
    const dash = s.match(/\s*(–|—|-|\bto\b|\buntil\b)\s*/i);
    if (dash && dash[0] !== " – ") r.bad.push(`use " – " between the dates (an en dash with a space each side), like "Jun 2023 – Aug 2024"`);
  }
  r.start = parsePoint(parts[0], parts.length === 1);
  r.end = parts.length === 2 ? parsePoint(parts[1], true) : parsePoint(parts[0], true);
  if (r.start.present) return r; // "Present – ..." makes no sense
  r.has = r.start.m != null && (r.end.m != null || r.end.present);
  r.bad.push(...r.start.bad, ...(parts.length === 2 ? r.end.bad : []));
  return r;
}

const looksLikeDate = (s) => /\b(19|20)\d{2}\b|present/i.test(String(s || ""));
// Education keeps its dates in `place` (it has no role line). Everything else uses `dates`.
const dateText = (e) => e.dates || (!e.role && looksLikeDate(e.place) ? e.place : "");

function reviewCv(cv, today = new Date()) {
  const problems = [], lookAt = [];
  const now = today.getFullYear() * 12 + today.getMonth();
  const secs = Array.isArray(cv && cv.sections) ? cv.sections : [];
  const key = (r) => [r.end.present ? Infinity : r.end.m, r.start.m];
  const newer = (a, b) => (a[0] !== b[0] ? a[0] > b[0] : a[1] > b[1]);

  // ---- ids
  const seen = new Map();
  secs.forEach((s) => (s.entries || []).forEach((e) => [e, ...(e.bullets || [])].forEach((x) => { if (x && x.id) seen.set(x.id, (seen.get(x.id) || 0) + 1); })));
  const dup = [...seen].filter(([, n]) => n > 1).map(([id]) => id);
  if (dup.length) problems.push(`Ids used twice: ${dup.join(", ")}. Every entry and bullet needs its own id.`);

  // ---- section order
  const ids = secs.map((s) => s.id);
  const pos = (id) => ids.indexOf(id);
  if (pos("skills") >= 0 && ["experience", "education", "projects"].some((id) => pos(id) > pos("skills")))
    problems.push(`SKILLS should come after Experience, Projects and Education (order now: ${secs.map((s) => s.title || s.id).join(", ")}).`);
  if (pos("projects") >= 0 && pos("experience") >= 0 && pos("projects") < pos("experience"))
    lookAt.push("PROJECTS is above EXPERIENCE. The master usually keeps Experience first; tailoring moves Projects up for jobs that value building.");
  const extra = secs.filter((s) => !["experience", "projects", "education", "skills"].includes(s.id));
  extra.forEach((s) => { if (pos("experience") >= 0 && pos(s.id) < pos("experience")) lookAt.push(`${s.title || s.id} is above EXPERIENCE. Extra sections (certifications, volunteering, awards) usually go after it.`); });

  // ---- entries: dates, order, places, bullets
  const dated = []; // for gaps
  const verbs = new Map();
  for (const s of secs) {
    const T = s.title || s.id;
    if (s.id === "skills") continue;
    const rows = [];
    for (const e of s.entries || []) {
      const dt = dateText(e);
      const r = parseRange(dt);
      if (!dt) { if (s.id === "experience" || s.id === "education") problems.push(`${T}: "${label(e)}" has no dates. Add month and year.`); }
      else if (!r.has) problems.push(`${T}: "${label(e)}" dates "${dt}" can't be read. Use "Jan 2025 – Present", "Jun 2023 – Aug 2024" or "May 2026".`);
      else {
        r.bad.forEach((b) => problems.push(`${T}: "${label(e)}" dates: ${b}.`));
        if ((r.start.yearOnly || r.end.yearOnly) && s.id !== "education") lookAt.push(`${T}: "${label(e)}" has years only ("${dt}"). Ask for the months if they remember (like "Jun 2022 – Aug 2024").`);
        if (!r.end.present && r.start.m > r.end.m) problems.push(`${T}: "${label(e)}" starts after it ends ("${dt}").`);
        if (!r.end.present && !r.end.expected && r.end.m > now && s.id !== "education") lookAt.push(`${T}: "${label(e)}" ends in the future ("${dt}"). If it's still going, write "Present".`);
        rows.push({ e, r, k: key(r) });
        if (s.id === "experience" || s.id === "education") dated.push({ e, T, from: r.start.m, to: r.end.present ? now : r.end.m, approx: r.start.yearOnly || r.end.yearOnly });
      }
      // place
      const pl = String(e.place || "").trim();
      if (e.role && pl && !looksLikeDate(pl) && !/,/.test(pl) && !/^remote$/i.test(pl) && !/remote/i.test(pl))
        lookAt.push(`${T}: "${label(e)}" place "${pl}": write it as "City, ST" (US) or "City, Country", or "Remote".`);
      // bullets
      const present = r.has && r.end.present;
      for (const b of e.bullets || []) {
        const t = String(b.text || "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
        if (!t) { problems.push(`${T}: "${label(e)}" has an empty bullet (${b.id}).`); continue; }
        if (/[.]$/.test(t) && !/\b(etc|Inc|Ltd|Co)\.$/.test(t)) problems.push(`${T}: bullet ${b.id} ends with a period. No periods at the end of bullets.`);
        if (SELF.test(t)) problems.push(`${T}: bullet ${b.id} starts with "${t.split(/\s/)[0]}". Start with a verb, never I or my.`);
        else if (WEAK_OPENERS.test(t)) lookAt.push(`${T}: bullet ${b.id} starts "${t.match(WEAK_OPENERS)[0]}". Start with what they did (Ran, Built, Trained, Sold...).`);
        if (s.id === "experience" || s.id === "projects") {
          const w = t.split(/\s+/)[0].replace(/[^A-Za-z-]/g, "");
          if (present && /ed$/i.test(w) && !/^(need|speed|seed|feed|lead)$/i.test(w)) lookAt.push(`${T}: "${label(e)}" is current, but bullet ${b.id} starts "${w}" (past tense). Current jobs use present tense (Run, Build, Train).`);
          if (r.has && !present && /^[A-Z][a-z]+s$/.test(w) && !/ss$/.test(w) && !/^(Sales|Operations|Analytics|Logistics|Systems)$/.test(w)) lookAt.push(`${T}: "${label(e)}" has ended, but bullet ${b.id} starts "${w}" (present tense). Past jobs use past tense.`);
          if (!b.optional && !e.optional && w) verbs.set(w.toLowerCase(), (verbs.get(w.toLowerCase()) || 0) + 1);
        }
      }
      if ((s.id === "experience" || s.id === "projects") && !e.optional && (e.bullets || []).length && (e.bullets || []).every((b) => b.optional))
        lookAt.push(`${T}: "${label(e)}" shows on the page with no bullets (all are optional). Make its best bullet core, or make the whole entry optional.`);
    }
    // newest first (optional entries count too: tailoring keeps the master's order)
    let out = false;
    for (let i = 1; i < rows.length; i++) if (newer(rows[i].k, rows[i - 1].k)) out = true;
    if (out) {
      const want = [...rows].sort((a, b) => (newer(a.k, b.k) ? -1 : newer(b.k, a.k) ? 1 : 0));
      const note = s.id === "projects" ? " (tailoring may still move the most relevant project up for a job)" : "";
      problems.push(`${T} is not newest first. Current ("Present") entries go on top, then by end date, newest to oldest${note}. Order it: ${want.map((x) => `${label(x.e)} (${x.r.raw})`).join(", ")}.`);
    }
  }

  // ---- repeated verbs
  const rep = [...verbs].filter(([, n]) => n >= 3).map(([w, n]) => `"${w}" ${n}x`);
  if (rep.length) lookAt.push(`Same opening verb used a lot: ${rep.join(", ")}. Vary them where it stays true (Ran, Led, Built, Trained, Handled...).`);

  // ---- gaps over 6 months between jobs and study (worth asking about)
  const iv = dated.filter((d) => d.from != null && d.to != null).sort((a, b) => a.from - b.from);
  let reach = null;
  for (const d of iv) {
    if (reach && d.from - reach.to > 6) lookAt.push(`Gap of about ${d.from - reach.to - 1} months between "${label(reach.e)}" (ends ${fmt(reach.to)}) and "${label(d.e)}" (starts ${fmt(d.from)}). Ask what they did then: a short job, travel, study, caring for family or a project all count.`);
    if (!reach || d.to > reach.to) reach = d;
  }

  // ---- summary
  const sum = (cv && cv.summary) || {};
  const sumText = `${sum.lead || ""} ${sum.body || ""}`.toLowerCase();
  const cl = CLICHES.filter((c) => sumText.includes(c));
  if (cl.length) problems.push(`Summary uses clichés: ${cl.join(", ")}. Say what they've actually done instead.`);
  if (sum.lead && sum.lead.trim().split(/\s+/).length > 10) lookAt.push("Summary lead line is over 10 words.");
  if (sum.body && sum.body.trim().split(/\s+/).length > 60) lookAt.push("Summary body is over 60 words.");

  // ---- header
  if (cv && cv.name && cv.name !== cv.name.toUpperCase()) lookAt.push(`Name "${cv.name}" is usually written in capitals on a US CV.`);
  const contact = String((cv && cv.contact) || "");
  if (!/@/.test(contact)) problems.push("Contact line has no email.");
  if (!/\d{3}[^\d]{0,3}\d{3}[^\d]{0,2}\d{4}/.test(contact)) lookAt.push("Contact line has no phone number. Ask if they want one on it.");
  if (/\b(born|d\.?o\.?b|date of birth|age|nationality|marital)\b/i.test(contact)) problems.push("Contact line has personal details (age, birth date, nationality, marital status). US CVs leave these out.");

  return { problems, lookAt };
}

module.exports = { reviewCv, parseRange };
