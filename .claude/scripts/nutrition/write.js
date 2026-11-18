// WRITES to Firestore. Applies proposals.json (from fetch.js) to the household:
// for each "ok" row it sets serving, servingsPerContainer and the label's
// nutrients, keeping every other field of that ingredient.
//   node write.js [--skip "Name A,Name B"] [--household <id>]
// Saves a backup right before writing; Firestore refuses the write if the
// household changed after that read. Rows that gained nutrition since are skipped.
const { BASE, WORK_DIR, authHeaders, arg, resolveHousehold, path, fs } = require("./lib");

const skip = new Set((arg("skip") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
const proposals = JSON.parse(fs.readFileSync(path.join(WORK_DIR, "proposals.json"), "utf8"))
  .filter((row) => row.status === "ok" && !skip.has(row.name.toLowerCase()));

const numberValue = (n) => (Number.isInteger(n) ? { integerValue: String(n) } : { doubleValue: n });
// Ingredient keys contain spaces, so field paths need backticks.
const fieldPath = (key) => `ingredients.\`${key.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\``;
const num = (v) => Number(v?.integerValue ?? v?.doubleValue ?? 0);

(async () => {
  const { id, doc } = await resolveHousehold();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(WORK_DIR, `before-write-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(doc, null, 1));

  const ingredients = doc.fields.ingredients?.mapValue?.fields || {};
  const changed = {};
  for (const row of proposals) {
    const current = ingredients[row.key];
    if (!current) {
      console.log(`skip (not in household): ${row.name}`);
      continue;
    }
    const fields = { ...current.mapValue.fields };
    if (["calories", "protein", "carbs", "fat"].some((k) => num(fields[k]))) {
      console.log(`skip (already has nutrition): ${row.name}`);
      continue;
    }
    if (row.serving) fields.serving = { stringValue: row.serving };
    if (row.servingsPerContainer > 0) fields.servingsPerContainer = numberValue(row.servingsPerContainer);
    for (const [key, value] of Object.entries(row.nutrients)) fields[key] = numberValue(value);
    changed[row.key] = { mapValue: { fields } };
    console.log(`update: ${row.name} -> ${fields.serving?.stringValue}, ${Object.keys(row.nutrients).length} nutrients`);
  }

  const keys = Object.keys(changed);
  if (!keys.length) return console.log("Nothing to write.");
  const params = new URLSearchParams();
  keys.forEach((key) => params.append("updateMask.fieldPaths", fieldPath(key)));
  params.append("currentDocument.updateTime", doc.updateTime);
  const res = await fetch(`${BASE}/households/${id}?${params}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ fields: { ingredients: { mapValue: { fields: changed } } } })
  });
  if (!res.ok) throw new Error(`Write failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  console.log(`\nWrote ${keys.length} ingredients to household ${id}.\nBackup from just before: ${backupFile}`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
