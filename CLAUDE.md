# jobmaxxer: working notes for Claude

This repo is the clean starter copy of jobmaxxer, a job tracker that runs as a Claude artifact. Each person publishes their own copy from their own Claude account, with their own empty database.

- First-time setup: follow `SETUP.md`.
- Anything about the person's master CV (building it, adding to it, fixing it): follow `setup/MASTER-CV-GUIDE.md`. Assume they don't know how to write a good CV; coach them. Check any master CV with `bash setup/check-cv.sh <file.json>` before saving it.
- The person may not be technical. Plain words, short steps, no em dashes.

## Keep it cheap (the person pays for every token)
- `index.html` is about 270KB. Never Read it whole and never read the live page into the chat.
- Find the spot with `grep -n "<word>" index.html | cut -c1-200`, then Read only those lines with offset/limit. Always pipe grep through `cut`: line ~523 holds the logos as one 64,000-character line.
- Leave the logo line alone. The logos are embedded on purpose: separate image or script files do not load in the Claude mobile app. Keep everything in this one file.
- `tests/check.js` is about 63KB: grep it too, don't Read it whole.
- Only open the screenshots for the part you changed, not all of them.
- Small fix: no branch, no screenshots, run the check once at the end. Not after every edit.

## Map: where things live in index.html
- Lines ~1 to 519: styles. Each section starts with a `/* ... */` comment: top bar, scoreboard, streak, bell, paste mode, goal celebration, dropdowns, job list, notes, Tailor drawer, CV zoom, CV page, preferences, add link window, settings, master CV editor (with the "How it prints" preview).
- Lines ~520 to 760: layout (top bar, list, drawer, windows, settings). Line ~523 is the logo line.
- Lines ~761 to the end: script. Sections start with `// ---------- name ----------`: CV .docx builder, CV .pdf builder, search settings, top bar and profile menu, master CV and voice editor, custom dropdowns, game layer, attention bell and paste mode, list, tailoring core, drawer, links you add yourself, page fit, master CV preview, preferences, events, boot.
- Jump to a section: `grep -n -- '---------- ' index.html | cut -c1-120` or `grep -n '^/\*' index.html | cut -c1-120`. Line numbers shift, so always grep first.

## Where the data lives
In the artifact's own database (ArtifactData on the artifact URL):
- `jobs/<id>`: one doc per job.
- `profile/cv`: `{cv, rules}`, the master CV and tailoring rules (empty rules = built-in starter rules).
- `profile/voice`: writing voice, samples, stories for application answers.
- `profile/prefs`: `{items:[{id,text,added}]}`, standing preferences, added from the page.
- `profile/facts`: `{items:[{id,about,text,added}]}`, the fact bank: everything the person has said about their experience, in their words. The master CV is built from it. The page doesn't read it.
- `profile/search`: cities, work setups (`arrangements`), `jobTypes`, `level`, the person's own `roleTypes` ([{id,name,ex}]) and which are on (`roles`), limits, skip list, `about`. The morning search task reads it every run. With no `roleTypes` saved the page uses the starter list `ROLE_TYPES`.

The page reads the person's name from the master CV. Nothing about any one person is hardcoded; keep it that way (a check fails if names creep in).

## The live page
- The person's own artifact, published during setup (`SETUP.md` step 1). Its URL is on the artifact card in the setup chat, or find it with the Artifact tool's list action (title "jobmaxxer").
- Capabilities db, sample, downloads. Omit `capabilities` and `contract` on republish to keep them. Publishing to the same URL keeps the database.
- Published files: index.html, logo.webp, car.webp, fonts/*. This repo mirrors them.

## Every change, in this order
1. Sync check: `Artifact` read the person's artifact URL. Do NOT Read the file it saves. Run `bash tests/sync-check.sh index.html <saved path>`. On SAME, carry on. On DIFFERENT, the live page changed outside this repo: copy it over with the skeleton stripped (the script shows how) and work from that version.
2. For anything bigger than a small fix, show the person screenshots of the changed part (made-up data) before publishing. They decide look and feel by seeing it.
3. Edit `index.html` with small Edits.
4. `bash tests/run.sh` must print all PASS (about 75 seconds). Add a check to `tests/check.js` when adding a feature. The page's dropdowns are custom (the real selects are hidden): pick options in tests with the `pick(page, selectId, value)` helper.
5. Publish `index.html` to the same artifact URL (pass changed supporting files in `files`).

## Never
- Delete the artifact: the database goes with it.
- Put real data (CVs, jobs, emails, phone numbers) in this repo. Tests use `tests/sample-data.json` only.
- Write to the real database while testing. The check uses a fake in-memory `window.claude`.
- Let tailoring add facts that are not in the master CV.
