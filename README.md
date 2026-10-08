# jobmaxxer

A job tracker that lives inside Claude. Every morning it finds new roles for you, grades how well each one fits, and tailors a one-page CV for any job in one click. You can also paste your own links or job descriptions.

It runs as a private page (an "artifact") on your own Claude account. Your jobs, CV and settings stay in your account. Nobody else can see them.

## How to set it up (about 15 minutes)

1. Open Claude (claude.ai or the desktop app). You don't need a GitHub account: this repo is public and Claude downloads it itself. (GitHub is only needed for the optional nightly backup.)
2. Start a new chat and send this:

   > Set up jobmaxxer for me from the public GitHub repo https://github.com/dennycrafter/jobmaxxer-setup (clone it, no account needed). Follow SETUP.md in the repo.

3. Claude publishes the tracker, then asks for a few things:
   - your CV (attach the file or paste the text). It doesn't need to be good, or even exist: Claude asks you questions about what you've done and builds a proper one-page US-style CV with you
   - what kinds of jobs you want and at what level (anything: it doesn't have to be the same jobs as anyone else)
   - the cities you want jobs in, and on-site, hybrid or remote
   - full-time, part-time, contract or internship
   - a couple of lines about what you're looking for
4. Claude sets up the daily job search and the link filler as scheduled tasks.
5. Open the tracker, check your master CV (profile menu, top right), and you're ready.

## Using it

- **Queue**: new roles from the morning search. Open one to tailor your CV, download it as .docx or .pdf, and draft answers to application questions.
- **Applied / Interviews / Closed**: move jobs along as you go.
- **My links**: paste a job link or a whole job description. The details fill in by themselves.
- **Profile menu**: your master CV, your preferences (rules for how your CV is written), and search settings, where you can add, remove or pause the kinds of jobs you want any time.

Tailoring only ever uses facts from your master CV. If you remember something later (an old job, a club, a number), open any Claude chat and say "Add this to my jobmaxxer master CV: ...". Claude asks a question or two and adds it.

## Good to know

- Everything uses your own Claude plan. A bigger morning search (more roles per morning) uses more.
- Keep the link to your tracker private. Anyone you share it with can see and change your jobs.
- To change anything about the tracker, open a chat with Claude, attach this repo, and ask. CLAUDE.md tells Claude how to make changes safely.
