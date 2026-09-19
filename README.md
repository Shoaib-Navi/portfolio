# Mohd Shoaib — Portfolio

Next.js + TypeScript + plain CSS. No other runtime dependencies.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

`npm run build` clears `NODE_ENV` first, because a global `NODE_ENV=development` breaks Next.js production builds.

## Editing content

All text, links and numbers live in `src/data/profile.ts`. Pages read from that file only.

Images: the portrait is `public/pfp/`, project screenshots are `public/shots/` and listed on each
project's `shots` array, e.g. `shots: ["/shots/hirestream.webp", "/shots/hirestream-2.webp"]`.
One image shows on its own; several turn into a carousel with arrows, dots and a counter.
While the array is empty, the card and the write-up show a "No screenshot yet" placeholder.

## Layout (same structure as the reference site)

Home: hero → About → Toolbox → Experience → Selected work → The rest of it → Contact → footer.

`/about`, `/skills`, `/experience` and `/contact` are real routes that render the same page and open
at that section — no `#` fragments. `/work` is the project index and `/work/<slug>` each write-up.

## Features

- Fixed bar (monogram, section routes, light/dark toggle, résumé download) that grows a border once you scroll.
- Theme choice saved in `localStorage` and applied before paint, so there is no flash.
- Mobile menu drawer: burger button, backdrop, Escape to close, background scroll locked.
- Hero entrance animation, drifting grid, pulsing glow and a light that follows the mouse.
- Stat numbers count up when scrolled into view.
- Reveal-on-scroll for sections and cards.
- Custom trailing cursor on devices with a mouse.
- Résumé served from `public/resume.pdf`; replace that file to update it.
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
  components/             HomeView, Bar, ThemeToggle, Cursor, SiteFX, ScrollToSection, Experience,
                          Shots, Tools, SectionHead, Rich, BackToTop, Footer, DocFoot
  data/profile.ts         all content
  lib/                    theme, motion, scroll, sections and site-url helpers
```

## Deploy

Push to GitHub and import the repo on Vercel. Add `NEXT_PUBLIC_SITE_URL` in the project settings.
