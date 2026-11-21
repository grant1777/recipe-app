# Backlog

Ideas and follow-ups for the recipe app. Newest ideas go at the top of their
section. Move an item to **Done** (with the date) when it ships.

---

## Features

### Sub-recipe follow-ups
The sub-recipe feature shipped 2026-11-20 (nesting allowed, loops blocked,
deleting a used recipe is blocked). Still open:
- Should "I made this" on the parent ask whether you made the sub-recipe fresh,
  or used some you already had? (Today it always deducts the sub-recipe's
  ingredients.)
- Should a sub-recipe be allowed to come from the pantry as a finished item
  (e.g. leftover mashed potatoes in stock)?
- Should recipes be filterable to hide "component only" recipes (sauces, bases)
  from the main list?

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

- 2026-11-20: Sub-recipes: a recipe can be an ingredient of another (servings or
  whole recipe), rolled into groceries, nutrition, pantry coverage and "I made
  this". New "Protein" recipe category, shown as its own "Protein recipes"
  section when building a plate's protein.
- 2026-11-17: Icons redone with Lucide (shadcn's icon set): tab bar, heart, pencil, drag grip, arrows, chevrons, close, checks.
- 2026-11-17: Short invite codes (`XXXX-XXXX`). Code is done; needs the rules
  deploy above.
- 2026-11-17: Ingredient categories, search and aisle sections; floating Save
  ingredient button; long-press to reorder; "Remove?" confirmation; label step
  words from the recipe page; missing-ingredient tags on mobile.
