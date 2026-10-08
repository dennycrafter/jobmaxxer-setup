# Building a strong master CV: instructions for Claude

Use this in setup (SETUP.md step 2) and any time the person wants to add to or fix their master CV.

**Assume the person has never written a good CV.** Most people haven't. Their current CV may be old, thin, badly worded, or missing. Your job is to coach them into a strong, true, US-standard one-page CV. Don't just copy what they send. Don't expect them to remember everything at once: ask, remind, and keep what they tell you.

Every tailored CV the tracker makes is built only from this master. A weak master means weak CVs for every job. This step matters more than any other.

Talk plainly. A few questions at a time (3 to 5), never a wall of questions. Give an example answer when a question is vague. Be encouraging: people undersell themselves.

## The one hard rule: only true facts

- Everything on the CV must come from the person. Never invent, improve, round up, or guess.
- No made-up numbers. If they say "about 50", write about 50 (or "50+" if they say "at least 50"). If they don't know, leave the number out.
- No upgraded scope: "helped with" never becomes "led", "part of a team" never becomes "managed", unpaid never becomes paid.
- No filler details that sound good but nobody said ("juggling tight deadlines", "fast-paced environment").
- If you're unsure whether something is true, ask. If they hesitate, leave it out.
- Test: could they explain every line in an interview without feeling awkward? If not, cut it.

## 1. Collect what they have

Ask for anything, in any shape. All of it is useful:
- their current CV (any age, any state), or their LinkedIn profile (they can save it as a PDF or paste it)
- old cover letters, portfolio links, a personal site, GitHub
- or just "tell me what you've done since school": a brain dump is fine. Voice-to-text is fine.

If they have nothing, that's fine too. Start from step 3.

Also ask early:
- What kinds of jobs are you going for? (This decides what matters most. SETUP.md step 3 asks again in more detail; reuse the answer.)
- Which country will you apply in? This guide is for US-style CVs (called resumes in the US). If it's not the US, say so and adjust: see "Outside the US" at the end.

## 2. Start the fact bank

Everything they tell you goes into the fact bank, saved with the tracker, so nothing is lost if the chat ends and anything they remember later can be added. Save after every round of answers, not just at the end.

