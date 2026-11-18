// Shared helpers for the /walmart-nutrition command. Uses the Firebase CLI's
// saved sign-in (`firebase login`), so nothing secret lives in this repo.
const fs = require("fs");
const os = require("os");
const path = require("path");

const PROJECT = "recipe-app-f3374";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
// Backups and proposals hold household data, so they stay out of git (.gitignore).
const WORK_DIR = path.resolve(__dirname, "../../nutrition-work");
fs.mkdirSync(WORK_DIR, { recursive: true });

function accessToken() {
  const config = path.join(os.homedir(), ".config/configstore/firebase-tools.json");
  const tokens = JSON.parse(fs.readFileSync(config, "utf8")).tokens || {};
  if (!tokens.access_token || (tokens.expires_at && tokens.expires_at < Date.now() + 60_000)) {
    throw new Error("Firebase sign-in has expired. Run `firebase projects:list` (or `firebase login`) and try again.");
  }
  return tokens.access_token;
}

function authHeaders() {
  return { Authorization: `Bearer ${accessToken()}`, "Content-Type": "application/json" };
}

// Firestore REST values -> plain JS.
function plain(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(plain);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, plain(x)]));
  return null;
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
}

// --household <id>, else the household with the most ingredients.
async function resolveHousehold() {
  const wanted = arg("household");
  const res = await fetch(`${BASE}/households?pageSize=50`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Couldn't list households: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const docs = (await res.json()).documents || [];
  const ranked = docs
    .map((doc) => ({ id: doc.name.split("/").pop(), doc, count: Object.keys(doc.fields?.ingredients?.mapValue?.fields || {}).length }))
    .sort((a, b) => b.count - a.count);
  const pick = wanted ? ranked.find((h) => h.id === wanted) : ranked[0];
  if (!pick) throw new Error(wanted ? `No household ${wanted}.` : "No households found.");
  return pick;
}

const MACROS = ["calories", "protein", "carbs", "fat"];
const isBlank = (ingredient) => MACROS.every((k) => !Number(ingredient[k]));

module.exports = { BASE, WORK_DIR, authHeaders, plain, arg, resolveHousehold, isBlank, path, fs };
