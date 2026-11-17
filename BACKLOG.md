# Backlog

Ideas and follow-ups for the recipe app. Newest ideas go at the top of their
section. Move an item to **Done** (with the date) when it ships.

---

## Features

### Sub-recipes (a recipe used as an ingredient)

**Idea:** A recipe can be added to another recipe as one of its ingredients.
For example, "Shepherd's Pie" lists "Mashed Potatoes", which is a recipe of its
own, alongside Ground beef and Carrots.

**What it should do**
- In the recipe editor, the ingredient search offers your recipes as well as
  index ingredients, marked so they're easy to tell apart (e.g. a small "Recipe"
  tag).
- The amount is measured in **servings of the sub-recipe** (e.g. "2 servings
  Mashed Potatoes"), or as a fraction of the batch ("½ recipe").
- **Recipe page:** the sub-recipe row links to that recipe. Ideally it can also
  be expanded inline to show its own ingredients, scaled to the amount used.
- **Nutrition:** the sub-recipe's per-serving macros roll up into the parent
  recipe's totals.
- **Groceries:** planning the parent recipe adds the sub-recipe's ingredients,
  scaled, to the grocery list. The sub-recipe never appears there as one item.
- **Pantry:** "Can make now" and "X of Y in stock" look through to the
  sub-recipe's ingredients. "I made this" deducts them from stock.
- **Scaling:** the ½× / 2× / 3× buttons on the parent also scale the
  sub-recipe's share.
- **Step labels:** step words can be labelled with the sub-recipe the same way
  as any ingredient (e.g. "spread the {{Mashed Potatoes|mash}} on top").

**Rules and edge cases**
- No loops: a recipe can't include itself, directly or through another
  sub-recipe.
- Allow nesting? Decide whether only one level is allowed or deeper nesting too.
  One level is much simpler.
- Deleting a recipe that's used as a sub-recipe should warn first and list the
  recipes that use it, the same way deleting an in-use ingredient is blocked.
- Renaming a sub-recipe must not break the parents. Store the recipe **id**, not
  its name.
- Older data has no sub-recipe rows, so nothing needs migrating. Remember to
  keep the new row type in `normalizeState` (see CLAUDE.md).

**Open questions**
- Should "I made this" on the parent ask whether you made the sub-recipe fresh,
  or used some you already had?
- Should a sub-recipe be allowed to come from the pantry as a finished item
  (e.g. leftover mashed potatoes in stock)?
- Should recipes be filterable to hide "component only" recipes (sauces, bases)
  from the main list?

**Rough technical shape** (for whoever builds it)
- Recipe ingredient rows gain a kind: `{ recipeId, quantity, measure: "serving" | "batch" }`
  next to today's `{ key, quantity, measure }`.
- Add one helper that expands a recipe into its flat ingredient list (recursing
  into sub-recipes with a scale factor). Groceries, stock coverage, macros and
  "I made this" should all use it, so they stay consistent.

### Auto-fill ingredient photo from the Walmart link
When a Walmart product URL is added and the photo is empty, grab the listing's
main image automatically. This needs a Firebase Cloud Function (Blaze plan),
because the browser can't read Walmart pages. Walmart may block it, so it must
fail quietly. The more reliable alternative is the Walmart affiliate API, which
needs approval and keys.

---

## Polish / UX

- [ ] Recipe editor: instruction boxes should grow to fit their text. Long steps
      are currently cut off.
- [ ] Recipe editor (phone): the × that removes the photo should ask "Remove?"
      first, like ingredient rows do.
- [ ] Ingredient form: decide whether Nutrition should open automatically when
      editing an ingredient that has values.
- [ ] Hook `showToast` into other actions ("Saved to stock", "Added to plan",
      "Recipe saved").
- [ ] Check the floating Save ingredient button's gap above the tab bar
      (currently 84px) on a real phone.

## Housekeeping

- [ ] Publish the Firestore rules (needed for short `XXXX-XXXX` invite codes):
      run `firebase login`, then `firebase deploy --only firestore:rules`.
- [ ] Bump the `?v=` version strings on `styles.css` / `app.js` in `index.html`
      before pushing, so phones load the new files.
- [ ] Update `README.md`: the "Kitchen stock" naming and the
      `assets/recipe-photos/` section are out of date.
- [ ] Refresh `ds-bundle/` (design-system export). It still shows the old green
      and sand theme.

---

## Done

- 2026-11-17: Icons redone with Lucide (shadcn's icon set): tab bar, heart, pencil, drag grip, arrows, chevrons, close, checks.
- 2026-11-17: Short invite codes (`XXXX-XXXX`). Code is done; needs the rules
  deploy above.
- 2026-11-17: Ingredient categories, search and aisle sections; floating Save
  ingredient button; long-press to reorder; "Remove?" confirmation; label step
  words from the recipe page; missing-ingredient tags on mobile.
