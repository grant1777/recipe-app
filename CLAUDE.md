# Household Recipe Planner

A household recipe, meal-planning, grocery and pantry app. Households share one
Firestore document; members sign in with GitHub. It is used mostly **on phones**,
so treat mobile layout as the primary target and desktop as secondary.

## Stack — keep it this way

- **Vanilla HTML/CSS/JS. No framework, no bundler, no build step.** Do not add
  React, Tailwind, TypeScript or npm runtime dependencies.
- Static hosting (GitHub Pages, repo `grant1777/recipe-app`). Firebase project
  `recipe-app-f3374` provides Auth (GitHub), Firestore and Storage. The Firebase
  SDK is loaded at runtime from `gstatic.com` via dynamic `import()` in `app.js`.
- There are no Cloud Functions, so the browser cannot fetch other sites (CORS).
  For example, Walmart product pages can't be scraped client-side.
- Run locally with `npm start` (`serve.js`, no dependencies) → http://127.0.0.1:8000. It serves `index.html` for any app path. Auth redirects fail on `file://`.
- Tests: `npm test` (Node's built-in runner; it covers only `receipt-import.js`).
  Quick syntax check after JS edits: `node --check app.js`.

## Files

| File | What it holds |
|---|---|
| `index.html` | All markup. Every page is a `<section class="view" id="<name>-view">`, and only `.view.active` shows. Also holds dialogs, the tab bar and an inline pre-paint theme script. |
| `app.js` (~7k lines) | All app logic in one file of global functions. Find code with Grep; don't read it top to bottom. |
| `styles.css` (~9k lines) | All styles. Later rules intentionally override earlier ones. Mobile overrides live in `@media (max-width: 680px)` blocks, and several of those blocks exist. |
| `icons.js` | Lucide icon registry (the icon set shadcn/ui uses) plus `icon(name)`, which returns inline `<svg>` markup. Loaded before `app.js`. |
| `receipt-import.js` | Walmart receipt parser (pure functions, tested). |
| `firestore.rules`, `storage.rules` | Access rules: an approved-user gate plus household membership. |
| `firebase-config.js` | Public web config. |
| `ds-bundle/`, `.design-sync/` | Design-system export. **Outdated** (it describes an old green/sand theme). Mirror token changes there only if asked. |
| `README.md` | Setup docs. Parts are outdated, e.g. `assets/recipe-photos/` no longer exists. |

**Cache busting:** `index.html` loads `styles.css?v=…` and `app.js?v=…`. Bump the
version string when shipping CSS or JS changes, or phones may keep stale files.

## Pages (tabs)

Plan · Recipes (list → recipe page → editor) · Groceries · Pantry (`kitchen-stock`)
· Ingredients (the ingredient index) · Nutrition (`macros`, hidden when the user
turns nutrition off) · Settings (opened from the avatar). Each page has a real
path (`/recipes`, `/pantry`, `/recipes/<name>/edit`, …) handled by `syncRoute`,
`applyRoute`, `currentRoutePath` and the `viewSlugs` map. It's still one page:
every path serves `index.html` (`404.html` on GitHub Pages, a rewrite in
`firebase.json` for Firebase Hosting, `serve.js` locally). A head script in
`index.html` sets `<base>` and `window.appBasePath` (`/` or `/recipe-app/`), so
asset URLs stay relative. Old `#recipes` links are converted on load. A new
top-level page needs its slug added to the route lists in the `index.html` head
script, in `404.html` and in `viewSlugs`. Tab clicks go through `openTabHome(tab)`. Clicking the
Ingredients tab resets the ingredient form.

## Data model and saving

- `state` = `{ recipes[], ingredients{key→ingredient}, kitchenStock{}, stockReceiptImports, nutrition, planners }`,
  stored as fields on **one** doc, `households/{id}`. The size limit is 1 MB
  (`approximateStateSize` warns before then).
- To save: mutate `state`, then call `saveState()` (fire-and-forget) or
  `await saveCloudState(msg)`, then `renderAll()`. Guard writes with
  `requireCloudWrite()`.
- **Gotcha:** on load, `normalizeState` and `normalizeIngredientCatalog` rebuild
  every ingredient field by field and drop unknown fields. When adding a field to
  ingredients (or recipes), add it to the normalizer too, or it vanishes on reload.
- Ingredients are keyed by `ingredientKey(name)`. Recipe ingredient rows reference
  them by `key`. Steps can carry labels written as `{{Ingredient#n|words}}`
  (`parseStepTags`, `serializeStepTags`, `highlightIngredientMentions`).
- Photos are uploaded to Storage under `households/{id}/{kind}/{id}.ext`, 2 MB max.

## Conventions

- Rendering is template strings plus `innerHTML`, then event listeners are bound
  afterwards. **Escape every interpolated value with `escapeHtml()`.**
- Reuse the existing helpers:
  - `showToast(msg, { tone: "error" })` for notifications.
  - `bindConfirmRemove(button, { isEmpty, onRemove, title, message })` for a
    "Remove?" confirmation, or `await confirmAction({ title, message, confirmLabel })`
    directly. Both show the centered `#confirm-dialog`.
  - `makeRowsSortable(container, …)` for drag reordering (touch needs a short hold).
  - `optionMarkup` for `<select>` options.
  - `formatQuantity` and `parseFractionInput` for amounts.
- Wrap `localStorage` in try/catch. It holds only per-device preferences (theme
  mode, colour theme).
- **Icons are Lucide only.** Use `${icon("name")}` in templates. In CSS pseudo-elements, mask a `--icon-*` variable over `currentColor` (see the Icons section at the end of `styles.css`). To add an icon, copy its inner markup from `lucide-static` into `icons.js` (and add a `--icon-*` variable if CSS needs it). Never hand-draw SVGs or use text glyphs (← › ▾ × ✓) as icons.
- Prefer `<details>`/`<summary>` for collapsible sections. Long optional sections
  start closed.
- HTML `pattern` attributes are compiled with the regex `v` flag, so escape `/`,
  `-`, `(`, `)`, `[`, `]`, `{`, `}` and `|` inside character classes
  (e.g. `[0-9\/ .]+`).
- Write code comments that explain *why*, matching the existing style.
- Don't show standing hints for rare limits (e.g. "max 2 MB"). Raise a toast only
  when the limit is actually hit.

## Visual design

- **Tokens:** use `var(--*)` from `:root` at the top of `styles.css`; never use raw
  hex. Ink text (`--ink`, `--ink-soft`, `--muted`, `--faint`), lilac surfaces
  (`--surface`, `--card`, `--panel`, `--panel-soft`, `--line`), a pink primary
  (`--pink`, `--pink-ink`, `--accent` for accented text), `--mint` for success and
  `--danger-soft`/`--danger-ink` for errors.
- **Fonts:** `--font-display` (Gloock) for headings, `--font-sans` (Instrument
  Sans) for UI.
- **Themes:** colour themes (`data-color-theme`, default `petal`) and dark mode
  (`data-theme-mode`) redefine the tokens, so components never hard-code colours.
- **Shapes:** pill buttons (`.primary-button`, `.secondary-button`, `.text-button`,
  `.danger-button`), pill `.filter-chip`s, cards with a ~20px radius, `.eyebrow`
  kickers above headings.
- **Phones (≤680px):**
  - 20px side gutters.
  - A fixed bottom tab bar. Pages with their own actions (recipe page, editor,
    Settings) swap it for a fixed action bar.
  - Floating elements must clear the bar (~84px plus `env(safe-area-inset-bottom)`).
  - The user cares about tight vertical space: put controls on images, use icon
    buttons in corners and collapse optional sections.
  - Check for cut-off button text and missing padding inside bordered cards.

### UI reference: shadcn/ui

Use **https://ui.shadcn.com/** as the reference for component *behaviour,
anatomy and accessibility* (Dialog, Alert Dialog, Sheet, Collapsible, Accordion,
Tabs, Combobox/Command, Toast/Sonner, Dropdown Menu, Popover, Toggle Group).
shadcn is React + Tailwind and this app is neither, so **translate the pattern to
semantic HTML plus this app's classes and tokens**. Never paste shadcn code or
add its dependencies. Borrow its interaction details (focus handling,
keyboard support, ARIA roles, enter/exit states, spacing rhythm). Keep this app's
own look.

## Working here

- Most requests come as phone screenshots with short asks ("fix padding",
  "make this collapsible"). Find the page's markup in `index.html` and its render
  function in `app.js`, then fix the mobile CSS first.
- Before adding a CSS rule, Grep for every existing rule on that selector, because
  later or more specific rules often override earlier ones.
- After a change, run `node --check app.js`, and `npm test` if `receipt-import.js`
  changed. Say plainly what you could not verify visually.
- Commit only when asked.
