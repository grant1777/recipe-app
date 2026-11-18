// Makes no Firestore changes. For each blank ingredient in the last read.js
// backup that has a Walmart link, reads the product page's nutrition label and
// converts it to the app's fields. Writes proposals.json in the work folder.
//   node fetch.js                 every blank ingredient with a link
//   node fetch.js --only "A,B"    just these ingredient names
const { WORK_DIR, arg, isBlank, path, fs } = require("./lib");

const backup = JSON.parse(fs.readFileSync(path.join(WORK_DIR, "household.json"), "utf8"));
const only = arg("only") ? new Set(arg("only").split(",").map((s) => s.trim().toLowerCase())) : null;
const targets = Object.values(backup.data.ingredients || {})
  .filter((i) => i.url && isBlank(i) && (!only || only.has(i.name.toLowerCase())))
  .sort((a, b) => a.name.localeCompare(b.name));

// Walmart abbreviates freely ("Total Carb.", "Vit. D", "Potas.", "Incl." for added sugars).
const labelMap = [
  [/^calories$/i, "calories", ""],
  [/^protein$/i, "protein", "g"],
  [/^total carb/i, "carbs", "g"],
  [/^total fat$/i, "fat", "g"],
  [/^(dietary )?fiber$/i, "fiber", "g"],
  [/^(includes? |incl\.?)?(\d+g )?added sugars?|^incl\.?$/i, "sugar", "g"],
  [/^sodium$/i, "sodium", "mg"],
  [/^iron$/i, "iron", "mg"],
  [/^calcium$/i, "calcium", "mg"],
  [/^potas(sium|\.)?$/i, "potassium", "mg"],
  [/^magnesium$/i, "magnesium", "mg"],
  [/^zinc$/i, "zinc", "mg"],
  [/^vit(amin|\.)? ?a$/i, "vitaminA", "mcg"],
  [/^vit(amin|\.)? ?c$/i, "vitaminC", "mg"],
  [/^vit(amin|\.)? ?d$/i, "vitaminD", "mcg"],
  [/^vit(amin|\.)? ?b12$/i, "vitaminB12", "mcg"],
  [/^folate|^folic acid/i, "folate", "mcg"]
];

// FDA Daily Values, for labels that give only a percentage.
const dailyValues = { iron: 18, calcium: 1300, potassium: 4700, magnesium: 420, zinc: 11, vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminB12: 2.4, folate: 400, sodium: 2300, fiber: 28, sugar: 50 };
const unitScale = { g: 1, mg: 0.001, mcg: 0.000001 };

function parseLine(name, amountText, dvpText) {
  const rule = labelMap.find(([re]) => re.test(String(name).trim()));
  if (!rule) return null;
  const [, key, unit] = rule;
  const amount = String(amountText ?? "").trim();
  const pct = (text) => {
    const p = String(text || "").match(/([\d.]+)\s*%/);
    return p && dailyValues[key] ? (Number(p[1]) / 100) * dailyValues[key] : null;
  };

  const withUnit = amount.match(/^(<\s*)?([\d.]+)\s*(mcg|µg|mg|g|iu)$/i);
  if (withUnit) {
    let value = Number(withUnit[2]);
    if (withUnit[1]) value /= 2; // "<1g" means somewhere under 1 g.
    const from = withUnit[3].toLowerCase().replace("µg", "mcg");
    if (from === "iu") return key === "vitaminD" ? { key, value: value / 40 } : null; // Vitamin A IU depends on source.
    if (unit && from !== unit && unitScale[from] && unitScale[unit]) value = (value * unitScale[from]) / unitScale[unit];
    return { key, value };
  }
  if (key === "calories") {
    const n = amount.match(/[\d.]+/);
    return n ? { key, value: Number(n[0]) } : null;
  }
  // "4%" or a bare "4": older labels list vitamins and minerals as %DV.
  if (/^[\d.]+%?$/.test(amount)) {
    const value = pct(amount.includes("%") ? amount : `${amount}%`);
    if (value !== null) return { key, value, fromPercent: true };
  }
  const fromDvp = pct(dvpText);
  return fromDvp !== null ? { key, value: fromDvp, fromPercent: true } : null;
}

