# Mohd Shoaib — Portfolio

Live: https://mohd-shoaib.vercel.app

Next.js + TypeScript + plain CSS. The only other runtime dependency is `unpdf`, used by the
admin dashboard to read résumé PDFs.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

`npm run build` clears `NODE_ENV` first, because a global `NODE_ENV=development` breaks Next.js production builds.

## Editing content

All text, links and numbers live in `content/*.json`. `src/data/profile.ts` validates them at build
time (a bad edit fails the build instead of reaching the site) and pages read from that file only.
Edit the JSON by hand, or use the admin dashboard below.

Images: the portrait is `public/pfp/`, project screenshots are `public/shots/` and listed on each
project's `shots` array, e.g. `shots: ["/shots/hirestream.webp", "/shots/hirestream-2.webp"]`.
One image shows on its own; several turn into a carousel with arrows, dots and a counter.
While the array is empty, the card and the write-up show a "No screenshot yet" placeholder.

## Admin dashboard (`/admin`)

A private editor for everything on the site: profile and hero, photo, projects (with screenshots),
experience, skills with logos, education and awards, résumé versions, and a media library.

**How saving works.** "Save draft" records edits in a draft; nothing changes on the live site until
you press **Publish**, which writes every pending change as one commit.

- **On Vercel (GitHub mode)**: drafts are commits on an `admin-draft` branch. Publishing lays the
  changed files over the current `main` in a single new commit (code pushed meanwhile is kept), and
  Vercel deploys it like any push. The Publish page shows a diff, follows the deploy, and can roll
  back a previous content commit.
- **Locally (no `GITHUB_TOKEN`)**: drafts live in `.admin-draft/` (gitignored) and publishing copies
  them into `content/` and `public/`. Review with `git diff` and commit as usual.

**Set up**

1. `npm run admin:hash -- "a long password"` prints `ADMIN_PASSWORD_HASH` and `SESSION_SECRET`.
2. Put them, plus `ADMIN_USER`, in `.env.local` (see `.env.example`) and open
   http://localhost:3000/admin.
3. For production, add the same three to the Vercel project, plus `GITHUB_TOKEN` (fine-grained PAT,
   this repo only, *Contents: read and write*, optionally *Commit statuses: read*) and `GITHUB_REPO`.

**Rules it enforces**: entries marked unverified never reach the site; slugs are unique and locked
once live; links must be https; images are converted to WebP in the browser (portrait 4:5 like the About section,
screenshots max 1600px wide); logos come from devicon or an uploaded SVG, which is rejected if it
contains scripts, event handlers or external references. The live résumé is always served at
`/resume.pdf`; the résumé page flags a phone number, a missing text layer, and claims that disagree
with the site.

**Security**: `proxy.ts` redirects signed-out visitors, and every page and server action checks the
session again. Passwords are scrypt-hashed; the session is an HMAC-signed, httpOnly, SameSite=Strict
cookie (8 hours); sign-in is throttled. The GitHub token stays on the server and can only write
`content/` and the managed `public/` folders. `/admin` is `noindex` and disallowed in `robots.txt`.

## Analytics (`/admin/analytics`)

First-party and cookieless, so no consent banner is needed. Each page view and click
(résumé download, outbound links such as GitHub or a live demo) is sent to `/api/t`, which
drops bots, your own visits while signed in to the admin, and visitors with Do Not Track or
Global Privacy Control on. Stored: counts per day (pages, sources, countries, devices), a
visitor hash that rotates daily (for unique counts; never the IP or user agent), and the last
100 hits for the activity feed.

**Tracking links**: create one per application (`/go/acme-backend`). The open is recorded on
the server and the visitor is redirected to the page you chose, so the link also works inside
the résumé PDF. Visits through it, pages viewed and résumé downloads are credited to that
link, so you can tell when that company opened your portfolio. Unknown codes redirect to the
home page. Link names are stored in the analytics database, not in this (public) repository.
Older `/?ref=acme-backend` links still count.

**Set up on Vercel**: Storage → Create Database → *Upstash for Redis* (free plan), connect it
to the project and redeploy. It adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Locally, data
goes to `.analytics/` (gitignored); open the site in a private window to see your own test
visits.

## Case studies