ArtifactData on the tracker URL, doc `profile/facts`, action `set` (read it first if it exists and keep what's there):

```
{"items": [
  {"id": "f1", "about": "acme", "text": "Ran dispatch for about 40 drivers on 3 routes, every weekday", "added": "2026-10-08"},
  {"id": "f2", "about": "general", "text": "Captain of the uni rowing team, final year", "added": "2026-10-08"}
 ],
 "updated": "<ISO date>"}
```

- `about`: the id of the CV entry it belongs to, or "general".
- `text`: in their words, tidied up, facts only. Keep each item short and specific.
- Numbers exactly as they said them, including "about".

The master CV is built from the bank. The bank can hold more than fits on a page; that's the point.

## 3. Interview them

Go in this order. Save to the bank after each round.

**a. The timeline.** List every job, internship, school, and project with dates, even short, part-time, unpaid, family business, or "not relevant" ones. Retail, restaurants, delivery, babysitting, tutoring all count: they show reliability and real skills. Ask: "Anything between [date] and [date]?" to catch gaps.

**b. Each entry, one at a time** (most recent and most relevant first):
- What did the company or team do? (one line, for people who don't know it)
- What was your job title, exactly? Dates (month and year)? City?
- What did a normal week look like? What were you trusted with?
- What got better because you were there? Anything you started, fixed, or sped up?
- Numbers: how many (customers, orders, people, tickets, calls, products), how much (money, budget, sales), how often (per day or week), how big (team, area, audience), any before and after?
- Tools, software, equipment, languages you used.
- Any promotion, award, ranking, top performer, extra responsibility, or being asked to train others?
- What would your manager say you were best at? (Then ask for the proof behind it.)

**b2. Go deeper with questions for that kind of role.** The general questions above miss most of what makes a CV strong. For each entry, also ask the questions for its kind of role below (an entry can match more than one). Ask them as open questions, a few at a time.

- **Retail, shop floor, customer service:** How many customers a day? Did you hit or beat sales, card sign-up or add-on targets (by how much, how often, ranked against others)? Did you handle the till, cash counts, opening or closing? Returns, complaints, refunds? Stock, deliveries, visual displays? Did you train anyone or cover for a supervisor? Any mystery shopper scores or "employee of the month"?
- **Restaurants, bars, hospitality, events:** How busy (covers, orders, guests a day)? Which stations or roles? Did you lead shifts, open or close, handle cash? Train new staff? Food safety or alcohol certificates? Biggest event or busiest day you handled? Anything you changed that made service faster?
- **Delivery, driving, warehouse, logistics:** How many deliveries, stops or orders a day or in total? Ratings, accuracy, on-time rate? Routes or areas planned yourself? Vehicles or equipment (forklift, van, scanner)? Licenses? Any safety record, damage-free streak, or peak-season records?
- **Sales, business development, partnerships:** What did you sell, to whom, at what price? Quota and how you did against it (percent, rank)? How many calls, emails or meetings a week? Deals closed and their size? Pipeline you built? Tools (Salesforce, HubSpot, LinkedIn)? Any new market, account or channel you opened?
- **Customer success, support, account management:** How many customers or tickets? Response or resolution times? Satisfaction scores (CSAT, NPS, reviews)? Renewals, upsells, churn saved? Escalations handled? Help docs, macros or processes you wrote?
- **Operations, admin, office, coordination:** What did you keep running day to day? Schedules, rotas, bookings, inventory, invoices, data entry? How much (people, orders, budget)? Anything you organized, sped up, cleaned up or automated? Tools (Excel, Sheets, Notion, ERP)?
- **Marketing, social media, content, communications:** Which channels? Audience or follower size and growth? Views, engagement, sign-ups, sales from it? Campaigns you ran end to end? Budget? Tools (Canva, Meta Ads, Google Analytics, Mailchimp)? Anything that went viral or won something?
- **Software, data, engineering, technical:** What did you build or fix, for whom, and how many people use it? Languages, frameworks, tools? Scale (users, data size, requests, speed)? Measurable results (faster, cheaper, fewer errors)? Links to code, apps or demos? Hackathons?
- **Design, video, photo, music, creative:** What did you make, for whom? Paid or unpaid (be exact)? Audience, views, sales, downloads? Tools? A portfolio link? Any publications, exhibitions, releases or awards?
- **Finance, accounting, analysis:** What did you track, model or report? Size of budgets or numbers handled? Tools (Excel level, QuickBooks, SQL)? Errors caught, money saved, time saved? Certifications or exams?
- **Healthcare, care work, childcare, coaching, teaching, tutoring:** How many patients, kids, students or clients? Ages or needs? Results (grades, progress, retention)? Certifications (CPR, first aid, background checks)? Plans, lessons or programs you created?
- **Trades, construction, manufacturing, maintenance:** Which jobs, tools and machines? Size of projects? Safety record and certifications? Quality or speed improvements? Licenses?
- **Founder, freelance, side business, selling online:** What was it, when, and is it still running? Customers or users, revenue (only if real and they're happy to share), growth? What did you do yourself (build, sell, market, ship)? Partners or investors? Be exact about paid, unpaid, pre-revenue, part-time.
- **Clubs, societies, sports, volunteering, student roles:** Role and title? Members or people involved? Events run, money raised, sponsors won? Competitions, rankings, captaincies? Anything you started?
- **Internships and short jobs:** What was the project? Who used your work? What did you hand over at the end? Any offer to return or a reference?

Then for every entry: "Anything else from that job you're proud of, or that a manager thanked you for?"

For any kind of role not listed: think about what a hiring manager for the person's *target* job would want proof of, and ask for that.

**How to ask without putting words in their mouth.** These are questions, not suggestions. Never offer a guessed answer ("so you probably handled about 50 customers?"). If they say yes to something, ask for the specifics before writing it: how many, how often, when, what happened as a result. If they can't give specifics, write it plainly without numbers, or leave it out. A true plain line beats an impressive invented one, every time.

**c. Memory joggers.** People forget the good stuff. Ask about:
- clubs, societies, teams, captaincies, organizing events
- volunteering, fundraising, mentoring, tutoring
- side projects, things they built, sold, wrote, made, or ran
- hackathons, competitions, rankings, scholarships, dean's list, awards
- certifications, courses, licenses (driving, food safety, first aid count for some jobs)
- languages and how well (native, fluent, working, basic)
- study abroad, travel that involved real work or responsibility
- anything they're quietly proud of

**d. Fill the gaps for their target jobs.** Look at what those jobs usually ask for. For each thing, ask "Have you ever done anything like X?" Often the answer is yes and they never thought to mention it.

**e. Coverage check before writing.** Go down this list and ask about anything still blank: every job with dates, title, place; numbers for each main job; tools and software; languages; education with dates and any honors; certifications and licenses; projects; volunteering and clubs; awards and rankings; links (LinkedIn, portfolio, GitHub); phone and email they want on the CV; what jobs they're going for.

Stop when they've had enough. Tell them they can add more any time (see "Adding more later").

## 4. Write the master CV

### US one-page standard

- **One page**, US Letter. For anyone with under about 10 years of experience, one page is the standard.
- **No** photo, date of birth, age, gender, marital status, nationality, religion, full street address, or "References available on request".
- **Header:** full name in capitals. Contact line: `City, ST  |  phone  |  email  |  LinkedIn` (plus portfolio or GitHub if relevant). Links written `[label](url)`. Phone as `(512) 555-0123`.
- **Sections, in this order:**
  - Summary (bold lead line + 2 to 3 sentences)
  - Experience (most recent first)
  - Projects (only if they have real ones)
  - Education (move it above Experience if they graduated in the last year and have little work experience)
  - Skills
  - Optional extra sections only if real: Certifications, Volunteering, Leadership, Awards. Keep the section ids `experience`, `projects`, `education`, `skills` for those four.
- **Dates:** the same format everywhere: `Jan 2025 – Present`, `Jun 2023 – Aug 2024`. 3-letter month and year, " – " (en dash, space each side) between them, "Present" for anything still going. Education can be years only or the graduation date (`May 2025`, `Expected May 2026`).
- **Places:** `City, ST` in the US, `City, Country` abroad. "Remote" if it was remote.

### Order: newest first, everywhere

Hiring managers read top down and spend seconds on it, so what they're doing now goes first.
- **Inside every section, newest first** (Experience, Education, Projects, Volunteering, everything with dates). Anything still going ("Present") goes on top. Two "Present" entries: the one that started later goes first. Then by end date, newest to oldest; same end date, later start first.
- **Optional entries too.** They sit in the master in their right place by date, because tailoring keeps the master's order when it brings them in.
- **Sections** in the order above. Skills always comes after Experience, Projects and Education. Extra sections (Certifications, Volunteering, Awards) go after Experience.
- **Inside an entry**, bullets go strongest and most relevant first (not by date).
- When you add something later, put it in its place by date, not at the end.
- The page check (step 5) flags anything out of order and gives the right order.

### Bullets

- Start with a strong verb. Past tense for past jobs, present tense for the current one. Never "I", "my", "Responsible for", "Duties included", "Worked on".
- Shape: **what you did + how much or how many + what came of it**. Example: "Trained 6 new staff on the till and stock system, cutting their ramp-up from 3 weeks to 1". Only include the parts that are true.
- Numbers as digits (6, not six). Use a number whenever they gave one.
- Strongest and most relevant bullet first in each entry.
- 3 to 5 bullets for recent or relevant roles, 1 to 2 for older or less relevant ones.
- No period at the end of bullets. Same style everywhere.
- **Length (matters, the page measures it):** a bullet of up to 110 characters fits one line. Two lines is about 165 to 225 characters. **Never 111 to 164**: that leaves a word or two dangling on a second line, which wastes a line and looks sloppy. Never more than 225.

### Summary

- Lead (bold): max 10 words, who they are in terms of what they're going for. Not a city.
- Body: 2 to 3 sentences, max 60 words, built only from facts already in the CV.
- No clichés: hard-working, passionate, results-driven, dynamic, team player, go-getter, detail-oriented, self-starter.
- Not over the top. Plain and confident beats salesy.

### Skills

- 2 to 4 lines, each `Label: item, item, item`. For example `Tools: Excel, Salesforce, Canva`, `Languages: English (native), Spanish (fluent)`, `Certifications: ...`.
- Only hard skills they could prove in an interview. No soft-skill lists (communication, teamwork, leadership).
- Use the words their target jobs use, when it's true.

### Education

- School, degree and major in `orgDesc`, dates or graduation date in `place`. "Expected May 2026" if not finished.
- GPA only if 3.5 or higher (or the local equivalent is strong). Honors, scholarships, study abroad, relevant clubs as bullets. Relevant coursework only if they have little experience.

### Core and optional lines: fill exactly one page

- **Core lines** (no flag) are what the plain master shows. They must fill one page: no dead space at the bottom and nothing running onto page 2.
- **Optional lines** (`"optional": true`) are true extras that don't fit. Tailoring brings them in when a job calls for them. Put everything else true and useful from the fact bank here. A rich optional bank is what makes tailoring good.
- A whole entry can be optional (`"optional": true` on the entry): an older job, a hobby project.
- `"alt_of": "<bullet id>"` marks another way of saying the same bullet (for example one aimed at sales jobs, one at operations). Tailoring uses one or the other, never both.

### The JSON

Shape as in SETUP.md step 2 and `setup/example-master-cv.json`. Every entry and bullet gets a short id, unique across the whole CV (`acme`, `acme1`, `acme2`).

## 5. Check the page

The tracker measures the real page the same way it measures tailored CVs. Use it, don't guess.

1. **Before saving**, check it yourself from the repo: write the master CV to a JSON file and run `bash setup/check-cv.sh <file.json> [picture.png]`. It loads the real page with a fake empty database (nothing real is touched) and prints:
   - `result`: GOOD only when it's one page, filled to the bottom, with no spills, and no `problems`
   - `problems`: must be fixed: entries not newest first (with the right order), dates in mixed or unreadable formats, start after end, bullets ending in a period or starting with "I", repeated ids, Skills above other sections, clichés in the summary, no email, personal details (age, nationality) in the header
   - `lookAt`: not failures, but worth a look: gaps of over 6 months between jobs and study, dates with years only, places without a state or country, past tense in a current job (or present tense in an old one), weak openers ("Responsible for"), the same verb used 3+ times, no phone. Fix the easy ones. Turn gaps and missing details into questions for the person (step 3a): a gap is often a job or project they forgot.
   - `fit`: lines left at the bottom, lines running onto page 2, and every line that spills a word or two (with how many characters to cut)
   - `core`: each printed line with its length and line count
   - `optional`: the hidden lines with their length, ready to bring in
   - a picture of the page (default `setup/cv-preview.png`), worth showing the person
2. Fix and re-run until it says GOOD. Fix every item in `problems` (reorder entries as it says). Only with true facts:
   - Spill: shorten that line to 110 characters or less, or add a true detail from the fact bank so it reaches 165 or more. Never pad with filler.
   - Lines left: move the most relevant optional line(s) into the core. If the bank runs out, go back to the person with a few more questions (step 3c and 3d): a thin CV usually means you haven't asked enough yet.
   - Onto page 2: make the least relevant core line(s) optional, or trim long ones.
3. After saving, the person sees the same check at the top of the Master CV page ("How it prints"): a chip saying "Page filled", "One page · ~N lines free" or "Runs ~N lines onto page 2", plus "N lines spill a word", with spilling lines marked red. They can show or hide any line with the eye next to it, and download the master as .docx or .pdf.

## 6. Check it with the person

Do this in the chat, not on the page. Send the picture from `setup/check-cv.sh` (with whatever file-sending tool you have) and show the text one section at a time. For each, ask: "Is every word true? Anything you'd feel awkward explaining in an interview? Anything missing?" Fix, save, re-check the page.

Before calling it done, check:
- [ ] Every line traces back to something they said (it's in the fact bank).
- [ ] One page, Page filled, no spills.
- [ ] Every bullet starts with a verb, has no "I", and has a number where they gave one.
- [ ] Every section is newest first ("Present" on top), optional entries included.
- [ ] Dates, places, tense and punctuation are consistent (the check shows no `problems`).
- [ ] Every gap in `lookAt` was asked about.
- [ ] Nothing from the "No" list in the header or anywhere.
- [ ] Summary has no clichés and no city in the opening.
- [ ] The optional bank holds the rest of the true, useful facts.
- [ ] Spelling is US English (unless they apply elsewhere).

Then tell them how to download it (Master CV page, "How it prints" card, .docx or .pdf) and how to add more later.

## Adding more later

When the person remembers something new, in any chat:
1. Read `profile/facts` and `profile/cv` from their tracker (ArtifactData).
2. Add it to the fact bank (ask a follow-up or two first: numbers, dates, what came of it).
3. Write it as a bullet (optional, unless it's stronger than a current core line, then swap). A new job, school or project goes in its place by date (newest first), not at the end. Save `profile/cv` with `update` on the `cv` field only, so their tailoring rules stay as they are.
4. Re-check the page (`bash setup/check-cv.sh`, or the "How it prints" card).

## Outside the US

If they apply in the UK or Ireland: a "CV" is often 2 pages there, but this tracker makes 1-page CVs, which is still fine for early career. Use UK English and day-month dates. For anywhere else, ask what's normal there and adjust; the "No" list (photo, age, etc.) differs by country. Tell them the tailoring rules say "plain US English" and offer to change that line in Tailoring rules (Master CV page, advanced).
