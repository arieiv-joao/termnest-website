# termnest.app — marketing site

Fully static: two HTML pages, no build step, no dependencies. Edit, commit, push — that's the whole pipeline.

| File | What it is |
|---|---|
| `index.html` | Landing page (hero, how-it-works, trust section, waitlist) |
| `privacy.html` | Privacy page — public copy. The counsel/Dev review checklist lives OUTSIDE this repo (`../marketing/privacy-review-flags.md`, not published); resolve it before Google verification |
| `CNAME` | Custom-domain marker for GitHub Pages (contains `termnest.app`) |

## Before go-live (founder checklist)

1. **Waitlist form endpoint** — create a free form at [formspree.io](https://formspree.io) (or any static-form service) and replace the one `TODO-FORM-ENDPOINT` placeholder in `index.html` (search for it; it's flagged with a big comment). Until then, submissions gracefully fall back to opening the visitor's email app addressed to hello@termnest.app.
2. **Email addresses** — set up mail routing for `hello@termnest.app` (used in the footer, waitlist fallback) and later `privacy@` / `security@` (referenced in the privacy page). GoDaddy sells mailboxes, or use free email forwarding (GoDaddy's own, or Cloudflare Email Routing if you move DNS there).
3. **Privacy review** — the 17 counsel/Dev items in `../marketing/privacy-review-flags.md` need sign-off before the Google Cloud console points at this URL (they were removed from the public page on 2026-09-10).

## Deploy: GitHub Pages (recommended)

1. Create a repo (e.g. `termnest/website`), push this directory:
   ```sh
   git remote add origin git@github.com:<YOUR-USER>/website.git
   git push -u origin main
   ```
2. In the repo: **Settings → Pages → Build and deployment** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)`.
3. Still in **Settings → Pages**: Custom domain → enter `termnest.app` → Save. (The `CNAME` file in this repo keeps that setting from being wiped on future pushes.)
4. After DNS propagates (below), tick **Enforce HTTPS** on the same screen — GitHub provisions the certificate automatically.

### GoDaddy DNS records (add all of these)

In GoDaddy → My Products → termnest.app → **DNS → Manage DNS**, add:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | default |
| A | `@` | `185.199.109.153` | default |
| A | `@` | `185.199.110.153` | default |
| A | `@` | `185.199.111.153` | default |
| AAAA | `@` | `2606:50c0:8000::153` | default |
| AAAA | `@` | `2606:50c0:8001::153` | default |
| AAAA | `@` | `2606:50c0:8002::153` | default |
| AAAA | `@` | `2606:50c0:8003::153` | default |
| CNAME | `www` | `<YOUR-USER>.github.io` | default |

Notes:
- Delete GoDaddy's default "Parked" A record on `@` first, or the site won't resolve.
- Replace `<YOUR-USER>` with the GitHub account/org that owns the repo (the value ends in `.github.io` regardless of the repo name).
- Propagation is usually minutes, occasionally a few hours. Check with `dig termnest.app +short` — it should return the four `185.199.*` addresses.
- Recommended afterwards: in GitHub **Settings → Pages**, verify the domain (Settings → Pages → "Verify" / account-level *Verified domains*) so nobody can hijack it if the Pages site is ever deleted.

## Alternative: Cloudflare Pages (two lines)

Connect the repo at [pages.cloudflare.com](https://pages.cloudflare.com) (framework preset: *None*, no build command, output dir `/`), then add `termnest.app` as a custom domain — Cloudflare walks you through moving the nameservers and handles DNS + HTTPS itself.