A project can carry a `caseStudy` in `content/projects.json`: headed sections written in a small
Markdown subset, with an optional architecture diagram. It renders below the write-up on
`/work/<slug>` and gets its own entry in the command palette. A case study has its own
`verified` flag: while it is `false` the text shows in `npm run dev` and in the admin for
review, and is left out of every production build.

## Project status (`/api/status`)

Each write-up page shows a small status panel, loaded after the page so the page itself stays
static. It reports only what was actually checked: whether the live demo answered (HTTP status
and response time) and when the public repository was last pushed. Projects without public
links report nothing. The response is cached at the edge for ten minutes, so visitors never
fan out into requests to the demo sites or GitHub. `GITHUB_TOKEN`, when set, is used for the
repository lookup to avoid GitHub's anonymous rate limit.

## Tests

`npm test` runs the unit tests (validators, upload checks, résumé checks, sessions, the GitHub
store against a fake API, analytics, status checks and the Markdown renderer).

## Layout (same structure as the reference site)

Home: hero → About → Toolbox → Experience → Selected work → The rest of it → Contact → footer.

`/about`, `/skills`, `/experience` and `/contact` are real routes that render the same page and open
at that section — no `#` fragments. `/work` is the project index and `/work/<slug>` each write-up.

## Features

- Fixed bar (monogram, section routes, light/dark toggle, résumé download) that grows a border once you scroll.
- Command palette (Ctrl/Cmd + K, or the search button in the bar): jump to a project, case study or section, download the résumé, copy the email address, switch theme or open a profile link.
- Theme choice saved in `localStorage` and applied before paint, so there is no flash.
- Mobile menu drawer: burger button, backdrop, Escape to close, background scroll locked.
- Hero entrance animation, drifting grid, pulsing glow and a light that follows the mouse.
- Stat numbers count up when scrolled into view.
- Reveal-on-scroll for sections and cards.
- Custom trailing cursor on devices with a mouse.
- Résumé served from `public/resume.pdf`; replace it from `/admin/resume` (or swap the file by hand).
- Experience: sticky role index on the left, cards on the right; the index highlights the role in view, clicking one scrolls to it and flashes it. On phones the index is replaced by tap-to-expand cards.
- Work: full-width project rows that alternate image and text, each linking to a write-up page with a screenshot carousel and a sticky "Built with" sidebar.
- Toolbox rows with technology logos (`public/logos`), falling back to plain chips where no logo exists.
- `sitemap.xml`, `robots.txt` and a generated OpenGraph image.
- Every animation respects `prefers-reduced-motion`, and the page still reads with JavaScript off.

## Before deploying

On Vercel the canonical URL is detected from the deployment, so no configuration is needed.
When self-hosting, or to pin a custom domain, set:

```
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

Without either, metadata, `sitemap.xml` and `robots.txt` fall back to `http://localhost:3000` (local dev only).

## Structure

```
src/
  app/
    layout.tsx            fonts, metadata, theme script
    [section]/page.tsx    /about, /skills, /experience, /contact
    error.tsx             error boundary
    page.tsx              home: hero, about, toolbox, experience, work, credentials, contact
    work/page.tsx         work index
    work/[slug]/page.tsx  project write-up pages
    not-found.tsx
    globals.css           design tokens and all styles
    opengraph-image.tsx   social preview image
    sitemap.ts / robots.ts
    icon.svg
  components/             HomeView, Bar, BarClient, CommandPalette, ThemeToggle, Cursor, SiteFX,
                          ScrollToSection, Experience, Shots, Tools, SectionHead, Rich, BackToTop,
                          Footer, DocFoot, ProjectArticle, ArchitectureDiagram, ProjectHealth,
                          AnalyticsTracker
  app/api/                /api/t (analytics hits) and /api/status (project status)
  app/go/[code]/          tracking-link redirects
  app/admin/              dashboard pages, server actions, draft-file route
  components/admin/       dashboard UI
  data/profile.ts         validates content/*.json and exports it to pages
  lib/content/schema.ts   content types and validators (shared by build and admin)
  lib/admin/              auth, storage (GitHub / local), upload and résumé checks
  lib/analytics/          visit recording (Upstash Redis on Vercel, files locally)
  lib/                    theme, motion, scroll, sections, status, markdown and site-url helpers
  proxy.ts                /admin sign-in gate
content/                  all site text, links and numbers (JSON)
```

## Deploy

Hosted on Vercel and connected to this repository: pushes to `main` deploy automatically.
`npx vercel --prod` deploys the working tree without a push.
