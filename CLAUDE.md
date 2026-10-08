# jobmaxxer: working notes for Claude

This repo is the clean starter copy of jobmaxxer, a job tracker that runs as a Claude artifact. Each person publishes their own copy from their own Claude account, with their own empty database.

- First-time setup: follow `SETUP.md`.
- The person may not be technical. Plain words, short steps, no em dashes.

## What's in here
- `index.html`: the whole page (styles, layout, script). Published as the artifact.
- `logo.webp`, `car.webp`: the logo images (the page embeds them; publish them anyway).
- `fonts/`: Liberation Sans, used to build the PDF download.
- `tests/`: the page check (`bash tests/run.sh`, made-up data only).
- `setup/example-master-cv.json`: the shape of a master CV.

## Where the data lives
In the artifact's own database (ArtifactData on the artifact URL):
- `jobs/<id>`: one doc per job.
- `profile/cv`: `{cv, rules}`, the master CV and tailoring rules (empty rules = built-in starter rules).
- `profile/voice`: writing voice, samples, stories for application answers.
- `profile/prefs`: `{items:[{id,text,added}]}`, standing preferences, added from the page.
- `profile/search`: cities, work setups (`arrangements`), `jobTypes`, `level`, the person's own `roleTypes` ([{id,name,ex}]) and which are on (`roles`), limits, skip list, `about`. The morning search task reads it every run. With no `roleTypes` saved the page uses the starter list `ROLE_TYPES`.

The page reads the person's name from the master CV. Nothing about any one person is hardcoded; keep it that way (a check fails if names creep in).

## Changing the page
1. Read the live page with the Artifact tool (read action on the person's artifact URL) and compare it with `index.html`. If they differ, keep the live version as the starting point.
2. For bigger or visual changes, show the person screenshots (made-up data) before publishing.
3. Edit `index.html`. Line ~513 holds the embedded logos and is very long: change it with a script, not the Edit tool.
4. `bash tests/run.sh` must print all PASS. Add a check to `tests/check.js` for a new feature. Dropdowns are custom: use the `pick(page, selectId, value)` helper.
5. Publish `index.html` to the same artifact URL (omit `capabilities` to keep them). Publishing to the same URL keeps the database.

## Never
- Delete the artifact: the database goes with it.
- Put real data (CVs, jobs, emails, phone numbers) in this repo. Tests use `tests/sample-data.json` only.
- Write to the real database while testing. The check uses a fake in-memory `window.claude`.
- Let tailoring add facts that are not in the master CV.
