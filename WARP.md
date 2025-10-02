`
# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.
``

Project type: Static single-page portfolio (HTML/CSS/vanilla JS). No package manager, build system, linter, or test runner is configured.

Commands

Local preview (choose one; both serve the current directory):
- Node (no install, via npx):
  - npx serve -n .
  - or: npx http-server -p 5173 -c-1 .
- Python (built-in module):
  - Windows: py -m http.server 5173 -b 127.0.0.1
  - macOS/Linux: python3 -m http.server 5173 -b 127.0.0.1

Then open http://127.0.0.1:5173 (or the URL shown by the server).

Build: Not required (site is static).

Lint/tests: Not configured in this repo.

Notes that affect development

- Image gallery auto-discovery: Adding files under images/ named gallery-01..gallery-30 with any of {webp,jpg,jpeg,png,gif,svg} will auto-appear in the Projects grid on reload (script.js scans on load).
- Project link badges: script.js maps specific gallery bases to external links via projectLinks. Currently, 'gallery-02' links to TraveLogy.
- Brand logo fallback: index.html references logo/brand.svg but script.js auto-falls back to brand.png/jpg/jpeg/webp if present. Keep one of these in logo/ for the header brand.
- Contact form: Submits via a mailto: link (no backend). Validation is minimal; status updates appear in #form-status.
- Dev cache-busting: Image probes append a timestamp query during development so new files appear without hard refresh.

High-level architecture

- index.html
  - Declares sections: hero (#home), about, skills, work, gallery (#gallery-grid), contact (with #contact-form), and footer.
  - Loads styles.css and script.js. Uses semantic landmarks (header/nav/main/section/footer) and ARIA where useful.
- styles.css
  - Theme via CSS custom properties; animated gradient background; glassmorphism cards; reveal-on-scroll transitions; custom cursor styles; responsive grids.
  - Gallery layout and an always-visible badge for linked projects.
- script.js
  - Progressive UI behavior using browser APIs (no dependencies):
    - IntersectionObserver to reveal .reveal elements once and to animate skill bars when the skills section enters view.
    - Custom cursor with trailing outline on pointer-precision devices; hover states for interactive elements.
    - Subtle parallax for decorative background blobs.
    - Brand logo fallback loader (tries multiple extensions under /logo).
    - Auto-gallery loader: scans images/gallery-XX.(ext) and appends figures; supports per-item external links with a visible badge.
    - Contact form handler constructing a mailto URL; resets form after triggering the client.

Deployment

- Any static host works (GitHub Pages, Netlify, Vercel, etc.). Deploy the repository contents as-is; no build step or server-side code is required.

Repository conventions

- Assets
  - Place site images in images/; gallery items must follow gallery-XX.(ext) naming to be auto-detected.
  - Place a brand.* in logo/ (prefer brand.svg; PNG/JPEG/WEBP are acceptable fallbacks).
- External resources
  - Google Fonts (Poppins) is loaded from fonts.googleapis.com.
