# jobmaxxer website

The public site for jobmaxxer, hosted on Vercel (project root: this `site` folder).

| Page | Who sees it |
|---|---|
| `/` | Everyone: the coming soon page, with a small Admin access button |
| `/privacy`, `/terms`, `/feedback` | Everyone (not linked from the coming soon page yet) |
| `/admin` | Only after signing in: feedback inbox and links |
| `/preview` | Only after signing in: the landing page draft |

## Settings in Vercel (Project, then Settings, then Environment Variables)
- `ADMIN_PASSWORD`: the admin password. Use a long one. Changing it signs everyone out.
- `DATABASE_URL`: a Neon database for feedback. Easiest: Vercel project, Storage tab, connect Neon. The table is created by itself.

## Before launch
Replace `{{CONTACT_EMAIL}}` and `{{OWNER}}` in `privacy.html` and `terms.html`.
