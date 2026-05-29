#!/usr/bin/env node
/**
 * build_blog.js — Reizes Law blog reconciler.
 *
 * Reads content/blog/*.md (Markdown + front-matter, the source of truth),
 * renders each non-draft post into blog/{slug}/index.html using templates/post.html,
 * rebuilds blog/index.html, blog/posts.json, and reconciles sitemap.xml.
 * Emits 301-style redirect stubs for slugs listed in content/blog/_redirects.json.
 *
 * Pure input -> output: it never needs to commit state back. In CI the whole
 * working tree (including the freshly written blog/) is uploaded as the Pages artifact.
 *
 * Usage: node scripts/build_blog.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://reizeslaw.com';

const CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const BLOG_OUT = path.join(ROOT, 'blog');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');

// Allowed categories (must match admin/config.yml select options).
const CATEGORIES = [
  'Discipline', 'Removals', 'Suspensions', 'MSPB Appeals',
  'FERS Disability', 'Whistleblower', 'EEO', 'Federal Workplace News',
];

// Per-category CTA copy + the practice-area page each category should link to.
const CATEGORY_META = {
  'Discipline':              { area: '/discipline/',                 areaLabel: 'Federal Employee Discipline',     cta: 'Facing a PIP or Letter of Reprimand?' },
  'Removals':                { area: '/removals/',                   areaLabel: 'Federal Removals Defense',        cta: 'Facing a proposed removal?' },
  'Suspensions':             { area: '/suspensions/',                areaLabel: 'Suspensions Defense',             cta: 'Facing a proposed suspension?' },
  'MSPB Appeals':            { area: '/mspb-appeals/',               areaLabel: 'MSPB Appeals',                    cta: 'Appealing to the MSPB?' },
  'FERS Disability':         { area: '/fers-disability-retirement/', areaLabel: 'FERS Disability Retirement',      cta: 'Considering FERS disability retirement?' },
  'Whistleblower':           { area: '/whistleblower-protection/',   areaLabel: 'Whistleblower Protection',        cta: 'Facing whistleblower retaliation?' },
  'EEO':                     { area: '/eeo-discrimination/',         areaLabel: 'EEO Discrimination',              cta: 'Experiencing workplace discrimination?' },
  'Federal Workplace News':  { area: '/discipline/',                 areaLabel: 'Federal Employee Discipline',     cta: 'Questions about a federal personnel action?' },
};

const DEFAULT_CTA_TEXT =
  'A federal employment matter is easier to defend early. Call 1-855-FED-GUY-1 or use our contact form for a confidential case review.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/profile.jpg`;

// ---------- helpers ----------

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// JSON-string-safe inner value (no surrounding quotes) for embedding in JSON-LD.
function jsonInner(s) {
  return JSON.stringify(String(s ?? '')).slice(1, -1);
}

function fillTokens(template, tokens) {
  let out = template;
  for (const [key, val] of Object.entries(tokens)) {
    out = out.split(`{{${key}}}`).join(val ?? '');
  }
  return out;
}

// YAML auto-parses unquoted `2026-05-26` into a Date; normalize either form to yyyy-mm-dd (UTC).
function toISODate(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatHuman(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------- load posts ----------

function loadPosts() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'));

  const posts = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = (data.slug || path.basename(file, '.md')).trim();

    if (data.draft === true) {
      console.log(`  · skipping draft: ${slug}`);
      continue;
    }
    if (!data.title) {
      console.warn(`  ! ${file}: missing title — skipped`);
      continue;
    }
    let category = (data.category || '').trim();
    if (!CATEGORIES.includes(category)) {
      console.warn(`  ! ${file}: unknown category "${category}" — defaulting to "Federal Workplace News"`);
      category = 'Federal Workplace News';
    }
    const date = toISODate(data.date);
    const updated = data.updated ? toISODate(data.updated) : date;

    posts.push({
      slug,
      title: String(data.title),
      category,
      date,
      updated,
      excerpt: String(data.excerpt || ''),
      metaTitle: String(data.meta_title || `${data.title} | Reizes Law`),
      metaDescription: String(data.meta_description || data.excerpt || ''),
      primaryArea: String(data.primary_practice_area || CATEGORY_META[category].area),
      ogImage: String(data.og_image || DEFAULT_OG_IMAGE),
      bodyMd: content,
    });
  }

  // Newest first.
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
  return posts;
}

// ---------- rendering ----------

function renderBody(md) {
  let html = marked.parse(md, { gfm: true, breaks: false });
  // The page <h1> is the post title; demote any body h1 to h2 to keep one h1 per page.
  html = html.replace(/<(\/?)h1(\s|>)/g, '<$1h2$2');
  return html.trim();
}

function relatedLinksBlock(post, allPosts) {
  const meta = CATEGORY_META[post.category];
  const related = allPosts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  let items = `<li><a href="${meta.area}">${escapeHtml(meta.areaLabel)}</a> — our practice-area overview</li>`;
  for (const r of related) {
    items += `\n                <li><a href="/blog/${r.slug}/">${escapeHtml(r.title)}</a></li>`;
  }
  return `<div class="info-callout related-reading">
                <h4>Related reading</h4>
                <ul>
                ${items}
                </ul>
            </div>`;
}

function renderPost(post, allPosts, template) {
  const canonical = `${SITE_URL}/blog/${post.slug}/`;
  const meta = CATEGORY_META[post.category];
  const tokens = {
    META_TITLE: escapeHtml(post.metaTitle),
    META_DESCRIPTION: escapeHtml(post.metaDescription),
    META_DESCRIPTION_ESCAPED: jsonInner(post.metaDescription),
    CANONICAL_URL: canonical,
    OG_TITLE: escapeHtml(post.metaTitle),
    OG_IMAGE: escapeHtml(post.ogImage),
    TITLE: escapeHtml(post.title),
    TITLE_ESCAPED: jsonInner(post.title),
    CATEGORY: escapeHtml(post.category),
    SLUG: escapeHtml(post.slug),
    DATE_ISO: post.date,
    UPDATED_ISO: post.updated,
    DATE_HUMAN: escapeHtml(formatHuman(post.date)),
    EXCERPT: escapeHtml(post.excerpt),
    BODY_HTML: renderBody(post.bodyMd),
    RELATED_LINKS: relatedLinksBlock(post, allPosts),
    CTA_HEADING: escapeHtml(meta.cta),
    CTA_TEXT: escapeHtml(DEFAULT_CTA_TEXT),
  };
  const html = fillTokens(template, tokens);
  const outDir = path.join(BLOG_OUT, post.slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
}

function renderCard(post) {
  return `            <article class="blog-card">
                <a href="/blog/${post.slug}/" class="blog-card-link">
                    <span class="blog-card-cat">${escapeHtml(post.category)}</span>
                    <h2 class="blog-card-title">${escapeHtml(post.title)}</h2>
                    <p class="blog-card-excerpt">${escapeHtml(post.excerpt)}</p>
                    <span class="blog-card-meta"><time datetime="${post.date}">${escapeHtml(formatHuman(post.date))}</time></span>
                    <span class="learn-more">Read article &rarr;</span>
                </a>
            </article>`;
}

function blogJsonLd(posts) {
  const itemList = posts.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: `${SITE_URL}/blog/${p.slug}/`,
    name: p.title,
  }));
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Reizes Law — Federal Employment Law Blog',
    url: `${SITE_URL}/blog/`,
    inLanguage: 'en-US',
    publisher: { '@type': 'Organization', name: 'Reizes Law', url: `${SITE_URL}/` },
    ...(itemList.length ? { blogPost: itemList } : {}),
  };
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 4)}\n    </script>`;
}

function renderIndex(posts, template) {
  let cards;
  if (posts.length === 0) {
    cards = `            <div class="blog-empty">
                <h2>New articles coming soon</h2>
                <p>We're preparing plain-English guides on federal employment law. In the meantime, explore our <a href="/#expertise">practice areas</a> or <a href="/#contact">get in touch</a>.</p>
            </div>`;
  } else {
    cards = `            <div class="blog-grid">\n${posts.map(renderCard).join('\n')}\n            </div>`;
  }
  const html = fillTokens(template, { CARDS: cards, BLOG_JSONLD: blogJsonLd(posts) });
  fs.mkdirSync(BLOG_OUT, { recursive: true });
  fs.writeFileSync(path.join(BLOG_OUT, 'index.html'), html, 'utf8');
}

function writePostsManifest(posts) {
  const manifest = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    category: p.category,
    date: p.date,
    updated: p.updated,
    excerpt: p.excerpt,
    url: `/blog/${p.slug}/`,
  }));
  fs.writeFileSync(path.join(BLOG_OUT, 'posts.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

// ---------- sitemap ----------

function reconcileSitemap(posts) {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.warn('  ! sitemap.xml not found — skipping sitemap update');
    return;
  }
  const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
  // Keep every existing entry that is NOT under /blog/ (redirect stubs are excluded by design).
  const preserved = blocks.filter((b) => !/\/blog\//.test(b) && !/<loc>https:\/\/reizeslaw\.com\/blog\/<\/loc>/.test(b));

  const indent = '   ';
  const blogBlocks = [];
  blogBlocks.push(
    `${indent}<url>\n${indent}   <loc>${SITE_URL}/blog/</loc>\n${indent}   <changefreq>weekly</changefreq>\n${indent}   <priority>0.6</priority>\n${indent}</url>`
  );
  for (const p of posts) {
    blogBlocks.push(
      `${indent}<url>\n${indent}   <loc>${SITE_URL}/blog/${p.slug}/</loc>\n${indent}   <lastmod>${p.updated || p.date}</lastmod>\n${indent}   <changefreq>monthly</changefreq>\n${indent}   <priority>0.7</priority>\n${indent}</url>`
    );
  }

  const body = [...preserved.map((b) => indent + b.trim()), ...blogBlocks].join('\n');
  const out = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(SITEMAP_PATH, out, 'utf8');
}

// ---------- redirects (tombstones) ----------

function redirectStub(target) {
  const url = target.startsWith('http') ? target : `${SITE_URL}${target}`;
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Redirecting...</title>
    <link rel="canonical" href="${url}">
    <meta http-equiv="refresh" content="0; url=${url}">
    <script>window.location.href = "${url}";</script>
</head>
<body>
    <p>Redirecting to <a href="${url}">Reizes Law Blog</a>...</p>
</body>
</html>`;
}

function emitRedirects(livingSlugs) {
  const file = path.join(CONTENT_DIR, '_redirects.json');
  if (!fs.existsSync(file)) return 0;
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.warn(`  ! _redirects.json is not valid JSON — skipping (${e.message})`);
    return 0;
  }
  let count = 0;
  for (const entry of entries) {
    const from = (entry.from || '').trim();
    const to = entry.to || '/blog/';
    if (!from) continue;
    if (livingSlugs.has(from)) {
      console.warn(`  ! redirect "${from}" collides with a live post — skipping stub`);
      continue;
    }
    const outDir = path.join(BLOG_OUT, from);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), redirectStub(to), 'utf8');
    count++;
  }
  return count;
}

// ---------- main ----------

function main() {
  console.log('Building blog…');
  const postTpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'post.html'), 'utf8');
  const indexTpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.html'), 'utf8');

  const posts = loadPosts();

  // Clean rebuild of the generated blog/ directory (it is git-ignored and rebuilt each run).
  rmrf(BLOG_OUT);
  fs.mkdirSync(BLOG_OUT, { recursive: true });

  for (const post of posts) renderPost(post, posts, postTpl);
  renderIndex(posts, indexTpl);
  writePostsManifest(posts);
  reconcileSitemap(posts);

  const livingSlugs = new Set(posts.map((p) => p.slug));
  const redirects = emitRedirects(livingSlugs);

  console.log(`Done: ${posts.length} post(s), ${redirects} redirect stub(s).`);
  for (const p of posts) console.log(`  ✓ /blog/${p.slug}/  (${p.category}, ${p.date})`);
}

main();
