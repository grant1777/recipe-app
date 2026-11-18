---
description: Fill in missing ingredient nutrition from the linked Walmart product labels, with a review before anything is saved
argument-hint: "[ingredient names, comma-separated (optional)]"
allowed-tools: Bash(node .claude/scripts/nutrition/read.js:*), Bash(node .claude/scripts/nutrition/fetch.js:*), Read
---

Fill in nutrition for household ingredients that have none, using the nutrition
label on each ingredient's linked Walmart product page.

Scope: $ARGUMENTS
(If that's empty, do every ingredient with no nutrition. Otherwise only the named ones.)

The scripts are in `.claude/scripts/nutrition/`. Backups and proposals go to
`.claude/nutrition-work/` (gitignored; it holds household data). They use the
Firebase CLI's saved sign-in. If a script says the sign-in expired, run
`firebase projects:list` once to refresh it, then retry.

## 1. Read (no changes)

Run `node .claude/scripts/nutrition/read.js`. It backs up the household and lists
ingredients whose calories, protein, carbs and fat are all 0. Tell the user how
many there are.

## 2. Fetch the labels (no changes)

Run `node .claude/scripts/nutrition/fetch.js`, or with `--only "Name A,Name B"`
when the scope above names ingredients. It visits each Walmart link a few seconds
apart and writes `.claude/nutrition-work/proposals.json`. If it stops because
Walmart is blocking requests, report that and stop; don't retry in a loop.

Read `proposals.json` and check each "ok" row before showing it:
- `productName` must match the ingredient. A wrong link (a toy, a different
  product, whole eggs for "Egg yolk") gets flagged and left out.
- The numbers must make sense for the serving. Calories should roughly equal
  4×protein + 4×carbs + 9×fat, and oils should be about 120 cal/tbsp. Use
  `rawLabel` to see what the label actually printed.
- `notes` lists values converted from a %DV. Mention them only if they look odd.

## 3. Review with the user

Show one table: ingredient, serving, servings per container, calories, protein,
carbs and fat, plus a flag column. Below it, list:
- flagged rows and why;
- ingredients with "no label". Walmart often has none for fresh produce, spices
  and some staples. The user can enter these from the package.

Then ask which rows to write. Don't write anything until the user says yes in
this conversation.

## 4. Write (only after approval)

Run `node .claude/scripts/nutrition/write.js --skip "Flagged A,Flagged B"`, with
every row the user didn't approve in `--skip`. It isn't pre-approved, so the user
gets a permission prompt; that prompt is the point. Run it on its own, never
batched with other tool calls.

The script:
- backs up the household right before writing;
- updates only the approved ingredients' serving size, servings per container
  and nutrients, keeping names, photos, links and categories;
- skips any ingredient that gained nutrition since the read;
- fails safely if the household changed mid-run (Firestore precondition).

Afterwards, run `read.js` again and report what's still missing. Some products
really are 0 on every macro (baking soda, lime juice), so they'll still be
listed. That's expected. Give the path of the before-write backup in case
anything needs restoring.
