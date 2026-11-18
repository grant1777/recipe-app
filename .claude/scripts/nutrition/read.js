// READ-ONLY. Backs up the household document and lists ingredients with no
// calories, protein, carbs or fat.  Usage: node read.js [--household <id>]
const { WORK_DIR, plain, resolveHousehold, isBlank, path, fs } = require("./lib");

(async () => {
  const { id, doc, count } = await resolveHousehold();
  const data = plain({ mapValue: { fields: doc.fields } });
  fs.writeFileSync(path.join(WORK_DIR, "household.json"), JSON.stringify({ id, updateTime: doc.updateTime, data }, null, 1));

  const blank = Object.values(data.ingredients || {}).filter(isBlank).sort((a, b) => a.name.localeCompare(b.name));
  console.log(`Household ${id}: ${count} ingredients, ${blank.length} with no calories/protein/carbs/fat`);
  for (const i of blank) console.log(` - ${i.name} | serving "${i.serving}" | ${i.url ? i.url : "no link"}`);
  console.log(`\nBackup: ${path.join(WORK_DIR, "household.json")}`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
