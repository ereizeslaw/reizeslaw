# Reizes Law — Blog Implementation Plan

**Goal:** Add an SEO-driven blog to reizeslaw.com, hosted on GitHub Pages, with (a) a clean visual CMS so Ely can write and approve articles like in Word/WordPress — never touching raw HTML or GitHub diffs — and (b) an AI agent that drafts articles on a schedule, dropping them into the CMS as **Drafts** for human approval before publishing.

**Author:** Drafted with Claude Code, 2026-05-21
**Revised:** 2026-05-29 — added a **git-based CMS layer (Sveltia CMS)** after evaluating Keystatic. See [§0 — Why a CMS, and why Sveltia (not Keystatic)](#0-why-a-cms-and-why-sveltia-not-keystatic).
**Status:** Proposal — pending owner approval

---

## 0. Why a CMS, and why Sveltia (not Keystatic)

The original plan had the AI open Pull Requests containing **full HTML files**, which Ely would review as GitHub diffs. That works, but it asks a non-technical lawyer to read code diffs to approve content. We want a real editing experience: a WYSIWYG editor, dedicated SEO boxes (meta title / description / slug), an isolated **Draft** state, and one-click **Publish / Delete**.

**Keystatic was the first candidate.** It nails the editing UX, but it does **not** fit this site:

- Keystatic is a **React component that requires a framework** (Astro or Next.js) and a **server-side runtime** to handle the GitHub login/OAuth handshake in production.
- **GitHub Pages is static-only** and cannot run those server routes. Adopting Keystatic would mean (1) migrating to Astro — i.e. introducing a full build step and abandoning the hand-built static architecture — and (2) moving hosting to Netlify/Vercel/Cloudflare. That contradicts both "no build step" *and* "no server / installed directly on the repo."

**Decision: use a git-based CMS with a *static* admin — [Sveltia CMS](https://github.com/sveltia/sveltia-cms).** It delivers the same four wins (WYSIWYG, SEO fields, Draft isolation, one-click publish/delete) while keeping the site on GitHub Pages:

| Requirement | Keystatic | **Sveltia CMS (chosen)** |
|---|---|---|
| WYSIWYG editor | ✅ | ✅ |
| Dedicated SEO fields (title/desc/slug) | ✅ | ✅ (configurable widgets) |
| Isolated Draft state (human-in-the-loop) | ✅ | ✅ **native editorial workflow** (Draft → In Review → Publish) |
| One-click Publish / Delete | ✅ | ✅ |
| Runs on **GitHub Pages** (no host migration) | ❌ needs Astro + serverless host | ✅ admin is a static page |
| **No server / no monthly cost** | ❌ serverless backend required | ✅ only a free Cloudflare Worker for GitHub login |
| Content stays in your repo (no SaaS) | ✅ | ✅ |

**The one unavoidable trade-off (true of *any* CMS, Keystatic included):** content moves from full hand-written HTML files to **Markdown + front-matter**, so something has to render it. We keep that render step tiny and **server-side in CI only** — a GitHub Action turns Markdown into your existing HTML template and deploys to Pages. **The public site stays 100% static HTML.** The only "build" lives in GitHub Actions; there is still no local build, no framework, and no runtime server.

> **Alternative if you want literally zero infra:** [Pages CMS](https://pagescms.org) hosts the admin UI for you (install a GitHub App, log in at their site — no Cloudflare Worker needed). Trade-off: a third party runs the editor UI, and its draft model is a simple status field rather than Sveltia's Draft/In-Review board. Content still lives in your repo either way, and the repo layout below is unchanged — so this is a low-cost swap if preferred.

---

## 1. Guiding Principles

1. **Static *output*, CMS-driven *input*.** The published site remains hand-style static HTML on GitHub Pages — no framework, no runtime server, no local build. The *only* new build is a GitHub Action that renders Markdown posts into the existing HTML template. (This is the one relaxation of the original "no build step at all" rule, and it buys the lawyer a real editor; see §0.)
2. **Approval gate is mandatory, not cosmetic.** Legal content is "Your Money or Your Life" (YMYL) territory for Google. Every AI draft lands as a **Draft in the CMS** (and a PR), never auto-published. Ely (or a delegate) reviews/edits in the visual editor and clicks **Publish**.
3. **Author transparency.** Every post displays a "Reviewed by Ely Reizes, Esq." byline. AI-assisted drafting is acceptable; publishing unreviewed AI content is not.
4. **SEO parity.** Each post is a first-class SEO asset: canonical URL, Open Graph, Twitter, `BlogPosting` JSON-LD, breadcrumbs, sitemap entry — all driven by front-matter fields exposed as dedicated boxes in the CMS.
5. **Internal linking.** Every post links to ≥1 relevant practice-area page (discipline / removals / MSPB / etc.) — the blog's main commercial purpose is to feed those pages with topical authority and inbound traffic.
6. **No lock-in.** Content is plain Markdown in the repo; the CMS config is Decap-compatible. Sveltia can be swapped for Decap/Pages CMS without touching the content.

---

## 2. Architecture Overview

```
reizes_law/
├── content/
│   └── blog/
│       └── {slug}.md                 # SOURCE OF TRUTH: Markdown + front-matter
│                                      #   (written by Sveltia AND by the AI agent)
├── admin/
│   ├── index.html                    # Sveltia CMS admin (static page) → reizeslaw.com/admin/
│   └── config.yml                    # collections, fields, SEO boxes, editorial workflow
├── templates/
│   ├── post.html                     # Post skeleton (was _template.html) — Jinja placeholders
│   ├── index.html                    # Blog-index skeleton
│   └── rail.html                     # "Latest articles" rail fragment for practice pages
├── blog/                             # GENERATED — do not hand-edit
│   ├── index.html                    #   blog index (list of posts)
│   └── {slug}/index.html             #   one rendered post → /blog/{slug}/
├── scripts/
│   ├── build_blog.py                 # Reconciler: content/*.md → blog/**, index, sitemap, rails
│   └── draft_post.py                 # AI: scans sources, writes content/blog/{slug}.md as a DRAFT
├── .github/
│   └── workflows/
│       ├── build-blog.yml            # On push: render Markdown → deploy site to Pages
│       └── draft-blog-post.yml       # Scheduled AI draft → opens Draft PR
└── sitemap.xml                       # Regenerated by build_blog.py
```

**Why this layout:**
- **`content/blog/{slug}.md` is the single source of truth.** Both the lawyer (via Sveltia) and the AI agent write *only* Markdown here. Everything under `blog/` is generated.
- **Clean, date-free URLs** (`/blog/{slug}/`) matching the existing practice-area pattern (`/discipline/`, `/removals/`). No date in the path: evergreen legal content shouldn't look stale, and a post can be refreshed (updating `dateModified`) without the URL contradicting itself. Publication date lives in front-matter, the `BlogPosting` JSON-LD, and the visible byline. Slugs are unique; a rare collision gets a `-2` suffix.
- **`templates/post.html` is the single source of truth for post HTML structure** — easy to restyle later; the same template renders both human- and AI-authored posts.
- **`build_blog.py` is a reconciler** (see §1.6): it treats the set of *non-draft* `content/blog/*.md` files as truth and regenerates every derived surface (post pages, index, sitemap, service-page rails) on each run, so adding or removing a post is one safe operation.

**Deployment model (how static stays static):** GitHub Pages is set to **Build and deployment → Source: GitHub Actions**. The `build-blog.yml` Action assembles the final site (copies the existing hand-built pages as-is, renders the blog Markdown through the template) and deploys the artifact to Pages. **No generated HTML is committed to the repo** — the repo holds Markdown + templates + the existing static pages; the Action produces the static output.
- *Lower-tech fallback:* if you'd rather keep deploying from the `main` branch (no Actions-based Pages), the Action can instead **commit the rendered `blog/**` HTML back to the repo** and Pages serves it from the branch as before. Trade-off: generated files and bot commits live in git. Either way the public site is static.

---

## 3. Execution Plan

### Phase 1 — Foundations (manual, ~1–1.5 days of work)

**Step 1.1 — Decide editorial scope**
- Categories (proposal): `Discipline`, `Removals`, `MSPB Appeals`, `FERS Disability`, `Whistleblower`, `EEO`, `Federal Workplace News`.
- Voice: informational, plain-English, no legal-advice language in body — global disclaimer in footer.
- Target cadence: **1 post / week** to start. Can dial up later.
- Target length: 800–1,400 words.

**Step 1.2 — Define the content model & front-matter**
Every post (`content/blog/{slug}.md`) carries this front-matter — and these become the **dedicated boxes** in the CMS (Step 1.7):
```yaml
---
title: "The 12 Douglas Factors, Explained for Federal Employees"
slug: "douglas-factors-explained"        # editable; auto-suggested from title
category: "Discipline"                    # select widget (the 7 categories)
date: 2026-06-02                          # datePublished
updated: 2026-06-02                       # dateModified (refresh on edit)
excerpt: "A plain-English breakdown of each Douglas factor…"   # index card + meta fallback
meta_title: "Douglas Factors Explained | Reizes Law"           # SEO <title>
meta_description: "What are the 12 Douglas factors and how do agencies weigh them?…"  # SEO meta description
primary_practice_area: "/discipline/"     # for internal links + rail placement
draft: true                               # AI sets true; clearing it (or Publish) goes live
ai_generated: true                        # provenance flag (shown in PR / internal only)
source_urls: []                           # for news-sourced drafts — Ely verifies (Step 2.2.1)
---

(Markdown body here)
```

**Step 1.3 — Build the post template (`templates/post.html`)**
- Same nav/footer/styles as practice-area pages (copy from `discipline/index.html`).
- Jinja placeholders fed from front-matter + rendered body: `{{ title }}`, `{{ slug }}`, `{{ date_iso }}`, `{{ category }}`, `{{ excerpt }}`, `{{ meta_title }}`, `{{ meta_description }}`, `{{ body_html }}`, `{{ related_links }}`.
- Includes:
  - `BlogPosting` JSON-LD with `author`, `datePublished`, `dateModified`, `mainEntityOfPage`.
  - `BreadcrumbList` JSON-LD (Home → Blog → Post).
  - Open Graph `type=article`, Twitter Card, canonical.
  - Byline block ("By the Reizes Law team — Reviewed by Ely Reizes, Esq., {date}").
  - Footer CTA block linking to the most relevant practice area + contact page.
  - "Related articles" section (populated by `build_blog.py`).

**Step 1.4 — Build the blog index template (`templates/index.html`)**
- Reuse navigation, footer, fonts, styles from existing pages.
- Add a `Blog` link to the primary nav (see Step 1.5).
- Lists posts as cards: title, date, category, 1-sentence excerpt, "Read more".
- Empty-state copy for launch ("New articles coming soon").
- SEO: title, description, OG, Twitter, canonical, `Blog` schema JSON-LD.

**Step 1.5 — Wire into navigation & sitemap**
- Add `Blog` link in nav on every page (root + each subfolder page).
- `/blog/` and each `/blog/{slug}/` enter `sitemap.xml` via `build_blog.py`.
- Update `robots.txt` if needed. **Add `Disallow: /admin/`** so the CMS admin isn't crawled.

**Step 1.6 — Content lifecycle: render, state sync, deletion & 301 redirects**

`build_blog.py` is a **reconciler**, not an append-only script. On every run it scans `content/blog/`, treats the **non-draft** `*.md` files as the source of truth, and rewrites every derived surface to match. This makes *adding*, *editing*, and *removing* a post a single, safe operation.

- **Render:** each non-draft `{slug}.md` → `blog/{slug}/index.html` via `templates/post.html` (Markdown → HTML body, front-matter → metadata/JSON-LD/SEO tags).
- **`draft: true` files are skipped** — never rendered, never in the index or sitemap. This is the publish gate at the build layer (belt-and-suspenders with the CMS editorial workflow).
- **On add/edit:** insert/refresh the card in the blog index, add/update the `<url>` in `sitemap.xml`, refresh the "Latest articles" rails on the relevant practice-area pages (Step 4.3).
- **On delete:** Ely deletes the post in Sveltia (or the `.md` file is removed via PR). The next run **removes** it from the index, sitemap, and rails — no orphaned references.
- **301-style redirect for deleted URLs (SEO protection):** removing a post would normally leave a `404` for inbound links or cached Google results. So when the reconciler sees a slug that was previously published but no longer has a (non-draft) source file, it writes a **thin redirect stub** at the old path (`blog/{slug}/index.html`) with `<link rel="canonical">` + `<meta http-equiv="refresh">` + a JS fallback pointing to `/blog/` — the same pattern already used by `2023/04/10/hello-world/index.html`. GitHub Pages is static, so meta-refresh + canonical is the correct stand-in for a server 301.
  - The reconciler tracks "tombstoned" (deleted-with-redirect) slugs vs. live ones so a stub is never re-scanned as a real post.
  - Redirect stubs are **excluded** from `sitemap.xml` (don't advertise dead URLs; the canonical does the consolidation).

**Step 1.7 — Stand up the CMS (Sveltia)**

- **`admin/index.html`** — a few lines that load the Sveltia CMS bundle (static; nothing to build).
- **`admin/config.yml`** — defines:
  - `backend: github` with `repo: ereizeslaw/reizeslaw`, `branch: main`.
  - **`publish_mode: editorial_workflow`** → the native **Draft → In Review → Ready** board. Nothing goes live until moved to Ready/Published. (Maps directly to Principle #2.)
  - A `blog` **folder collection** pointed at `content/blog`, with fields mirroring the front-matter in Step 1.2 — including the **dedicated SEO boxes**: `meta_title` (string), `meta_description` (text), `slug` (editable string), plus a `markdown` widget for the body and a `select` for category.
  - `media_folder` for in-article images (e.g. `assets/blog/`).
- **GitHub login (the only "infra"):** deploy the free [`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) **Cloudflare Worker** (one-time, free tier) and register a **GitHub OAuth App** so Ely can log into `reizeslaw.com/admin/` with GitHub. No server to maintain; the Worker only brokers the OAuth handshake.
  - *(Pages CMS alternative skips this entirely — install their GitHub App and log in at their hosted admin.)*

**Step 1.8 — Hand-write the first 2 posts (in the CMS)**
- One per top practice area (e.g., "What Is a Douglas Factor?" + "Timeline of an MSPB Appeal").
- Purpose: prove the template + CMS round-trip, seed the index, and serve as **few-shot style exemplars** for the AI prompt.

---

### Phase 2 — AI Drafting Agent (~1 day of work)

**Step 2.1 — Choose the AI model**
- **Recommended: Gemini 2.5 Pro** (Google AI Studio) — generous free tier (plenty for 1 post/week), strong long-form writing, free API key at [aistudio.google.com](https://aistudio.google.com/).
- **Alternative: Claude (Sonnet/Opus).** Better legal/professional tone in our experience, but paid from request 1.
- **Alternative: OpenAI GPT-class.** Comparable quality, paid.

Decision: start with Gemini, swap later if quality is insufficient. The script abstracts the model behind a single function so the swap is trivial.

**Step 2.2 — Editorial queue (`content/blog/_topics.json` or `blog/topics.json`)**
A simple list Ely tops up. The agent pops one per run.
```json
[
  {
    "slug": "douglas-factors-explained",
    "title": "The 12 Douglas Factors, Explained for Federal Employees",
    "category": "Discipline",
    "primary_practice_area": "/discipline/",
    "angle": "Plain-English breakdown of each factor with examples of how agencies weight them.",
    "keywords": ["douglas factors", "federal discipline", "MSPB mitigation"]
  }
]
```

**Step 2.2.1 — Topic selection: dynamic prioritization (queue is a fallback, not a rigid order)**

The agent does **not** run blindly through the queue. Each run follows a two-step decision:

- **Step A — News crawl.** The agent goes online and looks for hot news or new rulings from the last few days (e.g. MSPB and EEOC decision feeds, OPM guidance, Federal Register, established fed-employment legal blogs), and crosses them against the topic list. It also compares against already-published titles to avoid duplicates.
- **Step B — Decision:**
  1. **Relevant *and* reliable news found (with a verified source URL)** → draft a topical article on it, with the source URLs captured into the `source_urls` front-matter field. The queued topic stays untouched for a future run (it is *not* consumed).
  2. **No new news, *or* sources aren't reliable enough** → fall back to the queue and take the next topic. The run never stalls.

The key property: the news path is **opportunistic, never load-bearing**. A weak or empty news cycle can never block a run — the pre-prepared queue is always behind it.

> ⚠️ **YMYL guardrail (important).** News ingestion is the highest hallucination-risk part of this system — where an AI is most likely to assert a ruling that doesn't exist. Therefore: ingestion may only *propose a topic and supply source URLs*. The draft must **not** state a specific holding, docket number, date, or citation unless it is backed by a real source URL captured during the scan, and that URL must appear in `source_urls` (surfaced in the PR/Draft) for Ely to verify. Anything unverifiable is written as general/educational framing, not as reporting of fact. If the scan yields nothing sourceable, the agent falls back to the queue rather than inventing news.
>
> *Recommendation:* ship Phase 1 + the **queue-only** path first; enable the ingestion path only once the queue-driven flow is producing reliably reviewable drafts.

**Step 2.3 — Drafting script (`scripts/draft_post.py`)**

The agent writes a **Markdown file with `draft: true`**, so it appears in the CMS as a Draft for Ely — not a raw-HTML diff.

Pseudocode:
```python
def main():
    seen   = published_slugs()                 # from content/blog/*.md (non-draft)
    fresh  = scan_sources(seen)                # Step 2.2.1 ingestion (with source URLs)
    topic  = pick_timely(fresh) or pop_topic_from_queue()
    prompt = build_prompt(topic, exemplar_posts)   # few-shot with the 2 seed posts
    data   = call_gemini(prompt)               # JSON: body_md, excerpt, meta_description, meta_title, keywords
    slug   = topic['slug']                     # clean, date-free
    write_markdown(
        path=f"content/blog/{slug}.md",
        front_matter={**topic_to_frontmatter(topic, data), "draft": True, "ai_generated": True},
        body_md=data["body_md"],
    )
    update_topics_queue()                      # remove popped topic ONLY if it came from the queue
    # No site rebuild here: draft:true is skipped by build_blog.py until Ely publishes.
```

Prompt should specify:
- House style (informational, no advice language, no fabricated case names, stats, or quotes).
- Word-count target; a "Key takeaways" bulleted summary block.
- 2–3 internal links to relevant practice-area pages.
- Output format: **JSON** (`body_md`, `excerpt`, `meta_title`, `meta_description`, `related_keywords`) — easier to parse and validate than free-form text.

**Step 2.4 — Guardrails inside the script**
- Refuse to write the file if body is < 500 or > 2,500 words.
- Refuse if it contains regex-detected red flags (e.g., "I am a lawyer", "this is legal advice", fabricated-looking citations like `42 U\.S\.C\. § 999999`, `\d+ F\.\d+d \d+`).
- Always write `draft: true` and tag the PR with `needs-review` + `ai-draft` labels.

---

### Phase 3 — GitHub Actions Workflows (~½–1 day of work)

**Step 3.1 — `build-blog.yml` (render + deploy)**
- **Trigger:** `push` to `main` affecting `content/blog/**`, `templates/**`, or `scripts/build_blog.py` — plus `workflow_dispatch`.
- Steps: checkout → set up Python → run `scripts/build_blog.py` (renders non-draft Markdown → HTML, regenerates index/sitemap/rails) → **deploy to GitHub Pages** via the Pages deploy action.
- This is the single mechanism that turns a merged/published post into a live page (~1 minute). When Ely clicks **Publish** in Sveltia, the resulting commit to `main` triggers this.
- *(Lower-tech fallback per §2: instead of Pages-via-Actions, commit the rendered `blog/**` back to `main`.)*

**Step 3.2 — `draft-blog-post.yml` (scheduled AI draft)**
- **Trigger:** `schedule: cron: "0 13 * * 1"` (Mondays 9am ET) + `workflow_dispatch`.
- Skips the run if the queue is empty **and** no sourceable news (logs a notice, exits 0).
- **Skips if a prior AI Draft PR is still open/unmerged** (prevents review backlog — see Risks).
- Steps:
  1. Checkout `main`; set up Python.
  2. Run `scripts/draft_post.py` with `GEMINI_API_KEY` from repo secrets → writes `content/blog/{slug}.md` (`draft: true`).
  3. Create branch `ai-draft/{slug}` (date-stamped only if a same-slug branch already exists).
  4. Commit the new Markdown + updated queue.
  5. Push + open a PR via `gh pr create` whose body contains: topic, target keywords, word count, **`source_urls` for verification**, and a review checklist (factual accuracy, legal accuracy, brand voice, internal links, no fabrications).
  6. Assign to Ely; apply `ai-draft` + `needs-review` labels.
- **Why a Draft PR *and* the CMS draft state:** the PR is the trigger/notification + audit trail; Sveltia's editorial workflow gives Ely the visual review surface. Either path can be used to publish.

**Step 3.3 — Secrets & Pages settings**
- Add `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`) under **Settings → Secrets and variables → Actions**.
- Set **Pages → Build and deployment → Source: GitHub Actions** (for the §2 primary deployment model).
- Register the **GitHub OAuth App** + deploy the **`sveltia-cms-auth` Worker** for CMS login (Step 1.7).

**Step 3.4 — Review workflow for Ely**
- Open `reizeslaw.com/admin/`, find the post under **Drafts / In Review**, edit in the WYSIWYG, adjust the SEO boxes, click **Publish**.
- Or, on mobile: GitHub notification → review the PR → merge. Pages redeploys in ~1 minute.
- Edits either happen in the CMS or as commits on the PR branch.

---

### Phase 4 — Promotion / Marketing Hooks (~½ day of work)

**Step 4.1 — Per-post conversion blocks**
- Sticky right-rail (desktop) / bottom (mobile) CTA: "Facing [topic-relevant action]? Free case review →", parameterized per category in the template.
- End-of-article CTA card with phone number, intake email, and a link to `/contact/`.

**Step 4.2 — Lead-capture**
- (Optional) Newsletter signup block backed by a free Mailchimp/Buttondown hosted form (form action posts to their endpoint — no backend). Decide whether worth the privacy-policy update before enabling.

**Step 4.3 — Internal-link graph**
- Each practice-area page gets a "Latest articles" rail showing the 3 most recent posts in that category. `build_blog.py` regenerates these blocks from front-matter `category` / `primary_practice_area`.
- Improves dwell time and feeds page-rank back to commercial pages.

**Step 4.4 — Social / external syndication**
- LinkedIn: Ely posts a manual share at publish time. Optional later: an Action step posting via API.
- Reddit: r/fednews is relevant; manual sharing only (auto-posting gets flagged as spam).

**Step 4.5 — Analytics**
- Existing `gtag.js` (`G-NYGP4NDRD2`) loads on new pages via the template.
- Add a custom event for CTA clicks (`blog_cta_click` with `category` + `post_slug`).
- Track which posts convert to `/contact/` visits.

---

### Phase 5 — Hardening (post-launch, ongoing)

- After 4 weeks: audit which posts ranked / drove traffic; refine the AI prompt.
- After 8 weeks: decide whether to raise cadence to 2/week.
- Quarterly: review oldest posts and bump `updated`/`dateModified` if refreshed (Google rewards freshness).
- If Gemini quality is insufficient, swap to Claude — one function in `draft_post.py`.

---

## 4. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| AI fabricates a statute / case citation | **High** (reputational + ethics) | Prompt forbids citations; script regex-flags `\d+ U\.S\.C\.` and `\d+ F\.\d+d \d+` and refuses to write. Ely verifies any cite in review. |
| News-ingestion path invents a ruling/holding | **High** | Ingestion may only propose a topic + supply real source URLs (Step 2.2.1); no holding/date/citation without a captured URL in `source_urls`; unverifiable items written as general framing; falls back to queue. Ship queue-only first. |
| Unreviewed content slips live | **High** | **Two gates:** `draft: true` is skipped by `build_blog.py`, *and* Sveltia's editorial workflow holds it in Draft/In-Review. Publishing is an explicit human action. |
| Deleted post leaves 404s / lingers in sitemap | Medium (SEO) | `build_blog.py` reconciles on delete: drops the URL from index/sitemap/rails and writes a canonical + meta-refresh redirect stub to `/blog/` (Step 1.6). |
| Post reads as legal advice → UPL exposure | High | Prompt enforces informational voice. Global footer disclaimer. Ely's review catches anything crossing the line. |
| Google E-E-A-T penalty for AI content in YMYL niche | Medium | Human review + visible byline + author bio + linking to credentialed attorney page. Never publish unreviewed. |
| AI cadence > review bandwidth → backlog | Medium | `draft-blog-post.yml` skips a run if a prior AI Draft PR is still open. |
| CMS login / OAuth Worker misconfigured | Low–Med | One-time setup; the Worker only brokers OAuth (no data). Pages CMS alternative removes the Worker entirely. |
| New build step adds fragility | Low–Med | Build runs only in CI; on failure the previous deploy stays live. Output is plain static HTML — inspectable and revertable. |
| Leaked API key | Medium | Stored only in GitHub Secrets; rotate quarterly. |
| Style drift from rest of site | Low | Template-driven; visual changes are one file. |

---

## 5. Decisions & Open Questions

**Decided (2026-05-29):**
- ✅ **CMS:** **Sveltia CMS** — admin lives in the repo at `/admin/`, GitHub login via a free Cloudflare Worker. (Pages CMS not used.)
- ✅ **Deployment model:** GitHub Pages **"Source: GitHub Actions"** — the build Action renders Markdown → HTML and deploys the artifact; **no generated HTML is committed to the repo.** (The branch-commit fallback is not used.)

**Still open for Ely (please answer before/at Phase 1):**
1. **Nav placement.** New top-level `Blog` link, or nested under an existing menu?
2. **Categories.** Are the 7 proposed categories right, or should we collapse/split?
3. **Cadence.** Start at 1/week, or slower (1 every 2 weeks)?
4. **Newsletter signup.** In scope for launch, or defer?
5. **Reviewer.** Will Ely personally review every draft, or delegate to a paralegal first?
6. **AI provider.** Start with Gemini (free) or Claude (paid, likely higher quality)?
7. **First two seed posts.** Topic suggestions?

---

## 6. Estimated Total Effort

| Phase | Effort | Owner |
|---|---|---|
| Phase 1 — Foundations (templates + build_blog.py + CMS setup) | ~1–1.5 days | Developer |
| Phase 2 — AI agent | ~1 day | Developer |
| Phase 3 — GitHub Actions (build + draft) | ~½–1 day | Developer |
| Phase 4 — Promotion hooks | ~½ day | Developer |
| **Total to first AI-drafted Draft in the CMS** | **~3–4 days** | |
| Per-post review (ongoing) | ~20–40 min | Ely |

---

## 7. Out of Scope (for v1)

- Comments (third-party service → privacy/perf cost).
- User accounts / gated content.
- Multi-author support beyond Ely + AI.
- Tag pages (only category pages in v1).
- RSS feed (easy add later — Phase 5).
- Translations (English only for now).
- A custom Sveltia *live preview* template (ships with generic Markdown preview; styled preview is a later add).
