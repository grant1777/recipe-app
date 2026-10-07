# Recipe Planner design system

Tokens and plain CSS classes from a household recipe and meal-planning app. There are **no JS components**: build with ordinary HTML elements, these classes and `var(--*)` tokens. Everything comes from `styles.css`, which `@import`s `tokens/colors.css`, `tokens/typography.css` and `tokens/shape.css`. Read those four files before styling anything.

## Setup
Link `styles.css`. It sets `body` to `--surface` with `--ink` text and the `--font-sans` stack. No webfont ships: Inter is used if installed, otherwise the system UI font. Never set a white page background. Pages sit on `--surface` (#fffdf9); white (`--card`) is only for cards and inputs.

## Styling idiom
Use the `var(--*)` tokens, never raw hex values. The look is warm neutrals with forest green as the action colour, heavy (800) weights for anything interactive, and pill-shaped tags.

| Family | Tokens |
|---|---|
| Text | `--ink` (primary), `--muted` (meta, labels) |
| Surfaces | `--surface` (page), `--card` (tiles), `--panel` / `--panel-soft` (insets, tags), `--line` (borders), `--border-hover` |
| Action | `--accent` / `--accent-dark` (primary + hover), `--accent-soft` (success tint) |
| Neutral action | `--sand` / `--sand-hover` / `--sand-ink` |
| Sidebar / dark | `--forest` background, `--on-forest`, `--on-forest-muted` |
| Status | `--gold` (warning, eyebrows), `--rose`, `--sky`, `--danger-soft` + `--danger-ink` |
| Type | `--text-2xs` … `--text-xl`, `--text-display`; `--weight-heavy` (800) is the default emphasis |
| Shape | `--radius-sm` 6 / `-md` 8 (buttons, inputs) / `-lg` 12 (cards) / `-xl` 14 / `-pill` |
| Space | `--space-1` (4px) … `--space-8` (32px); `--control-height` 42px |
| Elevation | `--shadow-sm`, `--shadow-md` (hover lift), `--shadow-lg` (dialogs), `--shadow-ready` (green top rule) |

## Classes
- Buttons: `.primary-button` (green, main action), `.secondary-button` (sand), `.danger-button`, `.light-button` (on `--forest` only), `.text-button` (underlined link).
- Forms: wrap each control in `<label class="field">Label<input></label>`. `input`, `select` and `textarea` are styled globally.
- Tags: `.category-pill` (recipe category), `.stock-pill`, and `.stock-pill.is-ready` (green "can make now").
- `.ingredient-measure` is the green amount chip before an ingredient name ("1 tbsp").
- `.eyebrow` is the uppercase gold kicker above a title.
- `.recipe-unlinked-alert` is a round gold "!" badge for anything that needs attention.
- Recipe tile: `.recipe-catalogue-card` (add `.is-ready` for the green state) containing `.recipe-catalogue-visual`, `.recipe-catalogue-body` (`.recipe-catalogue-tags`, `strong` title, meta `span`) and `.recipe-catalogue-open`.

## Example
```html
<p class="eyebrow">This week</p>
<h2 style="font-size:var(--text-display);margin:0 0 var(--space-6)">Recipes</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--space-6)">
  <div class="recipe-catalogue-card is-ready">
    <span class="recipe-catalogue-visual">S</span>
    <span class="recipe-catalogue-body">
      <span class="recipe-catalogue-tags"><span class="category-pill">Drink</span><span class="stock-pill is-ready">✓ Can make now</span></span>
      <strong>Strawberry Smoothie</strong>
      <span>4 ingredients · 2 steps · Serves 2</span>
    </span>
    <span class="recipe-catalogue-open">View recipe →</span>
  </div>
</div>
<button class="primary-button" type="button">Add recipe</button>
```
