// Checks setup/cv-rules.js (master CV order and consistency rules). Made-up data only.
const { reviewCv, parseRange } = require("../setup/cv-rules");
const example = require("../setup/example-master-cv.json");

const TODAY = new Date(2026, 9, 8);
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra, null, 1) : ""); } };
const has = (list, re) => list.some((x) => re.test(x));

const base = () => ({
  name: "SAM TESTER",
  contact: "Austin, TX  |  (512) 555-0100  |  [sam@example.com](mailto:sam@example.com)",
  summary: { lead: "Operations generalist", body: "Ran dispatch and customer support at two small companies." },
  sections: [
    { id: "experience", title: "EXPERIENCE", entries: [
      { id: "now2", org: "Newer Co", place: "Austin, TX", role: "Lead", dates: "Mar 2026 – Present", bullets: [{ id: "n21", text: "Run weekly planning for 5 people" }] },
      { id: "now1", org: "Side Co", place: "Remote", role: "Helper", dates: "Jan 2025 – Present", bullets: [{ id: "n11", text: "Answer 30 support emails a week" }] },
      { id: "old1", org: "Old Co", place: "Dublin, Ireland", role: "Assistant", dates: "Jun 2023 – Dec 2024", bullets: [{ id: "o11", text: "Served 100+ customers a day" }] },
    ] },
    { id: "education", title: "EDUCATION", entries: [
      { id: "uni", org: "Test University", orgDesc: "BA", place: "Sep 2020 – May 2023", bullets: [{ id: "u1", text: "Dean's list, 2 years" }] },
      { id: "school", org: "Test School", place: "2014 – 2020", bullets: [{ id: "s1", text: "Head of the debate club" }] },
    ] },
    { id: "skills", title: "SKILLS", entries: [{ id: "sk", bullets: [{ id: "sk1", text: "Tools: Excel, Notion" }] }] },
  ],
});

// 1. a clean CV has no problems
let r = reviewCv(base(), TODAY);
ok("clean CV: no problems", r.problems.length === 0, r.problems);

// 2. older job above a current one is caught, with the right order suggested
let cv = base(); const ex = cv.sections[0].entries; [ex[0], ex[2]] = [ex[2], ex[0]];
r = reviewCv(cv, TODAY);
ok("out of order: flagged", has(r.problems, /EXPERIENCE is not newest first/), r.problems);
ok("out of order: suggests Newer, Side, Old", has(r.problems, /Order it: Newer Co \(Mar 2026 – Present\), Side Co \(Jan 2025 – Present\), Old Co/), r.problems);

// 3. two current jobs: the one started later goes first
cv = base(); [cv.sections[0].entries[0], cv.sections[0].entries[1]] = [cv.sections[0].entries[1], cv.sections[0].entries[0]];
r = reviewCv(cv, TODAY);
ok("two Present jobs: later start goes on top", has(r.problems, /not newest first.*Order it: Newer Co/), r.problems);

// 4. education order (dates kept in place) is checked too
cv = base(); cv.sections[1].entries.reverse();
r = reviewCv(cv, TODAY);
ok("education newest first", has(r.problems, /EDUCATION is not newest first/), r.problems);

// 5. optional entries count for order (tailoring keeps the master order)
cv = base(); cv.sections[0].entries.push({ id: "opt", optional: true, org: "Hidden Co", place: "Austin, TX", role: "X", dates: "Feb 2026 – Mar 2026", bullets: [{ id: "h1", text: "Did a thing" }] });
r = reviewCv(cv, TODAY);
ok("optional entry out of order is flagged", has(r.problems, /EXPERIENCE is not newest first/), r.problems);

// 6. date formats
cv = base(); cv.sections[0].entries[2].dates = "June 2023 - Dec 2024"; cv.sections[0].entries[1].dates = "Jan 2025 – current";
r = reviewCv(cv, TODAY);
ok("full month name flagged", has(r.problems, /write "Jun 2023"/), r.problems);
ok("hyphen flagged", has(r.problems, /en dash/), r.problems);
ok("'current' flagged", has(r.problems, /write "Present"/), r.problems);
cv = base(); cv.sections[0].entries[2].dates = "Dec 2024 – Jun 2023";
ok("start after end", has(reviewCv(cv, TODAY).problems, /starts after it ends/));
cv = base(); cv.sections[0].entries[2].dates = "2023 – 2024";
r = reviewCv(cv, TODAY);
ok("years only is a lookAt, not a problem", has(r.lookAt, /years only/) && !r.problems.length, r);
cv = base(); delete cv.sections[0].entries[1].dates;
ok("missing dates flagged", has(reviewCv(cv, TODAY).problems, /has no dates/));

// 7. bullets
cv = base(); cv.sections[0].entries[2].bullets.push({ id: "o12", text: "I trained new staff." });
r = reviewCv(cv, TODAY);
ok("period at end flagged", has(r.problems, /o12 ends with a period/), r.problems);
ok("'I' opener flagged", has(r.problems, /o12 starts with "I"/), r.problems);
cv = base(); cv.sections[0].entries[0].bullets[0].text = "Responsible for weekly planning";
ok("weak opener is a lookAt", has(reviewCv(cv, TODAY).lookAt, /starts "Responsible for"/));
cv = base(); cv.sections[0].entries[0].bullets[0].text = "Planned the weekly rota for 5 people";
ok("past tense in current job is a lookAt", has(reviewCv(cv, TODAY).lookAt, /is current, but bullet n21 starts "Planned"/));
cv = base(); cv.sections[0].entries[2].bullets[0].text = "Serves 100+ customers a day";
ok("present tense in past job is a lookAt", has(reviewCv(cv, TODAY).lookAt, /has ended, but bullet o11 starts "Serves"/));

// 8. sections, ids, gaps, summary, header
cv = base(); cv.sections.unshift(cv.sections.pop());
ok("skills above experience flagged", has(reviewCv(cv, TODAY).problems, /SKILLS should come after/));
cv = base(); cv.sections[0].entries[1].bullets[0].id = "n21";
ok("duplicate ids flagged", has(reviewCv(cv, TODAY).problems, /Ids used twice: n21/));
cv = base(); cv.sections[0].entries[2].dates = "Jun 2023 – Jan 2024";
ok("gap over 6 months is a lookAt", has(reviewCv(cv, TODAY).lookAt, /Gap of about 11 months between "Old Co"/), reviewCv(cv, TODAY).lookAt);
cv = base(); cv.summary.body = "Hard-working and passionate operator.";
ok("clichés flagged", has(reviewCv(cv, TODAY).problems, /clichés: hard-working, passionate/));
cv = base(); cv.contact = "Austin, TX | (512) 555-0100 | sam@example.com | Age 24";
ok("age in contact flagged", has(reviewCv(cv, TODAY).problems, /personal details/));
cv = base(); cv.sections[0].entries[2].place = "Dublin";
ok("place without country is a lookAt", has(reviewCv(cv, TODAY).lookAt, /place "Dublin"/));

// 9. parser and the shipped example
ok("parse 'Expected May 2026'", parseRange("Expected May 2026").has);
ok("parse 'Sep 2026'", parseRange("Sep 2026").start.m === 2026 * 12 + 8);
ok("example master CV has no problems", reviewCv(example, TODAY).problems.length === 0, reviewCv(example, TODAY).problems);

console.log(`\nCV rules: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
