# Setting up jobmaxxer: instructions for Claude

You are setting up a fresh copy of the jobmaxxer job tracker on this person's own Claude account. Do these steps in order. The person may not be technical: talk in plain words, short steps, no em dashes, and do everything you can yourself rather than telling them how.

Use a task list so they can see progress.

**The setup happens here, in this chat.** You ask the questions, they answer, you save everything. The tracker page is where results end up and where they can make small tweaks later, but never send them there to fill things in or check your work: show results in the chat instead (plain text, plus the CV picture from `setup/check-cv.sh`).

Start with a short hello (two lines on what's about to happen, about 15 to 30 minutes of questions) and the first questions straight away: what kind of jobs are they going for, which country, and can they send whatever they have (an old CV, their LinkedIn as a PDF, or nothing). Publish the tracker (step 1) while they answer.

Keep it cheap: they pay for every token. `index.html` is about 270KB, with one 64,000-character logo line. Don't read it into the chat or open it to look around; publish it by its path. If the Artifact tool insists on reading a file before its first publish, that is the only time. Leave the embedded logos as they are (separate image files don't load in the Claude mobile app).

## 1. Publish the tracker

1. Get the files: clone this repo (attach it to the session if needed), or use the files the person attached.
2. Load the `artifact-capabilities` skill, then publish `index.html` with the Artifact tool:
   - title "jobmaxxer", icon "briefcase"
   - capabilities: `db` (the database), `sample` (lets the page ask Claude to tailor CVs and read job posts) and `downloads` (CV .docx and .pdf). Also `user` if the skill lists it (the page uses it to check write access).
   - supporting files in `files`: `logo.webp`, `car.webp`, `fonts/LiberationSans-Regular.ttf`, `fonts/LiberationSans-Bold.ttf`, `fonts/LiberationSans-Italic.ttf`, `fonts/LICENSE-OFL.txt` (same published paths)
   - If the Artifact tool asks you to load the `artifact-design` skill first, do, but publish `index.html` as it is. Don't restyle or rewrite it.
3. Save the artifact URL. Every later step and both scheduled tasks need it.
4. Tell the person the tracker is up and that it starts empty.

If a later version of this repo is published to the same URL, the database is kept. Never delete the artifact: the database goes with it.

## 2. Build the master CV

**Read `setup/MASTER-CV-GUIDE.md` now and follow it.** Assume the person has never written a good CV: don't just copy what they send. Collect whatever they have (old CV, LinkedIn, a brain dump, or nothing), interview them a few questions at a time, save every answer to the fact bank (`profile/facts`), and write a true, US-standard, one-page master CV that fills the page with no lines spilling a word. This is the most important step: every tailored CV is built only from it. Take the time it needs.

Save the master CV with the ArtifactData tool:

- doc `profile/cv`, action `set`, data `{"cv": <master CV>, "rules": "", "updated": "<ISO date>"}`
- `rules` empty means the page uses its built-in starter tailoring rules. The person can edit them later on the Master CV page.

Shape (see `setup/example-master-cv.json` for a full example):

```
{
  "name": "FULL NAME",                       // capitals, as it should print
  "contact": "City, ST  |  [email](mailto:email)  |  [linkedin.com/in/x](https://linkedin.com/in/x)",
  "summary": { "lead": "short bold opening line", "body": "2 to 3 sentence summary" },
  "sections": [
    { "id": "experience", "title": "EXPERIENCE", "entries": [
      { "id": "acme", "org": "Company", "orgDesc": "short description", "place": "City, ST",
        "role": "Job title", "dates": "Jan 2025 – Present",
        "bullets": [ { "id": "acme1", "text": "What they did, with real numbers" } ] } ] },
    { "id": "projects", "title": "PROJECTS", "entries": [ ... ] },
    { "id": "education", "title": "EDUCATION", "entries": [
      { "id": "uni", "org": "University", "orgDesc": "Degree", "place": "2021 – 2025", "bullets": [ ... ] } ] },
    { "id": "skills", "title": "SKILLS", "entries": [ { "id": "sk", "bullets": [ { "id": "sk1", "text": "Languages: ..." } ] } ] }
  ]
}
```

