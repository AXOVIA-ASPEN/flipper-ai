# Customer-Facing Changelog Page — Spec

**Goal:** Render `CHANGELOG.md` as a public-facing page at `https://<domain>/changelog`. Users see what's shipping; SEO benefits from regular content updates; you build trust by showing active development.

**Why bother:** The single biggest signal of a "live, well-maintained product" to a prospective customer is seeing a recent changelog. Stripe, Vercel, Linear, and Notion all do this and it's measurably correlated with conversion.

---

## URL & routing

- **Public page:** `/changelog`
- **Permalinks per release:** `/changelog/v1.2.0` (auto-generated from headings)
- **RSS feed:** `/changelog/rss.xml` — auto-generated, lets superfans subscribe

---

## Implementation

### Approach 1 — Static MDX rendering (recommended)

```ts
// app/changelog/page.tsx
import { readFileSync } from 'fs';
import { compileMDX } from 'next-mdx-remote/rsc';
import path from 'path';

export default async function ChangelogPage() {
  const source = readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf8');

  const { content } = await compileMDX({
    source,
    options: {
      mdxOptions: {
        rehypePlugins: [/* rehype-slug, rehype-autolink-headings */],
      },
    },
    components: {
      // Custom rendering for ## [version] - date headings → release card with badges
      h2: ReleaseHeading,
      h3: CategoryHeading, // Added / Changed / Fixed / etc.
    },
  });

  return (
    <article className="prose mx-auto max-w-3xl">
      <h1>What's new in Flipper.ai</h1>
      <p className="lead">A running log of features, fixes, and improvements.</p>
      <RssLink />
      {content}
    </article>
  );
}
```

**Pros:**
- Single source of truth: `CHANGELOG.md` already exists and is maintained by your release workflow
- No CMS, no DB
- Renders at build time (SSG) — fast, SEO-friendly, free to host
- Auto-updates on every deploy after a release

**Cons:**
- Updating the changelog mid-cycle requires a deploy. (Acceptable — releases are infrequent.)

### Approach 2 — Linear / GitHub Issues integration

Pull from GitHub Releases or Linear's "Shipped" board via API. More dynamic but adds infrastructure. **Not recommended at launch** — Approach 1 is simpler and the changelog doesn't change often.

---

## Visual design (matches glassmorphism dark theme already on django-main)

```
╔══════════════════════════════════════════════════════════╗
║  What's new in Flipper.ai                                ║
║  A running log of features, fixes, and improvements.     ║
║                                          [ RSS feed → ]  ║
╠══════════════════════════════════════════════════════════╣
║                                                            ║
║  ┌─────────────────────────────────────────────────┐      ║
║  │ v1.2.0 — 2026-05-15      [latest]                │      ║
║  ├─────────────────────────────────────────────────┤      ║
║  │ Added                                            │      ║
║  │ • Push notifications for new high-value finds   │      ║
║  │ • Custom fee rates per platform in settings     │      ║
║  │                                                  │      ║
║  │ Changed                                          │      ║
║  │ • Faster Craigslist scans (3x throughput)       │      ║
║  │                                                  │      ║
║  │ Fixed                                            │      ║
║  │ • Mercari: 429 errors during peak hours         │      ║
║  │                                                  │      ║
║  │ [permalink]                                       │      ║
║  └─────────────────────────────────────────────────┘      ║
║                                                            ║
║  ┌─────────────────────────────────────────────────┐      ║
║  │ v1.1.2 — 2026-05-08                              │      ║
║  │ ...                                                │      ║
║  └─────────────────────────────────────────────────┘      ║
║                                                            ║
╚══════════════════════════════════════════════════════════╝
```

### Visual accents

- **`[latest]` badge** on the most recent release — green pill, glassmorphism
- **Category headings** (Added / Changed / Fixed / Removed / Security) get tinted icons:
  - 🟢 Added — green plus
  - 🟡 Changed — yellow chevron-right
  - 🔵 Fixed — blue wrench
  - 🔴 Removed — red minus
  - 🛡 Security — purple shield
- **Each release is a card** with subtle hover effect (matches kanban cards)
- **"Subscribe to updates" CTA** at the top: button to subscribe via email or RSS

---

## Email subscribe (optional v1.1)

Add a small "Get changelog updates by email" form at the top of the page:

