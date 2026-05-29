# Blog Implementation — Progress Tracker

Live status of executing [`BLOG_PLAN.md`](./BLOG_PLAN.md). Updated as work proceeds.

**Started:** 2026-05-29
**Current focus:** Phase 1 nearly complete (engine + CMS + workflow built & tested locally). Next: 2nd seed post + owner-side setup (Pages source, OAuth Worker), then Phase 2 (AI agent).

**Build stack decision:** tooling is **Node.js** (not Python) — Node v24 is available locally for testing; CI uses `actions/setup-node`. Deps: `gray-matter`, `marked`. Build entry: `npm run build` → `scripts/build_blog.js`.

Legend: ☐ not started · ◐ in progress · ☑ done · ⊘ blocked/skipped

---

## Locked decisions

| Decision | Choice |
|---|---|
| CMS | **Sveltia CMS** (static admin in repo + free Cloudflare Worker for login) |
| Deployment | **GitHub Pages → Source: GitHub Actions** (render & deploy, no generated HTML committed) |
| Blog nav placement | **Top-level nav item** |
| AI provider | **Gemini (free)** to start; swappable via one function |
| Content source of truth | `content/blog/{slug}.md` (Markdown + front-matter) |
| URL shape | date-free `/blog/{slug}/` |

---

## Phase 1 — Foundations

| Step | Description | Status | Notes |
|---|---|---|---|
| 1.1 | Editorial scope (categories, voice, cadence, length) | ☑ | Defaults from plan; cadence/categories still open for Ely |
| 1.2 | Content model & front-matter schema | ☑ | Implemented in `admin/config.yml` + `build_blog.js` |
| 1.3 | Post template `templates/post.html` | ☑ | Mirrors `discipline/index.html` chrome; BlogPosting + Breadcrumb JSON-LD, OG/Twitter, byline, per-category CTA, footer disclaimer |
| 1.4 | Blog index template `templates/index.html` | ☑ | Cards grid + empty-state + Blog JSON-LD |
| 1.5 | Nav + sitemap + robots wiring | ☑ | Top-level **Blog** added to all 10 site navs (+404); `robots.txt` Disallow /admin/; sitemap reconciled by build |
| 1.6 | `scripts/build_blog.js` reconciler (render/sync/delete/301) | ☑ | Renders MD→HTML, skips drafts, rebuilds index + posts.json, reconciles sitemap (preserves non-blog URLs), redirect stubs via `content/blog/_redirects.json`. Rails (4.3) deferred. Tested locally ✓ |
| 1.7 | Sveltia CMS `admin/index.html` + `admin/config.yml` | ☑ | editorial_workflow + all SEO field boxes; Worker deployed + `base_url` set. Live at /admin/ (verify GitHub login end-to-end) |
| 1.8 | First 2 seed posts | ◐ | 1/2 done: `douglas-factors-explained.md`. 2nd pending Ely topic pick |
| + CSS | Blog styles appended to `assets/styles.css` | ☑ | `.blog-grid/.blog-card`, `.post-byline`, `.legal-disclaimer`, empty-state; mobile rules |

## Phase 2 — AI Drafting Agent

| Step | Description | Status | Notes |
|---|---|---|---|
| 2.1 | Model wiring (Gemini, abstracted) | ☐ | |
| 2.2 | Editorial queue `topics.json` | ☐ | |
| 2.2.1 | News-crawl prioritization (opportunistic) | ☐ | Ship queue-only first |
| 2.3 | `scripts/draft_post.py` (writes draft Markdown) | ☐ | |
| 2.4 | Guardrails (word count, citation regex, labels) | ☐ | |

## Phase 3 — GitHub Actions

| Step | Description | Status | Notes |
|---|---|---|---|
| 3.1 | `build-blog.yml` (render + Pages deploy) | ☑ | Built. Strips dev files from artifact, deploys via Pages. ⚠ needs owner: set Pages Source = "GitHub Actions" before first push, or deploy step fails |
| 3.2 | `draft-blog-post.yml` (scheduled AI draft) | ☐ | |
| 3.3 | Secrets + Pages "Source: GitHub Actions" + OAuth Worker | ◐ | ☑ Pages Source = GitHub Actions; ☑ `sveltia-cms-auth` Worker deployed (`sveltia-cms-auth.ely-a8e.workers.dev`) + base_url set. ☐ `GEMINI_API_KEY` secret (Phase 2) |
| 3.4 | Reviewer workflow doc | ☐ | |

## Phase 4 — Promotion Hooks

| Step | Description | Status | Notes |
|---|---|---|---|
| 4.1 | Per-post conversion blocks | ☐ | |
| 4.2 | Lead capture (optional) | ☐ | |
| 4.3 | Internal-link rails on practice pages | ☐ | |
| 4.4 | Social syndication | ☐ | Manual |
| 4.5 | Analytics events | ☐ | |

## Phase 5 — Hardening

| Step | Description | Status | Notes |
|---|---|---|---|
| 5.x | Post-launch audits & tuning | ☐ | After 4/8 weeks |

---

## Open items needing Ely

- Categories final list · cadence · newsletter in/out · reviewer (self vs paralegal) · first 2 seed-post topics
- Owner-only setup: enable Pages "Source: GitHub Actions"; add `GEMINI_API_KEY` secret; register GitHub OAuth App + deploy `sveltia-cms-auth` Worker

---

## Change log

- **2026-05-29** — Repo synced to GitHub (force-overwrite per owner; recovery tag `backup/remote-main-pre-overwrite` kept locally). `BLOG_PLAN.md` pushed. Progress tracker created. Beginning Phase 1.
- **2026-05-29** — **Pushed & deployed live.** Owner set Pages Source = GitHub Actions and deployed the auth Worker; `base_url` wired in. Commit pushed to `main`, Build & Deploy workflow succeeded. Live 200s: `/blog/`, `/blog/douglas-factors-explained/`, `/admin/`, `/sitemap.xml`. **Paused for owner review.** Next: verify CMS GitHub login end-to-end; 2nd seed post; then Phase 2 (AI agent — needs `GEMINI_API_KEY`).
- **2026-05-29** — Phase 1 build-out (local): chose **Node.js** stack (`package.json`, `gray-matter`, `marked`); wrote `templates/post.html` + `templates/index.html`; `scripts/build_blog.js` reconciler; appended blog CSS; added top-level **Blog** nav link to all site pages; `robots.txt` Disallow /admin/; Sveltia `admin/` (index + config.yml, editorial workflow + SEO boxes); `.github/workflows/build-blog.yml`; seed post `douglas-factors-explained`. Build runs clean locally (1 post, sitemap reconciled). `.gitignore` now ignores `node_modules/`, generated `/blog/`, and local scratch notes. **Not committed/pushed yet** — holding until owner sets Pages Source = GitHub Actions (pushing the workflow first would fail the deploy step).