Rules for building it (the guide has the full detail):
- Only true facts from the person. Never invent, round up, or upgrade anything. Tailoring can only ever use what is in here.
- Every entry and every bullet needs a short id that is unique across the whole CV.
- Links are written `[label](url)`.
- Leave out sections they don't have (for example no projects). Keep the section ids `experience`, `projects`, `education`, `skills` when they exist.
- Core lines fill exactly one page. Every other true, useful line goes in as `"optional": true`. Tailoring adds those when they help a job.
- Bullets are up to 110 characters (one line) or 165 to 225 (two lines), never in between.

Also save these starter preferences, so every tailored CV and answer follows them (the person can remove or add more on the "Your preferences" page). ArtifactData doc `profile/prefs`, action `set`:

```
{"items": [
  {"id": "p1", "text": "Never invent details, numbers or tasks that are not in the master CV, even small ones that sound plausible.", "added": "<YYYY-MM-DD>"},
  {"id": "p2", "text": "Plain, confident wording. Nothing over the top or salesy, no cliches like hard-working, passionate or results-driven.", "added": "<YYYY-MM-DD>"},
  {"id": "p3", "text": "The page should be full: no empty space at the bottom. Add a relevant true line back rather than leave a gap.", "added": "<YYYY-MM-DD>"},
  {"id": "p4", "text": "No line should spill one or two words onto a new line.", "added": "<YYYY-MM-DD>"}
 ], "updated": "<ISO date>"}
```

Also ask (optional) how they like to write, and save `profile/voice` = `{"voice": "...", "samples": [], "stories": ""}`. Put two or three of their best stories from the interview in `stories` (short, true, in their words): application answers use them. Skip the voice line if they'd rather not; the page has a sensible default.

Show them the finished master CV in the chat (the picture from `setup/check-cv.sh` and the text) and get a clear yes before moving on. Mention once that it's also on the tracker under Master CV, where they can tweak lines later, but that they can always just ask in a chat.

## 3. Search settings

Work out what they actually want. Their jobs can be nothing like the starter list: a nurse, an engineer, a designer, a senior manager all work. Ask, in plain words:
- What kinds of jobs do you want? (use their CV to suggest a few, let them correct you)
- What level: entry level, mid level, senior, or any?
- Full-time, part-time, contract, internship: which are OK?
- Which cities? (any number) And on-site, hybrid, remote: which are OK?
- A few lines about their background and what they're looking for.
- Any companies to skip? How many years of experience is too many (or no limit)?

Then turn their answer into their own role types: 3 to 10 groups, each with a short name and a few example job titles. Example for a nurse: `{"id":"icu","name":"ICU and critical care nursing","ex":"ICU nurse, critical care RN"}`. Only keep starter types (listed as `ROLE_TYPES` in `index.html`) if they really fit. Ids are short lowercase slugs, unique.

Save with ArtifactData, doc `profile/search`, action `set`:

```
{"cities": ["Austin"], "arrangements": ["On-site", "Hybrid"],
 "jobTypes": ["Full-time"],                      // any of Full-time, Part-time, Contract, Internship
 "level": "entry",                               // entry, mid, senior or any
 "roleTypes": [{"id": "icu", "name": "ICU and critical care nursing", "ex": "ICU nurse, critical care RN"}],
 "roles": ["icu"],                               // the role type ids that are switched on
 "maxYears": 3,                                  // skip roles asking for this many years or more; 99 = no limit
 "dailyTarget": 30, "maxNew": 40, "skipCompanies": [],
 "about": "their few lines", "refresh": "new roles daily 6:55am", "updated": "<ISO date>"}
```

Read the settings back to them in the chat in plain words ("You'll get entry-level sales and customer success jobs in Austin, full-time, on-site or hybrid, up to 40 a day") and get a yes. Mention once that they can change these later on the Search settings page, or just ask in a chat.

## 4. Scheduled tasks

Create these with the scheduling tool, in the person's time zone (ask if you don't know it). Replace ARTIFACT_URL with the real URL. Tell them in one line each what you set up.

### a. Morning job search (daily, about 6:55am)

Name: "jobmaxxer job sourcing". If the time changes, update `refresh` in profile/search to match (for example "new roles daily 7:30am").

