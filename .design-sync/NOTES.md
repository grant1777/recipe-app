# Design sync notes

- This repo is a vanilla HTML/CSS/JS app with no component library, Storybook or build output. The user chose a **tokens-only** sync (2026-10-07): tokens + reusable CSS classes + hand-authored preview cards, built by hand into `ds-bundle/` instead of with the converter.
- `package-validate.mjs` does not apply (it requires `_ds_bundle.js`). Cards were verified by screenshotting each one with headless Edge (`msedge --headless=new --screenshot`). Playwright is not installed.
- No `_ds_sync.json` anchor is written, because the converter's hash recipe needs a bundle. Every re-sync re-verifies and re-uploads everything, which takes seconds at this size.
- Form inputs render at weight 800 because they inherit the label weight. The app does the same, so this is intentional.
- When the app's `styles.css` changes (new colours, pill styles, etc.), mirror it in `ds-bundle/styles.css` + `ds-bundle/tokens/*.css` and re-run the sync.