function readLabel(nf) {
  const raw = [];
  const nutrients = {};
  const notes = [];
  const visit = (n) => {
    if (!n) return;
    const main = n.mainNutrient || n;
    if (main?.name) {
      raw.push(`${main.name}: ${main.amount ?? ""}${main.dvp ? ` (${main.dvp})` : ""}`);
      const parsed = parseLine(main.name, main.amount, main.dvp);
      if (parsed && nutrients[parsed.key] === undefined) {
        nutrients[parsed.key] = Math.round(parsed.value * 100) / 100;
        if (parsed.fromPercent && parsed.value) notes.push(`${parsed.key} from %DV`);
      }
    }
    (main?.childNutrients || []).forEach(visit);
    (n.childNutrients || []).forEach(visit);
  };
  visit(nf.calorieInfo);
  (nf.keyNutrients?.values || []).forEach(visit);
  (nf.vitaminMinerals?.values || nf.vitaminMinerals?.childNutrients || []).forEach(visit);
  return { nutrients, notes, raw };
}

const knownUnits = ["tsp", "tbsp", "cup", "oz", "fl oz", "g", "ml", "piece", "slice", "can", "package", "scoop", "clove", "egg", "lb", "kg", "l"];
const unitAliases = { tbs: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp", teaspoon: "tsp", teaspoons: "tsp", cups: "cup", pieces: "piece", slices: "slice", ounce: "oz", ounces: "oz", "fl. oz": "fl oz", grams: "g", gram: "g", eggs: "egg", cloves: "clove" };
const fractions = { "1/8": "⅛", "1/4": "¼", "1/3": "⅓", "1/2": "½", "2/3": "⅔", "3/4": "¾" };

// "1/8 tsp. (0.6g)" -> "⅛ tsp"; "4oz (112g)" -> "4 oz"; "1 Link (56g)" -> "56 g".
function toAppServing(text) {
  const rawText = String(text || "").trim();
  let serving = null;
  const lead = rawText.match(/^(about\s+)?([\d\s./]+?)\s*([a-z][a-z .]*?)\.?\s*(\(|$)/i);
  if (lead) {
    let unit = lead[3].trim().toLowerCase().replace(/\.$/, "");
    unit = unitAliases[unit] || unit;
    if (knownUnits.includes(unit)) serving = `${lead[2].trim()} ${unit}`;
  }
  if (!serving) {
    const paren = rawText.match(/\(([\d.]+)\s*(g|ml)\)/i);
    if (paren) serving = `${paren[1]} ${paren[2].toLowerCase()}`;
  }
  return serving ? serving.replace(/^(\d+)\/(\d+)/, (m) => fractions[m] || m) : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const outFile = path.join(WORK_DIR, "proposals.json");
  const results = [];
  for (const [index, item] of targets.entries()) {
    const id = (item.url.match(/\/ip\/(?:[^/]+\/)?(\d+)/) || [])[1];
    const row = { key: item.key, name: item.name, url: item.url };
    try {
      if (!id) throw new Error("no product id in link");
      const res = await fetch(`https://www.walmart.com/ip/${id}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });
      const html = await res.text();
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!m) {
        row.status = /robot or human|px-captcha/i.test(html) ? "blocked" : `no data (HTTP ${res.status})`;
      } else {
        const data = JSON.parse(m[1]).props?.pageProps?.initialData?.data;
        row.productName = data?.product?.name || null;
        const nf = data?.idml?.nutritionFacts;
        if (!nf) row.status = "no label";
        else {
          const info = Object.fromEntries((nf.servingInfo?.values || []).map((v) => [v.name, v.value]));
          row.labelServing = info["Serving Size"] || null;
          row.serving = toAppServing(info["Serving Size"]);
          const spc = String(info["Servings Per Container"] || "").replace(/,/g, "").match(/[\d.]+/);
          row.servingsPerContainer = spc ? Number(spc[0]) : null;
          Object.assign(row, readLabel(nf));
          row.status = Object.keys(row.nutrients).length ? "ok" : "no label";
        }
      }
    } catch (error) {
      row.status = `error: ${error.message}`;
    }
    results.push(row);
    fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
    const n = row.nutrients || {};
    console.log(`${index + 1}/${targets.length} ${row.status.padEnd(10)} ${row.name} | product: ${row.productName || "-"} | ${row.serving || "-"} | ${n.calories ?? "-"} cal ${n.protein ?? "-"}p ${n.carbs ?? "-"}c ${n.fat ?? "-"}f`);
    // Two blocked pages in a row means Walmart has noticed; stop rather than push on.
    if (results.length >= 2 && results.slice(-2).every((r) => r.status === "blocked")) {
      console.log("Stopping: Walmart is blocking requests. Try again later.");
      break;
    }
    if (index < targets.length - 1) await sleep(2500 + Math.random() * 2500);
  }
  console.log(`\nProposals: ${outFile}`);
})();