Prompt:

```
You run the morning job search for the jobmaxxer tracker at ARTIFACT_URL. Use the ArtifactData tool on that URL.

1. Read profile/search (cities, arrangements, jobTypes, level, roleTypes, roles, maxYears, maxNew, skipCompanies, about) and profile/cv (the master CV). Read the jobs collection so you never add a job that is already there (same posting URL, or same company and role).
2. Search the web for roles posted in the last 7 days in each city that match: one of the switched-on role types (the roleTypes whose id is in roles; use their names and example titles as search terms), the level (entry = entry level or associate, mid, senior, any), one of the jobTypes, and one of the arrangements. Good places: company careers pages on Greenhouse, Lever, Ashby and Workable, Built In, Wellfound, and LinkedIn job pages. Open each posting to read it. Skip: staffing agencies, roles far off their level, job types or work setups they didn't pick, roles asking for maxYears or more years (unless maxYears is 99), companies in skipCompanies.
3. Add at most maxNew new jobs. For each, ArtifactData set jobs/<id> where id is a short unique slug (company-role-yyyymmdd), with:
   company, role (exact title), url, source (site name), status "new", found (today, YYYY-MM-DD),
   city (which of their cities it is in), arrangement (e.g. "Hybrid, Austin"), salary (as shown, or ""),
   auth (any citizenship, visa, sponsorship or clearance wording, briefly, or "None stated"),
   jd (condensed posting, max 300 words, plain text with lines DOES:, REQUIRES:, NICE:, KEYWORDS:, PAY:, ARRANGEMENT:),
   track and cv (the name of the closest switched-on role type, spelled exactly as in roleTypes), fit ("A" strong, "B" decent, "C" stretch, judged against "about" and the master CV),
   why (one plain sentence on why it fits, no em dashes), flags (short warnings separated by "; ", or ""), pending false.
   If a job's city is not one of theirs, add "Relocation needed" to flags.
4. Best fits first. Never change or delete existing jobs.
5. Finish with one short line: how many jobs were added and how many were A.
```

### b. Fill pasted job links (every 2 hours, 8am to 10pm)

Name: "Fill pasted job links". A smaller model is fine for this one (Sonnet).

Prompt:

```
You fill in job links that were pasted into the jobmaxxer tracker at ARTIFACT_URL. Use the ArtifactData tool on that URL.

Read the jobs collection. For each job with pending true and a url, and no pendingTried true:
- Open the url and read the posting.
- If you can read it, ArtifactData update jobs/<id> with company, role, city, arrangement, salary, auth, jd, track, cv, fit, why, flags (same meanings as the morning search uses; judge fit against profile/search "about" and profile/cv), plus pending false, pendingNote "".
- If you can't read it (login wall, expired, blocked), update the job with pendingTried true and pendingNote "Couldn't open the link: paste the description". The page then asks the person to paste it.
Change nothing else. If no jobs are pending, stop without a message.
```

### c. Nightly backup (optional)

Only if the person has their own private GitHub repo for it and wants one. It copies every doc (jobs/*, profile/*) as JSON files to a `backups` branch of that repo, one commit per night. Never put real data on the `main` branch of this setup repo.

## 5. Finish

Tell the person, briefly:
- the tracker is ready (the link is on the artifact card)
- the first jobs arrive after tomorrow's morning search, and they can add links or descriptions any time in My links
- whenever they remember something new for their CV (an old job, a win, a number), they can open any Claude chat and say "Add this to my jobmaxxer master CV: ..." (with this repo attached, or the tracker link). Claude follows `setup/MASTER-CV-GUIDE.md`, "Adding more later"
- to check their master CV, and that "Your preferences" (profile menu) is where rules like "never call me X" end up; the page also saves them when they say so in the CV chat

## Later changes

Whenever the person asks to change the tracker after setup (in this chat or a new one), follow `CLAUDE.md` in this repo: the "Keep it cheap" rules, the map of where things live in `index.html`, and the sync check (`bash tests/sync-check.sh index.html <saved live file>`) instead of reading the page. grep for the spot, Read only those lines, make small edits, run `bash tests/run.sh` once at the end, then republish to the same artifact URL.
