# AMPS website — Vercel-ready

Static site (no build step) plus one Vercel Function for the two forms.

## Deploy

1. Put this folder in a GitHub repo (or use the Vercel CLI: `npx vercel` from inside this folder).
2. In Vercel: **Add New → Project → import the repo**. Framework preset: **Other**. Leave Build Command and Output Directory empty.
3. **Settings → Environment Variables** (Production and Preview):
   - `RESEND_API_KEY`: from resend.com → API Keys
   - `MAIL_FROM`: e.g. `AMPS Website <website@automps.eu>` (verify the automps.eu domain in Resend → Domains first)
   - `MAIL_TO` (optional): defaults to `sales@automps.eu`
   - `MAIL_TO_APPLICATIONS` (optional): where technician applications go; defaults to `MAIL_TO`
4. Redeploy after you add the variables.
5. **Settings → Domains**: add `www.automps.eu` (primary) and `automps.eu`. Vercel redirects the bare domain to www.
6. Google Search Console: add the property `https://www.automps.eu`, then submit `https://www.automps.eu/sitemap.xml`.

## URLs

| Page | URL |
|---|---|
| Home | `/` |
| Future of repair | `/robotics.html` |
| OEMs & dealer groups | `/companies.html` |
| How the programme works | `/how-it-works.html` |
| Repair areas | `/services.html` |
| Why AMPS | `/why-amps.html` |
| Programme terms | `/programme-terms.html` |
| About | `/about.html` |
| FAQ | `/faq.html` |
| Contact | `/contact.html` |
| Careers | `/careers.html` |
| Apply | `/apply.html` |
| Privacy policy | `/privacy.html` |

Old `*.dc.html` addresses and short ones like `/about` redirect (301) to these (see `vercel.json`).

## Preview on your computer

Double-click `index.html`: the pages, menu, footer and links all work straight from the folder. Two things only work once it's online: the forms (they need the Vercel function) and the custom fonts (browsers block font files opened from disk, so you'll see a fallback font locally).

## Files

- `*.html` — one per page. Each page holds its full content as plain HTML for search engines and no-JS visitors, plus the live interactive version.
- `SiteHeader.dc.html`, `SiteFooter.dc.html`, `EnquiryForm.dc.html` — shared header, footer and enquiry form, loaded by every page.
- `support.js` — the page runtime. `vendor/` — React, icons and fonts, all self-hosted.
- `i18n.js`, `i18n-dict.js` — EN / NL / FR / DE translations.
- `api/submit.js` — emails form submissions through Resend (CV and certificates attached, 4 MB max).
- `vercel.json` — clean URLs, redirects, security and cache headers.
- `robots.txt`, `sitemap.xml`, `404.html`.

## Test the forms after deploy

Send one programme request from `/contact` and one application from `/apply` with a small PDF as the CV. Both should arrive at the `MAIL_TO` address. If they don't, check the function's logs (Vercel → Deployments → Functions).