```tsx
<form action="/api/changelog/subscribe">
  <input type="email" name="email" placeholder="you@example.com" />
  <button>Subscribe</button>
</form>
```

When a new version ships, send the latest entry as an email digest. Use Resend with a "List-Unsubscribe" header.

**Subscriber benefits:**
- Builds a list of engaged users (high-value retargeting audience)
- Re-engagement channel for churned users (they may resubscribe when they see new features)

**Risk:** Don't blast irrelevant updates. One email per minor version, max. Not for patches.

---

## RSS feed implementation

```ts
// app/changelog/rss.xml/route.ts
export async function GET() {
  const releases = parseChangelog(); // parse CHANGELOG.md into structured data

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Flipper.ai Changelog</title>
        <link>https://<domain>/changelog</link>
        <description>What's new in Flipper.ai</description>
        ${releases.map(r => `
          <item>
            <title>${r.version} — ${r.date}</title>
            <link>https://<domain>/changelog#${r.version}</link>
            <pubDate>${new Date(r.date).toUTCString()}</pubDate>
            <description><![CDATA[${r.html}]]></description>
            <guid>${r.version}</guid>
          </item>
        `).join('')}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
```

---

## What to put in CHANGELOG.md (style guide)

You already follow Keep a Changelog conventions. Some additional rules:

1. **One bullet per change.** Not "Improved performance and added a feature and fixed bugs." Three bullets.
2. **User-facing language.** "Faster Craigslist scans (3x throughput)" beats "Refactored Playwright pool concurrency."
3. **Acknowledgments.** When a user reports a bug that ships in a fix, credit them: *"Fixed: Craigslist 'pets' category causing parser to choke (thanks @reddit_username)"*. People who get credited become advocates.
4. **Don't hide breaking changes.** If something changes that affects user workflows, lead with it under **Removed** or **Changed**.
5. **Skip internal-only changes.** Refactors, dep upgrades, CI improvements don't belong in a customer-facing changelog. Keep those in commit messages.

---

## SEO considerations

- **Each release URL** (`/changelog#v1.2.0` via fragment, or `/changelog/v1.2.0` via permalink) becomes a search-discoverable URL
- **Each release should be in the sitemap** with last-modified = release date
- **OG images** — auto-generate per release using Vercel OG Image: shows release version + headline change + Flipper.ai logo. These get shared on social.
- **Schema.org markup** — render each release as `SoftwareApplication > release` for rich-snippet eligibility:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Flipper.ai",
    "softwareVersion": "1.2.0",
    "datePublished": "2026-05-15",
    "releaseNotes": "..."
  }
  ```

---

## Linking from in-app

Where the changelog should be linked from:

- **Settings → About** ("Version 1.2.0 — what's new")
- **Footer of every page** ("Changelog" link in footer)
- **Email signature in transactional emails** ("PS — see what's new at /changelog")
- **A subtle dot indicator on the user menu** when there's a new release the user hasn't seen (track via `User.lastChangelogSeen`)

---

## Optional — Featured / pinned changes

If a release contains a particularly impactful change, pin it at the top of the changelog with a brief explanation:

```markdown
## ⭐ Highlight: Push notifications are here

Released in v1.2.0 — get instant alerts when high-value flips appear. Enable in Settings → Notifications.

[ Read the full release notes for v1.2.0 ↓ ]
```

This is just a marketing component on top of the existing `<h2>v1.2.0</h2>` block; doesn't change the data model.

---

## Maintenance discipline

For this to work, the `CHANGELOG.md` must actually be updated.

**Rule:** Every PR that ships a user-visible change must include a `CHANGELOG.md` update under `[Unreleased]`. Add a CI gate that checks this for PRs that modify `src/`, `app/`, or `prisma/` (with a manual override label `skip-changelog` for refactors).

The release workflow promotes `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD` automatically when you tag a release. (django-main already has this.)

---

## What NOT to do

- ❌ Auto-generate from commit messages. They're written for engineers, not users.
- ❌ Show only major releases. Patch releases that fix annoying bugs build trust too.
- ❌ Leave entries vague ("Various improvements"). Always be specific.
- ❌ Backfill the changelog after the fact. Stay disciplined now; backfilling is busywork.
- ❌ Charge for changelog access. The whole point is public visibility.
