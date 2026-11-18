const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const meals = ["Breakfast", "Lunch", "Dinner"];
const TAKEOUT_PREFIX = "takeout:";
const categoryOrder = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snack", "Side", "Drink"];
const RECIPE_PHOTO_MAX_WIDTH = 720;
const INGREDIENT_PHOTO_MAX_WIDTH = 480;

// Large ingredient lists are drawn in batches as the user scrolls: building and
// painting every photo tile up front made the page slow to appear on phones.
const INGREDIENT_BATCH_SIZE = 16;
let ingredientListShown = INGREDIENT_BATCH_SIZE;
let ingredientListViewKey = null;
let ingredientListObserver = null;

// Bulk mode on the ingredient list: a long press (or the Select chip) starts it,
// taps then pick tiles instead of opening their Walmart links, and the bar
// moves every picked ingredient into one category.
let ingredientBulkMode = false;
const ingredientBulkSelection = new Set();
const INGREDIENT_LONG_PRESS_MS = 500;
// The bulk bar's "Move to..." placeholder; "" is a real choice (Auto).
const INGREDIENT_BULK_CHOOSE = "__choose";

const PHOTO_DECODE_TIMEOUT = 20000;
const PHOTO_UPLOAD_TIMEOUT = 60000;
const PHOTO_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
// No standing "optional / max size" hint: the limit is only mentioned, as a
// notification, when someone actually picks an image that is too big.
const OPTIONAL_PHOTO_MESSAGE = "";
const PHOTO_TOO_BIG_MESSAGE = "That image is over 2 MB - choose a smaller one.";
const ACCESS_ADMIN_UID = "7OaNUgKTq6UVOc5pikdPiFTou0t2";
const FIRESTORE_DOC_LIMIT = 1000000;
const FIRESTORE_DOC_WARNING = 800000;
const firebaseConfig = window.firebaseConfig;
// Local photos for recipes without an uploaded image. Provenance is recorded in
// assets/recipe-photos/sources.json; uploaded photos always take priority.
const recipeFallbackPhotos = new Map([
  ["beef and broccoli", "beef-and-broccoli"],
  ["buffalo chicken dip", "buffalo-chicken-dip"],
  ["chicken and dressing", "chicken-and-dressing"],
  ["chicken and dumplings", "chicken-and-dumplings"],
  ["chicken and queso rice", "chicken-and-queso-rice"],
  ["chicken parmesan", "chicken-parmesan"],
  ["fake carbonara", "fake-carbonara"],
  ["kfc bowl", "kfc-bowl"],
  ["potato soup", "potato-soup"],
  ["taco bowls", "taco-bowls"],
  ["thai curry", "thai-curry"]
]);

const starterRecipes = [
  {
    id: crypto.randomUUID(),
    name: "Turkey Taco Bowls",
    category: "Dinner",
    servings: 4,
    calories: 520,
    protein: 38,
    carbs: 55,
    fat: 18,
    ingredients: ["1 lb ground turkey", "2 cup cooked rice", "1 can black beans", "1 cup salsa", "2 avocado"],
    steps: ["Brown the ground turkey in a skillet.", "Divide the cooked rice and black beans between bowls.", "Top with salsa and avocado."],
    notes: "Add lettuce, hot sauce, or Greek yogurt after reheating."
  },
  {
    id: crypto.randomUUID(),
    name: "Greek Yogurt Parfaits",
    category: "Breakfast",
    servings: 2,
    calories: 310,
    protein: 24,
    carbs: 42,
    fat: 7,
    ingredients: ["2 cup Greek yogurt", "1 cup berries", "0.5 cup granola", "2 tbsp honey"],
    steps: ["Divide the Greek yogurt between two glasses.", "Layer with berries and granola.", "Drizzle with honey before serving."],
    notes: "Keep granola separate until serving."
  },
  {
    id: crypto.randomUUID(),
    name: "Chocolate Mug Cake",
    category: "Dessert",
    servings: 1,
    calories: 390,
    protein: 9,
    carbs: 52,
    fat: 16,
    ingredients: ["4 tbsp flour", "2 tbsp cocoa powder", "2 tbsp sugar", "3 tbsp milk", "1 tbsp oil"],
    steps: ["Mix the flour, cocoa powder, and sugar in a mug.", "Stir in the milk and oil until smooth.", "Microwave until the center is just set."],
    notes: "Microwave 70 to 90 seconds."
  }
];

// Every nutrient is a daily range for one person: `min` is the floor worth
// reaching, `max` the ceiling worth staying under. Either can be null when there
// is no meaningful bound. You can override both per nutrient on the Macros tab.
//
// Energy-linked nutrients use `perMin`/`perMax` in grams per 1000 calories, so they
// follow your own calorie target rather than a fixed 2000. The rest are fixed
// intakes: `min`/`max` are the general FDA Daily Value and Tolerable Upper Intake
// Level, with `female`/`male` carrying the RDAs that genuinely differ by sex.
//
// Sources: FDA Daily Values (21 CFR 101.9, 2016 label rule); IOM/NASEM Dietary
// Reference Intakes for adults 19-50; AMDR ranges for the macronutrients; the 2019
// potassium AI revision; the 2019 sodium CDRR. ULs are only included where they
// apply to total intake from food - the magnesium, folate and niacin ULs cover
// supplements only, so they are deliberately left out.
const nutrients = [
  { key: "calories", label: "Calories", short: "Cal", unit: "", group: "Energy and macros", fromCalories: true },
  // AMDR 10-35% of energy.
  { key: "protein", label: "Protein", short: "Protein", unit: "g", group: "Energy and macros", perMin: 25, perMax: 87.5 },
  // AMDR 45-65% of energy.
  { key: "carbs", label: "Carbs", short: "Carbs", unit: "g", group: "Energy and macros", perMin: 112.5, perMax: 162.5 },
  // AMDR 20-35% of energy. The FDA DV of 78 g is the top of this band, not a goal.
  { key: "fat", label: "Fat", short: "Fat", unit: "g", group: "Energy and macros", perMin: 22.2, perMax: 38.9 },
  // DRI adequate intake is 14 g per 1000 kcal; no upper bound.
  { key: "fiber", label: "Fiber", short: "Fiber", unit: "g", group: "Energy and macros", perMin: 14, perMax: null },
  // Dietary Guidelines cap added sugar at 10% of energy.
  { key: "sugar", label: "Added sugar", short: "Sugar", unit: "g", group: "Energy and macros", perMin: null, perMax: 25 },
  { key: "sodium", label: "Sodium", short: "Sodium", unit: "mg", group: "Minerals", min: null, max: 2300 },
  { key: "iron", label: "Iron", short: "Iron", unit: "mg", group: "Minerals", min: 18, female: 18, male: 8, max: 45 },
  { key: "calcium", label: "Calcium", short: "Calcium", unit: "mg", group: "Minerals", min: 1300, female: 1000, male: 1000, max: 2500 },
  { key: "potassium", label: "Potassium", short: "Potassium", unit: "mg", group: "Minerals", min: 4700, female: 2600, male: 3400, max: null },
  { key: "magnesium", label: "Magnesium", short: "Magnesium", unit: "mg", group: "Minerals", min: 420, female: 320, male: 420, max: null },
  { key: "zinc", label: "Zinc", short: "Zinc", unit: "mg", group: "Minerals", min: 11, female: 8, male: 11, max: 40 },
  { key: "vitaminA", label: "Vitamin A", short: "Vit A", unit: "mcg", group: "Vitamins", min: 900, female: 700, male: 900, max: 3000 },
  { key: "vitaminC", label: "Vitamin C", short: "Vit C", unit: "mg", group: "Vitamins", min: 90, female: 75, male: 90, max: 2000 },
  { key: "vitaminD", label: "Vitamin D", short: "Vit D", unit: "mcg", group: "Vitamins", min: 20, female: 15, male: 15, max: 100 },
  { key: "vitaminB12", label: "Vitamin B12", short: "B12", unit: "mcg", group: "Vitamins", min: 2.4, max: null },
  { key: "folate", label: "Folate", short: "Folate", unit: "mcg", group: "Vitamins", min: 400, max: null }
];

const nutritionProfiles = [
  { value: "general", label: "General (FDA Daily Value)" },
  { value: "female", label: "Adult female" },
  { value: "male", label: "Adult male" }
];

const nutrientGroups = [...new Set(nutrients.map((nutrient) => nutrient.group))];

// The four that already had a home on the ingredient tiles.
const tileNutrientKeys = ["calories", "protein", "carbs", "fat"];

const servingUnits = [
  { group: "Weight", units: ["mg", "g", "kg", "oz", "lb"] },
  { group: "Volume", units: ["ml", "cl", "dl", "l", "tsp", "tbsp", "fl oz", "cup", "pt", "qt", "gal"] },
  { group: "Count", units: ["piece", "slice", "serving", "can", "package", "scoop", "clove", "egg"] }
];

const measurementConversions = {
  mg: { dimension: "weight", factor: 0.001 },
  g: { dimension: "weight", factor: 1 },
  kg: { dimension: "weight", factor: 1000 },
  oz: { dimension: "weight", factor: 28.349523125 },
  lb: { dimension: "weight", factor: 453.59237 },
  ml: { dimension: "volume", factor: 1 },
  cl: { dimension: "volume", factor: 10 },
  dl: { dimension: "volume", factor: 100 },
  l: { dimension: "volume", factor: 1000 },
  tsp: { dimension: "volume", factor: 4.92892159375 },
  tbsp: { dimension: "volume", factor: 14.78676478125 },
  "fl oz": { dimension: "volume", factor: 29.5735295625 },
  cup: { dimension: "volume", factor: 236.5882365 },
  pt: { dimension: "volume", factor: 473.176473 },
  qt: { dimension: "volume", factor: 946.352946 },
  gal: { dimension: "volume", factor: 3785.411784 },
  piece: { dimension: "count", factor: 1 },
  slice: { dimension: "count", factor: 1 },
  serving: { dimension: "count", factor: 1 },
  can: { dimension: "count", factor: 1 },
  package: { dimension: "count", factor: 1 },
  scoop: { dimension: "count", factor: 1 },
  clove: { dimension: "count", factor: 1 },
  egg: { dimension: "count", factor: 1 }
};

const measurementAliases = {
  milligram: "mg", milligrams: "mg",
  gram: "g", grams: "g",
  kilogram: "kg", kilograms: "kg",
  ounce: "oz", ounces: "oz",
  pound: "lb", pounds: "lb",
  milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  liter: "l", liters: "l", litre: "l", litres: "l",
  teaspoon: "tsp", teaspoons: "tsp",
  tablespoon: "tbsp", tablespoons: "tbsp",
  "fluid ounce": "fl oz", "fluid ounces": "fl oz",
  cups: "cup", pints: "pt", quarts: "qt", gallons: "gal",
  pieces: "piece", slices: "slice", servings: "serving", cans: "can",
  packages: "package", scoops: "scoop", cloves: "clove", eggs: "egg",
  containers: "container"
};

const customServingUnit = "__other__";

const defaultRecipeCategories = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snack", "Side", "Drink"];

const authEls = {
  appShell: document.getElementById("app-shell"),
  signedOut: document.getElementById("signed-out-panel"),
  accessPending: document.getElementById("access-pending-panel"),
  accessPendingIdentity: document.getElementById("access-pending-identity"),
  householdPanel: document.getElementById("household-panel"),
  householdAccount: document.getElementById("household-account"),
  householdMessage: document.getElementById("household-message"),
  householdCode: document.getElementById("household-code"),
  householdMembersList: document.getElementById("household-members-list"),
  householdMemberCount: document.getElementById("household-member-count"),
  memberProfileDialog: document.getElementById("member-profile-dialog"),
  memberProfileAvatar: document.getElementById("member-profile-avatar"),
  memberProfileName: document.getElementById("member-profile-name"),
  memberProfileEmail: document.getElementById("member-profile-email"),
  memberProfileRole: document.getElementById("member-profile-role"),
  plannerDialog: document.getElementById("planner-dialog"),
  profileDialog: document.getElementById("settings-view"),
  profileAvatar: document.getElementById("profile-avatar"),
  profileName: document.getElementById("profile-name"),
  profilePhoto: document.getElementById("profile-photo"),
  profileMessage: document.getElementById("profile-message"),
  hideNutrition: document.getElementById("hide-nutrition"),
  settingsHouseholdMessage: document.getElementById("settings-household-message"),
  accessManagement: document.getElementById("access-management"),
  accessRequestList: document.getElementById("access-request-list"),
  approvedUserList: document.getElementById("approved-user-list"),
  accessManagementMessage: document.getElementById("access-management-message"),
  signedIn: document.getElementById("signed-in-panel"),
  githubButton: document.getElementById("sign-in-github"),
  gateStatus: document.getElementById("gate-status"),
  accountEmail: document.getElementById("account-email"),
  accountStatus: document.getElementById("account-status"),
  stateTitle: document.getElementById("auth-state-title"),
  stateDetail: document.getElementById("auth-state-detail"),
  message: document.getElementById("auth-message"),
  accountMessage: document.getElementById("account-message"),
  syncStatus: document.getElementById("sync-status")
};

let selectedWeekStart = getWeekStart(new Date());
let state = createSignedOutState();
let cloud = null;
let authResolved = false;
let cloudDataLoaded = false;
let unsubscribeCloudState = null;
let currentHouseholdId = null;
let currentInviteCode = null;
let unsubscribeMembers = null;
let unsubscribeAccessApproval = null;
let unsubscribeAccessRequests = null;
let unsubscribeApprovedUsers = null;
let householdMembers = [];
let accessRequests = [];
let approvedUsers = [];
let householdOwnerUid = null;
let profileDraftPhoto = "";
let recipeDraftImage = "";
let recipeDraftBlob = null;
let recipeDraftPreview = "";
let recipeDraftNutrition = null;
let ingredientDraftImage = "";
let ingredientDraftBlob = null;
let ingredientDraftPreview = "";
let hideNutritionPreference = false;
let personalNutrition = defaultPersonalNutrition();
let activePlannerId = null;
let openRecipeId = null;
// Recipe page filters: "Can make now" and one category at a time.
let recipeCanMakeOnly = false;
// Favorites belong to the signed-in person (users/{uid}.profile.favoriteRecipes),
// not the household, so everyone keeps their own.
let favoriteRecipeIds = new Set();
let recipeFavoritesOnly = false;
let recipeCategoryFilter = "";

// The Recipes page remembers its filter chips (Favorites, Can make now, a category)
// in this browser, so a refresh comes back to the same list.
const recipeFiltersStorageKey = "recipe-filters";

function loadRecipeFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(recipeFiltersStorageKey) || "{}");
    recipeFavoritesOnly = Boolean(saved.favoritesOnly);
    recipeCanMakeOnly = Boolean(saved.canMakeOnly);
    recipeCategoryFilter = typeof saved.category === "string" ? saved.category : "";
  } catch (error) {
    // Storage blocked or unreadable: start with no filters.
  }
}

function saveRecipeFilters() {
  try {
    localStorage.setItem(recipeFiltersStorageKey, JSON.stringify({
      favoritesOnly: recipeFavoritesOnly,
      canMakeOnly: recipeCanMakeOnly,
      category: recipeCategoryFilter
    }));
  } catch (error) {
    // The filters still work for this visit when storage is unavailable.
  }
}
// Ingredients ticked off while cooking, per recipe. Kept for the session only.
const recipeIngredientChecks = new Map();
// Set when "Add it" leaves the recipe editor for the ingredient index.
let returnToRecipeEditor = false;
// Where Settings returns to when it is closed.
let settingsReturnView = null;
// Narrow screens show one day at a time; "week" shows the whole grid. Null means
// "follow today", so moving between weeks lands on a sensible day on its own.
let plannerMode = "day";
let selectedDayIndex = null;
let lastCentredDayIndex = null;
function blankPlan() {
  return Object.fromEntries(days.map((day) => [day, Object.fromEntries(meals.map((meal) => [meal, ""]))]));
}

function createInitialState() {
  return {
    recipes: starterRecipes,
    ingredients: {},
    kitchenStock: {},
    stockReceiptImports: [],
    nutrition: defaultNutritionSettings(),
    planners: {}
  };
}

function createSignedOutState() {
  return {
    recipes: [],
    ingredients: {},
    kitchenStock: {},
    stockReceiptImports: [],
    nutrition: defaultNutritionSettings(),
    planners: {}
  };
}

function normalizeState(value) {
  const ingredientSource = value?.ingredients && typeof value.ingredients === "object" ? value.ingredients : value?.mappings;
  const legacyPlans = value?.plans && typeof value.plans === "object" ? { ...value.plans } : {};
  if (value?.plan && !Object.keys(legacyPlans).length) legacyPlans[dateKey(selectedWeekStart)] = value.plan;
  const normalized = {
    recipes: Array.isArray(value?.recipes) ? value.recipes : starterRecipes,
    planners: normalizePlanners(value?.planners, legacyPlans, Boolean(value?.plan || Object.keys(legacyPlans).length)),
    ingredients: normalizeIngredientCatalog(ingredientSource),
    kitchenStock: normalizeKitchenStock(value?.kitchenStock),
    stockReceiptImports: Array.isArray(value?.stockReceiptImports) ? value.stockReceiptImports.filter(id => typeof id === "string" && id.length <= 150).slice(-200) : [],
    nutrition: normalizeNutritionSettings(value?.nutrition, value?.macroPeople)
  };

  return normalized;
}

function normalizePlanners(value, legacyPlans, hasLegacyPlanner) {
  if (value && typeof value === "object" && Object.keys(value).length) {
    return Object.fromEntries(
      Object.entries(value).map(([key, planner]) => [
        key,
        {
          id: planner.id || key,
          name: planner.name || "Meal planner",
          ownerUid: planner.ownerUid || "",
          memberUids: Array.isArray(planner.memberUids) ? [...new Set(planner.memberUids)] : [],
          allHouseholdMembers: Boolean(planner.allHouseholdMembers),
          plans: planner.plans && typeof planner.plans === "object" ? planner.plans : {}
        }
      ])
    );
  }

  const id = "default-planner";
  const uid = cloud?.auth.currentUser?.uid || "";
  const plans = Object.keys(legacyPlans).length ? legacyPlans : { [dateKey(selectedWeekStart)]: blankPlan() };
  return {
    [id]: {
      id,
      name: "Household planner",
      ownerUid: uid,
      memberUids: hasLegacyPlanner || !uid ? [] : [uid],
      allHouseholdMembers: hasLegacyPlanner || !uid,
      plans
    }
  };
}

function normalizeIngredientCatalog(value) {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.values(value).map((item) => {
      const name = item.name || item.ingredient || "Ingredient";
      const key = ingredientKey(name);
      return [
        key,
        {
          key,
          name,
          category: typeof item.category === "string" ? item.category : "",
          serving: item.serving || "1 serving",
          ...nutrientValues(item),
          servingsPerContainer: servingsPerContainer(item),
          // Optional: no link stays empty, and the grocery list falls back to a
          // Walmart search for the name (a filled-in search URL would read as "linked").
          url: typeof item.url === "string" ? item.url.trim() : "",
          image: safeImageUrl(item.image),
          imagePath: typeof item.imagePath === "string" ? item.imagePath : ""
        }
      ];
    })
  );
}

// Kitchen stock entries are keyed by their catalog ingredient key when they have
// one, so restocking an ingredient updates its row instead of duplicating it.
function kitchenStockId(key, name) {
  return key || `custom|${ingredientKey(name)}`;
}

function clampNumber(raw, min, max, fallback) {
  const number = Math.round(Number(raw));
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

// Shared with the household: how many people the planned meals are cooked for.
// Your share of the plan is one of them.
function defaultNutritionSettings() {
  return { people: 0 };
}

function normalizeNutritionSettings(value, legacyPeople) {
  const source = value && typeof value === "object" ? value : {};
  // 0 means "follow the planner's member count" rather than a pinned number.
  return { people: clampNumber(source.people ?? legacyPeople, 0, 20, 0) };
}

// Personal to the signed-in account, stored on the user document so two people in
// one household do not overwrite each other's targets.
function defaultPersonalNutrition() {
  return { calories: 2000, profile: "general", targets: {} };
}

function normalizePersonalNutrition(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    // Wide enough for a small child through a heavy training day.
    calories: clampNumber(source.calories, 800, 6000, 2000),
    profile: nutritionProfiles.some((entry) => entry.value === source.profile) ? source.profile : "general",
    targets: normalizeNutrientTargets(source.targets)
  };
}

// Per-nutrient daily overrides. A bound is stored only when set: `null` means
// "no bound" on purpose, while a missing key falls back to the reference value.
function normalizeNutrientTargets(value) {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    nutrients
      .map((nutrient) => {
        const entry = value[nutrient.key];
        if (!entry || typeof entry !== "object") return null;
        const bound = (raw) => {
          if (raw === null) return null;
          const number = Number(raw);
          return Number.isFinite(number) && number >= 0 ? roundTo(number, 3) : undefined;
        };
        const min = bound(entry.min);
        const max = bound(entry.max);
        const cleaned = {};
        if (min !== undefined) cleaned.min = min;
        if (max !== undefined) cleaned.max = max;
        // A floor above the ceiling can never be satisfied, so drop the ceiling.
        if (cleaned.min != null && cleaned.max != null && cleaned.max < cleaned.min) delete cleaned.max;
        return Object.keys(cleaned).length ? [nutrient.key, cleaned] : null;
      })
      .filter(Boolean)
  );
}

function normalizeKitchenStock(value) {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.values(value)
      .filter((entry) => entry && typeof entry === "object" && String(entry.name || "").trim())
      .map((entry) => {
        const name = String(entry.name).trim();
        const key = typeof entry.key === "string" ? entry.key : "";
        const id = kitchenStockId(key, name);
        return [
          id,
          {
            id,
            key,
            name,
            quantity: Math.max(0, roundTo(Number(entry.quantity) || 0, 4)),
            unit: normalizeMeasurementUnit(entry.unit),
            note: String(entry.note || "").trim(),
            updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : ""
          }
        ];
      })
  );
}

async function initializeCloud() {
  if (!firebaseConfig) {
    authResolved = true;
    setAccountStatus("error", "Firebase unavailable", "Configuration is missing");
    setAuthMessage("Add Firebase config before using the app.");
    updateDataControls();
    return;
  }

  try {
    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    const storageModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js");
    const app = appModule.initializeApp(firebaseConfig);
    const auth = authModule.getAuth(app);
    const db = firestoreModule.getFirestore(app);
    const storage = storageModule.getStorage(app);

    await authModule.setPersistence(auth, authModule.browserLocalPersistence);

    cloud = {
      auth,
      db,
      doc: firestoreModule.doc,
      collection: firestoreModule.collection,
      writeBatch: firestoreModule.writeBatch,
      getDoc: firestoreModule.getDoc,
      setDoc: firestoreModule.setDoc,
      updateDoc: firestoreModule.updateDoc,
      runTransaction: firestoreModule.runTransaction,
      onSnapshot: firestoreModule.onSnapshot,
      onAuthStateChanged: authModule.onAuthStateChanged,
      GithubAuthProvider: authModule.GithubAuthProvider,
      getRedirectResult: authModule.getRedirectResult,
      signInWithPopup: authModule.signInWithPopup,
      signOut: authModule.signOut,
      storage,
      storageRef: storageModule.ref,
      uploadBytes: storageModule.uploadBytes,
      getDownloadURL: storageModule.getDownloadURL,
      deleteObject: storageModule.deleteObject
    };

    cloud.onAuthStateChanged(auth, handleAuthChange);
    await checkGitHubRedirectResult();
  } catch (error) {
    authResolved = true;
    setAccountStatus("error", "Firebase connection failed", "Data cannot sync");
    setAuthMessage(`Firebase did not load: ${error.message}`);
    updateDataControls();
  }
}

async function handleAuthChange(user) {
  authResolved = true;
  cloudDataLoaded = false;
  currentHouseholdId = null;
  currentInviteCode = null;
  activePlannerId = null;
  hideNutritionPreference = false;
  personalNutrition = defaultPersonalNutrition();
  favoriteRecipeIds = new Set();
  applyNutritionVisibility();
  unsubscribeCloudState?.();
  unsubscribeCloudState = null;
  clearHouseholdMembers();
  unsubscribeAccessApproval?.();
  unsubscribeAccessApproval = null;
  authEls.accessPending.hidden = true;

  if (!user) {
    state = createSignedOutState();
    authEls.signedOut.hidden = false;
    authEls.householdPanel.hidden = true;
    authEls.appShell.hidden = true;
    authEls.signedIn.hidden = true;
    authEls.githubButton.disabled = false;
    setAccountStatus("signed-out", "Not signed in", "Cloud sync is off");
    setAuthMessage("Sign in to load and save your Firebase data.");
    renderAll();
    return;
  }

  authEls.signedOut.hidden = true;
  authEls.householdPanel.hidden = true;
  authEls.appShell.hidden = true;
  authEls.signedIn.hidden = true;
  authEls.accountEmail.textContent = user.email || user.displayName || "GitHub account";
  void applyStoredProfileLabel(user);
  setAccountStatus("checking", "Signed in", "Finding your household...");
  setAuthMessage("");

  try {
    if (!(await hasApprovedAccess(user))) {
      await submitAccessRequest(user);
      showAccessPending(user);
      return;
    }

    const userRef = cloud.doc(cloud.db, "users", user.uid);
    const userSnapshot = await cloud.getDoc(userRef);
    const householdId = userSnapshot.data()?.householdId;
    if (householdId) {
      subscribeToHousehold(householdId);
      return;
    }

    showHouseholdSetup(user);
  } catch (error) {
    handleSyncError("Could not load your household membership", error);
  }
}

async function hasApprovedAccess(user) {
  if (user.uid === ACCESS_ADMIN_UID) return true;
  const snapshot = await cloud.getDoc(cloud.doc(cloud.db, "approvedUsers", user.uid));
  return snapshot.exists();
}

async function submitAccessRequest(user) {
  const requestRef = cloud.doc(cloud.db, "accessRequests", user.uid);
  await cloud.setDoc(requestRef, {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "GitHub account",
    requestedAt: new Date().toISOString()
  });
}

function showAccessPending(user) {
  authEls.signedOut.hidden = true;
  authEls.householdPanel.hidden = true;
  authEls.appShell.hidden = true;
  authEls.signedIn.hidden = true;
  authEls.accessPending.hidden = false;
  authEls.accessPendingIdentity.textContent = `${user.email || user.displayName || "GitHub account"} · ${user.uid}`;
  setAccountStatus("checking", "Approval pending", "Database access is locked");

  unsubscribeAccessApproval?.();
  const approvalRef = cloud.doc(cloud.db, "approvedUsers", user.uid);
  unsubscribeAccessApproval = cloud.onSnapshot(approvalRef, (snapshot) => {
    if (!snapshot.exists()) return;
    unsubscribeAccessApproval?.();
    unsubscribeAccessApproval = null;
    void handleAuthChange(user);
  });
}

async function applyStoredProfileLabel(user) {
  const profile = await loadStoredProfile(user);
  if (cloud?.auth.currentUser?.uid !== user.uid) return;
  if (profile.displayName) authEls.accountEmail.textContent = profile.displayName;
  hideNutritionPreference = Boolean(profile.hideNutrition);
  personalNutrition = normalizePersonalNutrition(profile.nutrition);
  favoriteRecipeIds = new Set(Array.isArray(profile.favoriteRecipes) ? profile.favoriteRecipes.map(String) : []);
  applyNutritionVisibility();
  renderMacros();
  renderRecipes();
}

function applyNutritionVisibility() {
  document.body.classList.toggle("hide-nutrition", hideNutritionPreference);
  const macrosView = document.getElementById("macros-view");
  if (hideNutritionPreference && macrosView?.classList.contains("active")) {
    document.querySelector('[data-tab="planner"]')?.click();
  }
}

function showHouseholdSetup(user) {
  authEls.householdAccount.textContent = `Signed in as ${user.email || user.displayName || "GitHub account"}. Create a household or join with an invite code.`;
  authEls.householdPanel.hidden = false;
  authEls.appShell.hidden = true;
  authEls.signedIn.hidden = true;
  setHouseholdControlsDisabled(false);
  setHouseholdMessage("");
}

function subscribeToHousehold(householdId) {
  currentHouseholdId = householdId;
  authEls.householdPanel.hidden = true;
  authEls.appShell.hidden = true;
  authEls.syncStatus.textContent = "Loading household";

  subscribeToMembers(householdId);

  const ref = cloud.doc(cloud.db, "households", householdId);
  unsubscribeCloudState = cloud.onSnapshot(ref, { includeMetadataChanges: true }, (snapshot) => {
    if (!snapshot.exists()) {
      handleSyncError("The shared household no longer exists", new Error("Ask the household owner for a new invite."));
      return;
    }

    const household = snapshot.data();
    householdOwnerUid = household.ownerUid || null;
    subscribeToAccessManagement();
    renderHouseholdMembers();
    state = normalizeState(household);
    // Short codes are the token itself; older households still show the long
    // id.token code until the owner's app swaps it for a short one.
    currentInviteCode = isShortInviteCode(household.inviteToken) ? household.inviteToken : `${householdId}.${household.inviteToken}`;
    authEls.householdCode.textContent = currentInviteCode;
    if (!isShortInviteCode(household.inviteToken) && household.ownerUid === cloud.auth.currentUser?.uid) {
      void ensureShortInviteCode(householdId);
    }
    cloudDataLoaded = true;
    authEls.appShell.hidden = false;
    authEls.signedIn.hidden = false;

    const syncState = snapshot.metadata.hasPendingWrites ? "saving" : snapshot.metadata.fromCache ? "connecting" : "synced";
    authEls.syncStatus.textContent = syncState === "saving" ? "Saving" : syncState === "connecting" ? "Connecting" : "Synced";
    setAccountStatus(
      syncState === "synced" ? "signed-in" : "checking",
      "Household connected",
      syncState === "saving" ? "Saving to Firebase..." : syncState === "connecting" ? "Waiting for Firebase..." : "Firebase synced"
    );
    setAuthMessage(
      syncState === "saving" ? "Saving household changes..." : syncState === "connecting" ? "Waiting for the Firebase server." : "Shared household data is synced."
    );
    renderAll();
    applyPendingRoute();
  }, (error) => {
    cloudDataLoaded = false;
    authEls.appShell.hidden = true;
    authEls.householdPanel.hidden = false;
    setHouseholdControlsDisabled(false);
    setHouseholdMessage(`Household sync failed: ${error.message}`);
    handleSyncError("Household sync failed", error);
  });
}

function handleSyncError(prefix, error) {
    authEls.syncStatus.textContent = "Sync error";
    setAccountStatus("error", "Sync error", "Firebase could not save data");
    setAuthMessage(`${prefix}: ${error.message}`);
    updateDataControls();
}

function saveState() {
  if (!canWriteCloudData()) {
    setAuthMessage("Sign in and wait for Firebase to finish loading before making changes.");
    return;
  }

  authEls.syncStatus.textContent = "Saving";
  setAccountStatus("checking", "Signed in", "Saving to Firebase...");
  void saveCloudState("Firestore save failed");
}

async function saveCloudState(errorPrefix = "Firestore save failed") {
  if (!canWriteCloudData()) return false;

  const size = approximateStateSize();
  if (size > FIRESTORE_DOC_LIMIT) {
    setAuthMessage("This household is over the 1MB Firestore document limit - remove some recipes and try again.");
    return false;
  }

  try {
    const ref = cloud.doc(cloud.db, "households", currentHouseholdId);
    // updateDoc replaces each field outright. A merged setDoc would keep map
    // entries that were deleted locally, so renamed or removed ingredients and
    // planners came back on the next snapshot.
    await cloud.updateDoc(ref, {
      recipes: state.recipes,
      ingredients: state.ingredients,
      kitchenStock: state.kitchenStock,
      stockReceiptImports: state.stockReceiptImports,
      nutrition: state.nutrition,
      planners: state.planners
    });
    if (size > FIRESTORE_DOC_WARNING) {
      setAuthMessage("Saved. This household is close to the 1MB Firestore document limit.");
    }
    return true;
  } catch (error) {
    handleSyncError(errorPrefix, error);
    return false;
  }
}

function approximateStateSize() {
  try {
    return new Blob([JSON.stringify(state)]).size;
  } catch (error) {
    return 0;
  }
}

function canWriteCloudData() {
  return Boolean(cloud?.auth.currentUser && currentHouseholdId && cloudDataLoaded);
}

function planners() {
  return Object.values(state.planners || {}).sort((a, b) => a.name.localeCompare(b.name));
}

function isPlannerMember(planner) {
  const uid = cloud?.auth.currentUser?.uid;
  return Boolean(planner && (planner.allHouseholdMembers || (uid && planner.memberUids?.includes(uid))));
}

function joinedPlanners() {
  return planners().filter(isPlannerMember);
}

function activePlanner() {
  const planner = state.planners?.[activePlannerId];
  return isPlannerMember(planner) ? planner : null;
}

function plannerPreferenceKey() {
  const uid = cloud?.auth.currentUser?.uid;
  return uid && currentHouseholdId ? `recipe-planner:${uid}:${currentHouseholdId}` : "";
}

function ensureActivePlanner() {
  if (activePlanner()) return activePlanner();

  let preferredId = "";
  try {
    const key = plannerPreferenceKey();
    if (key) preferredId = localStorage.getItem(key) || "";
  } catch (error) {
    preferredId = "";
  }

  const joined = joinedPlanners();
  activePlannerId = joined.some((planner) => planner.id === preferredId) ? preferredId : joined[0]?.id || null;
  return activePlanner();
}

function selectPlanner(plannerId) {
  const planner = state.planners?.[plannerId];
  if (!isPlannerMember(planner)) return;
  activePlannerId = plannerId;
  try {
    const key = plannerPreferenceKey();
    if (key) localStorage.setItem(key, plannerId);
  } catch (error) {
    // Planner selection still works when browser storage is unavailable.
  }
  renderAll();
}

function getCurrentPlan() {
  const planner = ensureActivePlanner();
  if (!planner) return blankPlan();
  const key = dateKey(selectedWeekStart);
  if (!planner.plans[key]) planner.plans[key] = blankPlan();
  return planner.plans[key];
}

function recipeById(id) {
  return state.recipes.find((recipe) => recipe.id === id);
}

function isTakeoutValue(value) {
  return typeof value === "string" && value.startsWith(TAKEOUT_PREFIX);
}

function takeoutName(value) {
  return isTakeoutValue(value) ? value.slice(TAKEOUT_PREFIX.length) : "";
}

function takeoutValue(name = "") {
  return `${TAKEOUT_PREFIX}${name.trim()}`;
}

function plannedSlotValues() {
  const plan = getCurrentPlan();
  return days.flatMap((day) => meals.map((meal) => plan[day]?.[meal]).filter(Boolean));
}

function plannedRecipes() {
  return plannedSlotValues()
    .filter((value) => !isTakeoutValue(value))
    .map(recipeById)
    .filter(Boolean);
}

// ---- Plates ------------------------------------------------------------------
// "Build a plate" fills a meal with three picks instead of one recipe: a protein,
// a veggie and a side. Each pick is a recipe or a plain ingredient from the
// index. The slot's value is PLATE_VALUE and the picks live beside the slot
// values, in plan.plates[day][meal], so code that reads plan[day][meal] as a
// recipe id simply finds no recipe and moves on.
//   pick: { type: "recipe", id }  or  { type: "ingredient", key }
const PLATE_VALUE = "plate";
const plateRoles = [
  { key: "protein", label: "Protein", empty: "Choose a protein" },
  { key: "veggie", label: "Veggie", empty: "Choose a veggie" },
  { key: "side", label: "Side", empty: "Choose a side" }
];

function isPlateValue(value) {
  return value === PLATE_VALUE;
}

function validPick(pick) {
  return pick?.type === "recipe" ? Boolean(recipeById(pick.id))
    : pick?.type === "ingredient" ? Boolean(state.ingredients[pick.key])
    : false;
}

function samePick(a, b) {
  return a.type === b.type && (a.type === "recipe" ? a.id === b.id : a.key === b.key);
}

// Picks whose recipe or ingredient has since been deleted drop out.
function slotPlate(plan, day, meal) {
  const raw = plan?.plates?.[day]?.[meal];
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    plateRoles.map(({ key }) => [key, raw[key]]).filter(([, pick]) => validPick(pick))
  );
}

function setSlotPlate(plan, day, meal, plate) {
  const picks = Object.fromEntries(
    plateRoles
      .map(({ key }) => [key, plate?.[key]])
      .filter(([, pick]) => validPick(pick))
      .map(([key, pick]) => [key, pick.type === "recipe" ? { type: "recipe", id: pick.id } : { type: "ingredient", key: pick.key }])
  );
  plan.plates = plan.plates && typeof plan.plates === "object" ? plan.plates : {};
  plan.plates[day] = plan.plates[day] && typeof plan.plates[day] === "object" ? plan.plates[day] : {};
  if (Object.keys(picks).length) plan.plates[day][meal] = picks;
  else delete plan.plates[day][meal];
  if (!Object.keys(plan.plates[day]).length) delete plan.plates[day];
  if (!Object.keys(plan.plates).length) delete plan.plates;
}

function pickSummary(pick) {
  if (pick.type === "recipe") {
    const recipe = recipeById(pick.id);
    return { kind: "recipe", label: recipe?.name || "", image: recipe ? recipeImage(recipe) : "", note: "" };
  }
  const ingredient = state.ingredients[pick.key];
  // Small copies of linked Walmart photos: these thumbs are tiny.
  const image = ingredient ? ingredientImage(ingredient) : "";
  return { kind: "recipe", label: ingredient?.name || "", image: image ? tileImageUrl(image, 160) : "", note: "" };
}

// Plates count toward groceries and nutrition as recipe-shaped objects, so the
// grocery and macro code needs no special case. A recipe pick is the recipe; an
// ingredient pick is one serving for each person eating.
function pickAsRecipe(pick, plateName) {
  if (pick.type === "recipe") return recipeById(pick.id) || null;
  const ingredient = state.ingredients[pick.key];
  if (!ingredient) return null;
  const servings = Math.max(1, Number(nutritionSettings().people) || 1);
  return {
    id: `plate:${pick.key}`,
    name: plateName,
    servings,
    ingredients: [{ key: ingredient.key, quantity: servings, measure: "serving" }]
  };
}

function planPlateRecipes(plan) {
  return days.flatMap((day) =>
    meals.flatMap((meal) => {
      if (!isPlateValue(plan?.[day]?.[meal])) return [];
      const plate = slotPlate(plan, day, meal);
      const name = `${day} ${meal.toLowerCase()} plate`;
      return Object.values(plate).map((pick) => pickAsRecipe(pick, name)).filter(Boolean);
    })
  );
}

function plannedPlateRecipes() {
  return planPlateRecipes(getCurrentPlan());
}

// Groceries aren't capped by the selected week: every meal planned from the
// current week onward is shopped for. Past weeks are left out so old plans
// don't pile up on the list. Week keys are YYYY-MM-DD, so they sort as strings.
function upcomingPlannedRecipes() {
  const planner = ensureActivePlanner();
  if (!planner) return [];
  const thisWeekKey = dateKey(getWeekStart(new Date()));
  return Object.entries(planner.plans)
    .filter(([weekKey]) => weekKey >= thisWeekKey)
    .flatMap(([, plan]) => [
      ...days.flatMap((day) => meals.map((meal) => plan[day]?.[meal]).filter(Boolean))
        .filter((value) => !isTakeoutValue(value))
        .map(recipeById)
        .filter(Boolean),
      // A plate's protein, veggie and side are shopped for too.
      ...planPlateRecipes(plan)
    ]);
}

function renderTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => openTabHome(button.dataset.tab));
  });
}

// A header tab always lands on that section's main page: Recipes from inside a
// recipe (or the editor) goes back to the recipe list, not the open recipe.
function openTabHome(tab) {
  if (tab === "recipes") {
    openRecipeId = null;
    showRecipesView();
  } else if (tab === "ingredients") {
    // The tab is a fresh start: no half-edited ingredient, no pending trip back
    // to the recipe editor.
    returnToRecipeEditor = false;
    resetIngredientForm();
    activateAppView(tab, tab);
    document.getElementById("back-to-recipe-editor").hidden = true;
  } else {
    activateAppView(tab, tab);
  }
  window.scrollTo({ top: 0 });
}

function activateAppView(viewName, activeTab = viewName) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    const active = button.dataset.tab === activeTab;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
  // The header avatar is the way into Settings, so it shows as the current page there.
  document.querySelectorAll(".sidebar-avatar-button, .mobile-settings-button").forEach((button) => {
    button.classList.toggle("is-current", viewName === "settings");
    if (viewName === "settings") button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (viewName !== "ingredients") {
    document.getElementById("back-to-recipe-editor").hidden = true;
    // A half-made selection shouldn't be waiting on return.
    exitIngredientBulkMode();
  }
  syncRoute();
}

// ---- Page addresses -------------------------------------------------------
// Each page has its own path (/recipes, /pantry, /recipes/<name>/edit...) so a
// refresh, a bookmark or the back button lands on the same page. Every path is
// served index.html: 404.html on GitHub Pages, a rewrite on Firebase Hosting,
// serve.js locally. The head script in index.html sets window.appBasePath.
const appBasePath = window.appBasePath || "/";
const legacyHashRoute = /^#\/?(plan|recipes|groceries|pantry|ingredients|nutrition|settings)(\/|$)/;

// The route part of the address: "recipes/pumpkin-bread/edit", or "" for the
// start page. Old #recipes links are still understood.
function currentRoutePath() {
  if (legacyHashRoute.test(window.location.hash)) return window.location.hash.replace(/^#\/?/, "");
  const path = window.location.pathname;
  const rest = path.startsWith(appBasePath) ? path.slice(appBasePath.length) : path.replace(/^\/+/, "");
  return rest.replace(/^index\.html$/, "").replace(/\/+$/, "");
}
const viewSlugs = {
  planner: "plan",
  recipes: "recipes",
  groceries: "groceries",
  "kitchen-stock": "pantry",
  ingredients: "ingredients",
  macros: "nutrition",
  settings: "settings"
};
// The address the page was opened with, applied once household data has loaded
// (recipes and settings need it). Until then the URL is left alone.
let pendingRoute = currentRoutePath();
let lastRoute = currentRoutePath();
let routeSyncQueued = false;

// "Pumpkin Snickerdoodles" -> "pumpkin-snickerdoodles". Accents are folded and
// anything that isn't a letter or digit becomes a single dash.
function slugify(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// A recipe's address is its title. Two recipes with the same title get a short
// piece of their id added so each still has its own link.
function recipeSlug(recipe) {
  const base = slugify(recipe?.name) || "recipe";
  const shared = state.recipes.some((other) => other.id !== recipe.id && (slugify(other.name) || "recipe") === base);
  return shared ? `${base}-${String(recipe.id).slice(0, 6)}` : base;
}

function recipeRouteSlug(id) {
  const recipe = recipeById(id);
  return recipe ? recipeSlug(recipe) : encodeURIComponent(id);
}

// Title links first; links made before titles were used carry the raw id.
function recipeBySlug(slug) {
  const wanted = String(slug || "").toLowerCase();
  return state.recipes.find((recipe) => recipeSlug(recipe) === wanted) || recipeById(slug);
}

function routeForCurrentView() {
  const { view } = currentAppView();
  if (view === "recipe-editor") {
    const id = document.getElementById("recipe-form").dataset.editingId;
    return id ? `recipes/${recipeRouteSlug(id)}/edit` : "recipes/new";
  }
  if (view === "recipes" && openRecipeId) return `recipes/${recipeRouteSlug(openRecipeId)}`;
  return viewSlugs[view] || "plan";
}

// Deferred a tick so multi-step navigation (open the editor, then fill it with a
// recipe) records the finished page rather than the first step.
function syncRoute() {
  if (pendingRoute !== null || routeSyncQueued) return;
  routeSyncQueued = true;
  queueMicrotask(() => {
    routeSyncQueued = false;
    const route = routeForCurrentView();
    lastRoute = route;
    const url = `${appBasePath}${route}`;
    // An old #address is swapped for its path rather than added to history.
    if (legacyHashRoute.test(window.location.hash)) history.replaceState(null, "", url);
    else if (url !== window.location.pathname) history.pushState(null, "", url);
  });
}

function applyRoute(route) {
  const [slug = "", id = "", action = ""] = String(route || "").replace(/^[#/]+/, "").split("/").map((part) => {
    try {
      return decodeURIComponent(part);
    } catch (error) {
      return part;
    }
  });
  const view = Object.keys(viewSlugs).find((key) => viewSlugs[key] === slug) || "planner";

  if (view === "recipes") {
    if (id === "new") return showRecipeEditor();
    const recipe = id ? recipeBySlug(id) : null;
    if (recipe && action === "edit") return showRecipeEditor(recipe);
    openRecipeId = recipe ? recipe.id : null;
    return showRecipesView();
  }
  if (view === "settings") return openProfileDialog();
  if (view === "macros" && hideNutritionPreference) return activateAppView("planner", "planner");
  activateAppView(view, view);
}

function applyPendingRoute() {
  if (pendingRoute === null) return;
  const route = pendingRoute;
  pendingRoute = null;
  applyRoute(route);
  syncRoute();
}

function setupRouting() {
  const follow = () => {
    const route = currentRoutePath();
    if (pendingRoute !== null || route === lastRoute) return;
    lastRoute = route;
    applyRoute(route);
  };
  window.addEventListener("popstate", follow);
  window.addEventListener("hashchange", follow);
}

function currentAppView() {
  const view = document.querySelector(".view.active");
  const tab = document.querySelector(".tab-button.active");
  return { view: view ? view.id.replace(/-view$/, "") : "planner", tab: tab?.dataset.tab || "planner" };
}

function showRecipeEditor(recipe = null) {
  activateAppView("recipe-editor", "recipes");
  if (recipe) fillRecipeForm(recipe);
  else resetRecipeForm();
  resetRecipeFormSections();
}

function isNarrowLayout() {
  return window.matchMedia("(max-width: 680px)").matches;
}

function setRecipeFormSection(section, open) {
  if (!section) return;
  section.dataset.open = String(open);
  section.querySelector(".section-toggle")?.setAttribute("aria-expanded", String(open));
}

function resetRecipeFormSections() {
  document.querySelectorAll("#recipe-form .recipe-form-section").forEach((section) => setRecipeFormSection(section, true));
}

function openRecipeFormSection(bodyId) {
  setRecipeFormSection(document.getElementById(bodyId)?.closest(".recipe-form-section"), true);
}

function showRecipesView() {
  activateAppView("recipes", "recipes");
  renderRecipes();
}

const mealIcons = { Breakfast: "🍳", Lunch: "🥪", Dinner: "🍽️" };

// Index of the day the single-day mobile layout shows. Falls back to today when
// the current week is on screen so opening the app lands on the useful day.
function activeDayIndex() {
  if (selectedDayIndex !== null) return selectedDayIndex;
  if (!isCurrentWeek()) return 0;
  const today = new Date().getDay();
  return today === 0 ? 6 : today - 1;
}

function resetPlannerDay() {
  selectedDayIndex = null;
}

// plate: the slot's picks (slotPlate), needed when the value is a plate.
function slotSummary(value, plate = {}) {
  if (isPlateValue(value)) {
    // The protein leads (its photo and name); the rest read as "with ...".
    const [lead, ...rest] = plateRoles.map(({ key }) => plate[key]).filter(Boolean).map(pickSummary);
    if (!lead) return { kind: "plate", label: "Plate", image: "", note: "" };
    const others = rest.map((item) => item.label);
    const note = others.length ? `with ${others.length > 1 ? `${others.slice(0, -1).join(", ")} & ${others.at(-1)}` : others[0]}` : "";
    return { kind: "plate", label: lead.label, image: lead.image, note };
  }
  if (isTakeoutValue(value)) {
    const name = takeoutName(value);
    return { kind: "takeout", label: name || "Takeout", image: "", note: name ? "Takeout" : "" };
  }
  const recipe = value ? recipeById(value) : null;
  if (!recipe) return { kind: "empty", label: "", image: "", note: "" };
  return { kind: "recipe", label: recipe.name, image: recipeImage(recipe), note: `Serves ${formatQuantity(Number(recipe.servings || 1))}` };
}

// A recipe without a photo shows its first letter so the square is never blank.
function mealThumbMarkup(summary) {
  if (summary.image) return `<span class="meal-slot-thumb has-photo" style="background-image:url('${summary.image}')"></span>`;
  const content = summary.kind === "takeout" ? "🥡"
    : summary.kind === "recipe" || summary.kind === "plate" ? `<span class="meal-slot-initial">${escapeHtml(summary.label.trim().charAt(0).toUpperCase())}</span>`
    : "+";
  return `<span class="meal-slot-thumb" aria-hidden="true">${content}</span>`;
}

// ---- Meal picker -----------------------------------------------------------
// A <select> can't show pictures, so meal slots open this list instead: each
// recipe with its photo, plus a search box. It writes the choice back into the
// slot's hidden <select> and fires "change", so planning works exactly as before.
let mealPicker = null;

function closeMealPicker({ restoreFocus = false } = {}) {
  if (!mealPicker) return;
  const { element, trigger, cleanup } = mealPicker;
  mealPicker = null;
  cleanup();
  element.remove();
  if (restoreFocus && trigger.isConnected) trigger.focus();
}

// The picker's own value for the "Build a plate" row (never stored in a plan).
const PLATE_PICK = "__plate";

function openMealPicker(trigger) {
  const slot = trigger.closest(".meal-slot");
  const select = slot?.querySelector(".meal-slot-select");
  if (!select || select.disabled) return;
  if (mealPicker?.trigger === trigger) return closeMealPicker({ restoreFocus: true });
  closeMealPicker();

  const { day, meal } = select.dataset;
  // The slot's own value rather than the hidden <select>'s: a plate has no <option>.
  const current = getCurrentPlan()[day]?.[meal] || "";
  const currentIsPlate = isPlateValue(current);
  const items = [...select.options]
    .filter((option) => option.value || current)
    .map((option) => {
      const value = option.value;
      if (!value) return { value, label: "Clear this meal", meta: "", thumb: `<span class="meal-slot-thumb" aria-hidden="true">${icon("x")}</span>` };
      if (value === TAKEOUT_PREFIX) {
        return { value, label: "Takeout", meta: "Eating out", thumb: '<span class="meal-slot-thumb" aria-hidden="true">🥡</span>' };
      }
      const recipe = recipeById(value);
      const summary = slotSummary(value);
      return {
        value,
        label: option.textContent,
        meta: [recipe?.category, summary.note].filter(Boolean).join(" · "),
        thumb: mealThumbMarkup(summary)
      };
    });
  // "Build a plate" sits right after Takeout, above the recipes.
  items.splice(items.findIndex((item) => item.value === TAKEOUT_PREFIX) + 1, 0, {
    value: PLATE_PICK,
    label: currentIsPlate ? "Edit plate" : "Build a plate",
    meta: "A protein, a veggie and a side",
    thumb: `<span class="meal-slot-thumb" aria-hidden="true">${icon("utensils")}</span>`
  });
  const selectedValue = isTakeoutValue(current) ? TAKEOUT_PREFIX : currentIsPlate ? PLATE_PICK : current;

  // ---- Plate draft: what the three fields hold until "Save plate". A meal that
  // already has a recipe starts with it as the protein.
  const draft = currentIsPlate
    ? { ...slotPlate(getCurrentPlan(), day, meal) }
    : recipeById(current) ? { protein: { type: "recipe", id: current } } : {};
  let view = "main"; // "main" | "plate" | a plate role key

  // Each field leads with the likely picks; anything else is a search away.
  const byName = (a, b) => a.name.localeCompare(b.name);
  const ingredientsList = Object.values(state.ingredients).sort(byName);
  const recipesList = [...state.recipes].sort(byName);
  const ingredientsIn = (...categories) => ingredientsList.filter((ingredient) => categories.includes(ingredientCategory(ingredient)));
  const recipesIn = (...categories) => recipesList.filter((recipe) => categories.includes(recipe.category));
  const roleGroups = {
    protein: [["Main dishes", recipesIn("Breakfast", "Lunch", "Dinner")], ["Proteins", ingredientsIn("Meat & seafood")]],
    veggie: [["Veggies", ingredientsIn("Produce", "Frozen")], ["Side dishes", recipesIn("Side")]],
    side: [["Side dishes", recipesIn("Side")], ["Grains & more", ingredientsIn("Bakery & grains", "Canned & dry goods")]]
  };
  const asPick = (entry) => (entry.key && state.ingredients[entry.key] === entry
    ? { type: "ingredient", key: entry.key }
    : { type: "recipe", id: entry.id });
  const pickMeta = (pick) => {
    if (pick.type === "recipe") {
      const recipe = recipeById(pick.id);
      return [recipe?.category, recipe ? `Serves ${formatQuantity(Number(recipe.servings || 1))}` : ""].filter(Boolean).join(" · ");
    }
    const ingredient = state.ingredients[pick.key];
    return ingredient?.serving ? `per ${ingredient.serving}` : "";
  };
  const roleItems = (role) => {
    const featured = roleGroups[role].flatMap(([group, entries]) => entries.map((entry) => ({ group, featured: true, pick: asPick(entry) })));
    const rest = [
      ...recipesList.map((recipe) => ({ type: "recipe", id: recipe.id })),
      ...ingredientsList.map((ingredient) => ({ type: "ingredient", key: ingredient.key }))
    ]
      .filter((pick) => !featured.some((item) => samePick(item.pick, pick)))
      .map((pick) => ({ group: "Everything else", featured: false, pick }));
    return [...featured, ...rest].map((item) => ({ ...item, label: pickSummary(item.pick).label, meta: pickMeta(item.pick) }));
  };

  const element = document.createElement("div");
  element.className = "meal-picker";
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-label", `Choose ${meal.toLowerCase()} for ${day}`);
  element.innerHTML = `
    <div class="meal-picker-head">
      <button class="meal-picker-back" type="button" hidden>${icon("chevron-left")}<span></span></button>
      <strong>${escapeHtml(`${day} · ${meal}`)}</strong>
      <button class="meal-picker-close" type="button" aria-label="Close">${icon("x")}</button>
    </div>
    <div class="plate-builder" hidden>
      <p class="plate-builder-title">Build a plate</p>
      <div class="plate-fields">
        ${plateRoles.map((role) => `<button class="plate-field" type="button" data-plate-role="${role.key}"></button>`).join("")}
      </div>
      <div class="meal-picker-foot">
        <button class="primary-button plate-save" type="button">Save plate</button>
      </div>
    </div>
    <input class="meal-picker-search" type="search" placeholder="Search recipes" aria-label="Search recipes" autocomplete="off" />
    <ul class="meal-picker-list is-main" role="listbox" aria-label="Recipes">
      ${items.map((item, index) => `
        <li class="meal-picker-option${item.value ? "" : " is-clear"}${item.value === PLATE_PICK ? " is-plate" : ""}" role="option" id="meal-picker-option-${index}" data-value="${escapeHtml(item.value)}"
          aria-selected="${item.value === selectedValue && item.value !== ""}" data-search="${escapeHtml(item.label.toLowerCase())}">
          ${item.thumb}
          <span class="meal-picker-text">
            <span class="meal-picker-name">${escapeHtml(item.label)}</span>
            ${item.meta ? `<span class="meal-picker-meta">${escapeHtml(item.meta)}</span>` : ""}
          </span>
          ${item.value && item.value === selectedValue ? `<span class="meal-picker-check" aria-hidden="true">${icon("check")}</span>` : ""}
        </li>`).join("")}
    </ul>
    <ul class="meal-picker-list is-role" role="listbox" hidden></ul>
    <p class="meal-picker-empty" hidden>No recipes match.</p>`;
  document.body.append(element);

  const search = element.querySelector(".meal-picker-search");
  const mainList = element.querySelector(".meal-picker-list.is-main");
  const roleList = element.querySelector(".meal-picker-list.is-role");
  const builder = element.querySelector(".plate-builder");
  const back = element.querySelector(".meal-picker-back");
  const empty = element.querySelector(".meal-picker-empty");
  let list = mainList;
  let roleEntries = [];
  const options = () => [...list.querySelectorAll(".meal-picker-option:not([hidden])")];
  let active = null;

  const setActive = (option) => {
    list.querySelectorAll(".meal-picker-option.is-active").forEach((item) => item.classList.remove("is-active"));
    active = option || null;
    if (!active) return search.removeAttribute("aria-activedescendant");
    active.classList.add("is-active");
    search.setAttribute("aria-activedescendant", active.id);
    active.scrollIntoView({ block: "nearest" });
  };

  // Unsearched, a field's list keeps to its likely groups; a search covers everything.
  const applySearch = () => {
    const query = search.value.trim().toLowerCase();
    list.querySelectorAll(".meal-picker-option").forEach((option) => {
      if (list === roleList) {
        option.hidden = option.classList.contains("is-clear")
          ? Boolean(query)
          : query ? !option.dataset.search.includes(query) : option.dataset.featured !== "true";
      } else {
        option.hidden = Boolean(query) && (!option.dataset.value || !option.dataset.search.includes(query));
      }
    });
    list.querySelectorAll(".meal-picker-group").forEach((header) => {
      let next = header.nextElementSibling;
      let visible = false;
      while (next && !next.classList.contains("meal-picker-group")) {
        if (!next.hidden) visible = true;
        next = next.nextElementSibling;
      }
      header.hidden = !visible;
    });
    empty.hidden = list === null || options().length > 0;
    setActive(query ? options()[0] : null);
  };

  const renderPlateFields = () => {
    builder.querySelectorAll("[data-plate-role]").forEach((field) => {
      const role = plateRoles.find((item) => item.key === field.dataset.plateRole);
      const pick = draft[role.key];
      const summary = pick ? pickSummary(pick) : null;
      field.dataset.filled = String(Boolean(pick));
      field.setAttribute("aria-label", `${role.label}: ${summary ? summary.label : "not chosen"}. Change`);
      field.innerHTML = `
        ${summary ? mealThumbMarkup(summary) : `<span class="meal-slot-thumb" aria-hidden="true">${icon("plus")}</span>`}
        <span class="plate-field-text">
          <span class="plate-field-label">${escapeHtml(role.label)}</span>
          <span class="plate-field-value">${escapeHtml(summary ? summary.label : role.empty)}</span>
        </span>
        <span class="plate-field-chevron" aria-hidden="true">${icon("chevron-right")}</span>`;
    });
    builder.querySelector(".plate-save").disabled = !draft.protein;
  };

  const renderRoleList = (roleKey) => {
    const role = plateRoles.find((item) => item.key === roleKey);
    roleEntries = roleItems(roleKey);
    roleList.setAttribute("aria-label", role.label);
    let lastGroup = "";
    const chosen = draft[roleKey];
    roleList.innerHTML = `
      ${chosen ? `<li class="meal-picker-option is-clear" role="option" id="meal-picker-role-clear" data-clear="true" aria-selected="false">
          <span class="meal-slot-thumb" aria-hidden="true">${icon("x")}</span>
          <span class="meal-picker-text"><span class="meal-picker-name">No ${escapeHtml(role.label.toLowerCase())}</span></span>
        </li>` : ""}
      ${roleEntries.map((item, index) => {
        const header = item.group !== lastGroup
          ? `<li class="meal-picker-group" role="presentation">${escapeHtml(item.group)}</li>`
          : "";
        lastGroup = item.group;
        const selected = Boolean(chosen && samePick(chosen, item.pick));
        return `${header}
          <li class="meal-picker-option" role="option" id="meal-picker-role-${index}" data-role-index="${index}" data-featured="${item.featured}"
            aria-selected="${selected}" data-search="${escapeHtml(`${item.label} ${item.meta}`.toLowerCase())}">
            ${mealThumbMarkup(pickSummary(item.pick))}
            <span class="meal-picker-text">
              <span class="meal-picker-name">${escapeHtml(item.label)}</span>
              ${item.meta ? `<span class="meal-picker-meta">${escapeHtml(item.meta)}</span>` : ""}
            </span>
            ${selected ? `<span class="meal-picker-check" aria-hidden="true">${icon("check")}</span>` : ""}
          </li>`;
      }).join("")}`;
  };

  // Three views share the sheet: the meal list, the plate's three fields, and a
  // field's own list of choices.
  const showView = (next) => {
    view = next;
    const isRole = plateRoles.some((role) => role.key === view);
    builder.hidden = view !== "plate";
    mainList.hidden = view !== "main";
    roleList.hidden = !isRole;
    search.hidden = view === "plate";
    list = view === "main" ? mainList : isRole ? roleList : null;
    back.hidden = view === "main";
    back.querySelector("span").textContent = isRole ? "Plate" : "Meals";
    back.setAttribute("aria-label", isRole ? "Back to the plate" : "Back to the meal list");
    element.classList.toggle("is-plate", view !== "main");
    if (view === "plate") renderPlateFields();
    if (isRole) renderRoleList(view);
    const role = plateRoles.find((item) => item.key === view);
    search.placeholder = role ? `Search for a ${role.label.toLowerCase()}` : "Search recipes";
    search.setAttribute("aria-label", search.placeholder);
    empty.textContent = role ? "Nothing matches." : "No recipes match.";
    search.value = "";
    if (list) applySearch();
    else {
      empty.hidden = true;
      active = null;
    }
    if (!isNarrowLayout()) (list ? search : builder.querySelector(".plate-field"))?.focus({ preventScroll: true });
    place();
  };

  const choose = (value) => {
    if (value === PLATE_PICK) return showView("plate");
    closeMealPicker();
    if (value === current || (value === TAKEOUT_PREFIX && isTakeoutValue(current))) return;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const pickForRole = (option) => {
    if (option.dataset.clear) delete draft[view];
    else {
      const item = roleEntries[Number(option.dataset.roleIndex)];
      if (item) draft[view] = item.pick;
    }
    showView("plate");
  };

  const savePlate = () => {
    if (!draft.protein || !requireCloudWrite()) return;
    const plan = getCurrentPlan();
    setSlotPlate(plan, day, meal, draft);
    plan[day][meal] = PLATE_VALUE;
    closeMealPicker();
    saveState();
    renderAll();
  };

  // Beside the slot on wide screens (flipping above it near the bottom of the
  // window); phones get a sheet from the bottom edge via CSS instead.
  function place() {
    if (isNarrowLayout()) {
      element.classList.add("is-sheet");
      element.style.cssText = "";
      return;
    }
    element.classList.remove("is-sheet");
    const rect = (mealPicker?.trigger || trigger).getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const openUp = below < 320 && above > below;
    const maxHeight = Math.max(220, Math.min(440, openUp ? above : below));
    element.style.left = `${left}px`;
    element.style.width = `${width}px`;
    element.style.maxHeight = `${maxHeight}px`;
    element.style.top = openUp ? "" : `${rect.bottom + 6}px`;
    element.style.bottom = openUp ? `${window.innerHeight - rect.top + 6}px` : "";
  }
  place();

  search.addEventListener("input", applySearch);

  search.addEventListener("keydown", (event) => {
    const visible = options();
    const index = visible.indexOf(active);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(visible[Math.min(visible.length - 1, index + 1)] || visible[0]);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(visible[Math.max(0, index - 1)] || visible[0]);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (active && list === roleList) pickForRole(active);
      else if (active) choose(active.dataset.value);
    }
  });

  mainList.addEventListener("click", (event) => {
    const option = event.target.closest(".meal-picker-option");
    if (option) choose(option.dataset.value);
  });
  roleList.addEventListener("click", (event) => {
    const option = event.target.closest(".meal-picker-option");
    if (option) pickForRole(option);
  });
  builder.querySelectorAll("[data-plate-role]").forEach((field) => {
    field.addEventListener("click", () => showView(field.dataset.plateRole));
  });
  builder.querySelector(".plate-save").addEventListener("click", savePlate);
  back.addEventListener("click", () => showView(view === "plate" ? "main" : "plate"));
  element.querySelector(".meal-picker-close").addEventListener("click", () => closeMealPicker({ restoreFocus: true }));

  const onPointerDown = (event) => {
    if (!element.contains(event.target) && !(mealPicker?.trigger || trigger).contains(event.target)) closeMealPicker();
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") closeMealPicker({ restoreFocus: true });
  };
  const onScroll = (event) => {
    if (!element.contains(event.target)) place();
  };
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", place);
  window.addEventListener("scroll", onScroll, true);
  mealPicker = {
    element,
    trigger,
    cleanup: () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    }
  };

  // Typing straight away is handy with a keyboard; on a phone it would throw
  // the keyboard over the list, so the sheet opens without focusing search.
  if (!isNarrowLayout()) search.focus({ preventScroll: true });
  mainList.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
}

function mealSlotMarkup(day, meal, value, isToday = false, plate = {}) {
  const takeout = isTakeoutValue(value);
  const summary = slotSummary(value, plate);
  const filled = summary.kind !== "empty";
  const thumb = mealThumbMarkup(summary);
  const emptyLabel = isToday ? "Pick a recipe" : `Add ${meal.toLowerCase()}`;

  return `
    <div class="meal-slot" data-filled="${filled}" data-kind="${summary.kind}" data-takeout="${takeout}" data-meal="${meal}">
      <div class="meal-slot-main">
        ${thumb}
        <span class="meal-slot-text" aria-hidden="true">
          <span class="meal-slot-label">${meal}</span>
          <span class="meal-slot-value">${filled ? escapeHtml(summary.label) : emptyLabel}</span>
          ${filled && summary.note ? `<span class="meal-slot-meta">${escapeHtml(summary.note)}</span>` : ""}
        </span>
        <span class="meal-slot-chevron" aria-hidden="true">${icon("chevron-down")}</span>
        <select class="meal-slot-select" id="${day}-${meal}" aria-hidden="true" tabindex="-1" data-day="${day}" data-meal="${meal}">
          ${recipeOptions(value)}
        </select>
        <button class="meal-slot-open" type="button" data-pick-meal="${day}-${meal}" aria-haspopup="dialog"
          aria-label="${escapeHtml(`${day} ${meal}: ${filled ? `${summary.label}${summary.kind === "plate" && summary.note ? ` ${summary.note}` : ""}` : "nothing planned"}. Choose a recipe`)}"></button>
      </div>
      <input
        class="takeout-name"
        type="text"
        aria-label="${day} ${meal} restaurant"
        placeholder="Where from?"
        data-day="${day}"
        data-meal="${meal}"
        value="${escapeHtml(takeoutName(value))}"
        ${takeout ? "" : "hidden"}
      />
    </div>`;
}

function renderPlanner() {
  // A redraw (often just the echo of a save from the open picker) replaces the
  // button that opened it; the picker moves over to the new one instead of closing.
  const pickerOpener = mealPicker?.trigger;
  const pickerSelector = pickerOpener?.dataset.pickMeal ? `[data-pick-meal="${pickerOpener.dataset.pickMeal}"]` : null;
  if (mealPicker && !document.getElementById("week-grid").contains(pickerOpener)) closeMealPicker();
  const planner = ensureActivePlanner();
  const plan = getCurrentPlan();
  const grid = document.getElementById("week-grid");
  const strip = document.getElementById("day-strip");
  const todayKey = dateKey(new Date());
  const dayIndex = activeDayIndex();

  grid.dataset.plannerMode = plannerMode;
  document.getElementById("planner-view").dataset.hasPlanner = String(Boolean(planner));

  if (!planner) {
    strip.innerHTML = "";
    grid.innerHTML = `
      <div class="planner-empty">
        <span class="planner-empty-icon" aria-hidden="true">🗓️</span>
        <strong>No planner selected</strong>
        <p>Create a planner or join one from your household to start filling in meals.</p>
        <button class="primary-button" data-open-planners type="button">Household planners</button>
      </div>`;
    grid.querySelector("[data-open-planners]")?.addEventListener("click", () => {
      document.getElementById("manage-planners")?.click();
    });
    return;
  }

  const filledCounts = days.map((day) => meals.filter((meal) => plan[day]?.[meal]).length);

  strip.innerHTML = days
    .map((day, index) => {
      const date = addDays(selectedWeekStart, index);
      const dots = meals
        .map((meal) => `<i class="day-pill-dot"${plan[day]?.[meal] ? ' data-on="true"' : ""}></i>`)
        .join("");
      return `
        <button
          class="day-pill"
          type="button"
          data-day-index="${index}"
          data-today="${dateKey(date) === todayKey}"
          aria-pressed="${index === dayIndex}"
          aria-label="${day} ${formatDayDate(date)}, ${filledCounts[index]} of ${meals.length} meals planned"
        >
          <span class="day-pill-name">${day.slice(0, 3)}</span>
          <span class="day-pill-date">${date.getDate()}</span>
          <span class="day-pill-dots" aria-hidden="true">${dots}</span>
        </button>`;
    })
    .join("");

  // One row per day on wide screens (a header row names the meal columns); the
  // same markup on a phone puts today's card first, then the rest of the week
  // as a compact table under "This week" (CSS orders the pieces). Days already
  // gone this week are flagged so the table can mute them.
  const todayIndex = isCurrentWeek() ? (new Date().getDay() + 6) % 7 : -1;
  const head = `<div class="plan-head" aria-hidden="true"><span></span>${meals.map((meal) => `<span>${meal}</span>`).join("")}</div>`;
  const weekTitle = todayIndex >= 0 ? '<h3 class="plan-coming-up">This week</h3>' : "";
  grid.innerHTML = weekTitle + head + days
    .map((day, index) => {
      const date = addDays(selectedWeekStart, index);
      const filled = filledCounts[index];
      const isToday = dateKey(date) === todayKey;
      const slots = meals.map((meal) => mealSlotMarkup(day, meal, plan[day]?.[meal] || "", isToday, slotPlate(plan, day, meal))).join("");
      // The phone table keeps a read-only row for today in its place; today's
      // card above it is where those meals are edited, so the row jumps there.
      const todayRow = isToday
        ? `<button type="button" class="plan-today-row" aria-label="Today's meals">
            <span class="day-row-label"><span class="day-row-number">${date.getDate()}</span><span class="day-row-name">Today</span></span>
            ${meals.map((meal) => {
              const summary = slotSummary(plan[day]?.[meal] || "", slotPlate(plan, day, meal));
              return `<span class="plan-today-cell" data-filled="${summary.kind !== "empty"}">${mealThumbMarkup(summary)}<span class="meal-slot-value">${escapeHtml(summary.label)}</span></span>`;
            }).join("")}
          </button>`
        : "";

      return `${todayRow}
        <article
          class="day-column"
          data-day="${day}"
          data-today="${isToday}"
          data-past="${todayIndex >= 0 && index < todayIndex}"
          data-selected="${index === dayIndex}"
        >
          <header class="day-column-header">
            <div class="day-row-label" aria-hidden="true">
              <span class="day-row-number">${date.getDate()}</span>
              <span class="day-row-name">${isToday ? "Today" : day.slice(0, 3)}</span>
            </div>
            <div class="day-column-title">
              <h3>${isToday ? '<span class="day-today-prefix">Today, </span>' : ""}${day}</h3>
              <span class="day-date">${formatDayDate(date)}</span>
            </div>
            <span class="day-badge" data-complete="${filled === meals.length}"><span class="day-badge-short">${filled}/${meals.length}</span><span class="day-badge-long">${filled} of ${meals.length} planned</span></span>
          </header>
          <div class="day-column-slots">${slots}</div>
        </article>`;
    })
    .join("");

  grid.querySelector(".plan-today-row")?.addEventListener("click", () => {
    grid.querySelector('.day-column[data-today="true"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  strip.querySelectorAll(".day-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      selectedDayIndex = Number(pill.dataset.dayIndex);
      renderPlanner();
    });
  });

  // Centre the strip on the open day, but only when it changes, so a background
  // sync never yanks the strip out from under a scroll in progress.
  if (dayIndex !== lastCentredDayIndex) {
    lastCentredDayIndex = dayIndex;
    const active = strip.children[dayIndex];
    if (active) strip.scrollLeft = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
  }

  grid.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      if (!requireCloudWrite()) {
        renderAll();
        return;
      }
      const slot = select.closest(".meal-slot");
      const nameInput = slot?.querySelector(".takeout-name");
      const value = select.value === TAKEOUT_PREFIX ? takeoutValue(nameInput?.value || "") : select.value;
      const plan = getCurrentPlan();
      // Picking a recipe, takeout or nothing replaces a plate that was there.
      setSlotPlate(plan, select.dataset.day, select.dataset.meal, {});
      plan[select.dataset.day][select.dataset.meal] = value;
      saveState();
      renderAll();
      if (isTakeoutValue(value)) {
        document
          .getElementById(`${select.dataset.day}-${select.dataset.meal}`)
          ?.closest(".meal-slot")
          ?.querySelector(".takeout-name")
          ?.focus();
      }
    });
  });

  grid.querySelectorAll("[data-pick-meal]").forEach((button) => {
    button.addEventListener("click", () => openMealPicker(button));
  });

  grid.querySelectorAll(".takeout-name").forEach((input) => {
    input.addEventListener("change", () => {
      if (!requireCloudWrite()) {
        renderAll();
        return;
      }
      getCurrentPlan()[input.dataset.day][input.dataset.meal] = takeoutValue(input.value);
      saveState();
      renderAll();
    });
  });

  if (mealPicker && pickerSelector) {
    const opener = grid.querySelector(pickerSelector);
    if (opener) mealPicker.trigger = opener;
    else closeMealPicker();
  }

  // Re-rendering the grid replaces the controls, so re-apply the write lock here
  // rather than only from renderAll - the day strip re-renders on its own too.
  updateDataControls();
}

function setupPlannerLayout() {
  document.querySelectorAll(".planner-mode").forEach((button) => {
    button.addEventListener("click", () => {
      plannerMode = button.dataset.plannerMode;
      document.querySelectorAll(".planner-mode").forEach((mode) => {
        const active = mode.dataset.plannerMode === plannerMode;
        mode.classList.toggle("active", active);
        mode.setAttribute("aria-pressed", String(active));
      });
      renderPlanner();
    });
  });

  // Swiping between days is the fastest way to move around the single-day layout.
  const grid = document.getElementById("week-grid");
  let startX = 0;
  let startY = 0;
  let tracking = false;

  grid.addEventListener(
    "touchstart",
    (event) => {
      tracking = plannerMode === "day" && event.touches.length === 1;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    },
    { passive: true }
  );

  grid.addEventListener(
    "touchend",
    (event) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      if (Math.abs(deltaX) < 60 || Math.abs(touch.clientY - startY) > 50) return;
      const next = activeDayIndex() + (deltaX < 0 ? 1 : -1);
      if (next < 0 || next > days.length - 1) return;
      selectedDayIndex = next;
      renderPlanner();
    },
    { passive: true }
  );
}

// "piece" is the stored value for a bare count ("3 Potatoes", "1 Egg Yolk"); it is
// labelled and displayed as no unit at all, so the number sits beside the name.
const countOnlyUnit = "piece";

function unitLabel(unit) {
  return unit === countOnlyUnit ? "No unit" : unit;
}

// Every dropdown in the app is built from one of the shared indexes — saved
// recipes, their categories, the ingredient catalogue, or the unit list — through
// these helpers, so no two lists can drift apart.
function optionMarkup(value, label, selected = "", extra = "") {
  return `<option value="${escapeHtml(value)}"${String(selected) === String(value) ? " selected" : ""}${extra}>${escapeHtml(label)}</option>`;
}

function unitOptionsMarkup({ selected = "", lead = "", extraUnit = "", includeOther = false } = {}) {
  const groups = servingUnits
    .map((section) => {
      const options = section.units.map((unit) => optionMarkup(unit, unitLabel(unit), selected)).join("");
      return `<optgroup label="${escapeHtml(section.group)}">${options}</optgroup>`;
    })
    .join("");

  // An ingredient saved with a unit of its own ("sprig") still needs to be pickable.
  const custom = extraUnit && !knownServingUnit(normalizeMeasurementUnit(extraUnit))
    ? `<optgroup label="Ingredient unit">${optionMarkup(extraUnit, extraUnit, selected)}</optgroup>`
    : "";
  const other = includeOther ? optionMarkup(customServingUnit, "Other...", selected) : "";
  return lead + groups + custom + other;
}

// The built-in categories plus any others the saved recipes actually use, so
// an imported "Brunch" survives instead of being coerced to Dinner.
function recipeCategories() {
  const used = state.recipes.map((recipe) => recipe.category).filter(Boolean);
  return [...new Set([...defaultRecipeCategories, ...used])].sort((a, b) => a.localeCompare(b));
}

// Meal slots are for meals: desserts and drinks stay out of the picker, except one that is
// already planned so an existing week never loses its selection.
const plannerExcludedCategories = new Set(["Dessert", "Drink", "Drinks"]);

function plannerRecipeOptionList(selectedId) {
  return state.recipes.filter((recipe) => recipe.id === selectedId || !plannerExcludedCategories.has(recipe.category));
}

function recipeOptions(selectedId = "") {
  return [
    '<option value="">Choose a recipe</option>',
    `<option value="${TAKEOUT_PREFIX}" ${isTakeoutValue(selectedId) ? "selected" : ""}>Takeout</option>`,
    ...plannerRecipeOptionList(selectedId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((recipe) => `<option value="${recipe.id}" ${recipe.id === selectedId ? "selected" : ""}>${escapeHtml(recipe.name)}</option>`)
  ].join("");
}

function renderCategories() {
  const categories = recipeCategories();
  // The editor offers every assignable category, and keeps whatever is selected.
  const editor = document.getElementById("recipe-category");
  const chosen = editor.value || "Dinner";
  const assignable = categories.includes(chosen) ? categories : [...categories, chosen].sort((a, b) => a.localeCompare(b));
  editor.innerHTML = assignable.map((category) => optionMarkup(category, category, chosen)).join("");
  editor.value = chosen;
}

function renderRecipeEditor() {
  renderCategories();
}

function deleteRecipe(id) {
  const removed = recipeById(id);
  if (removed?.imagePath) void deleteStoredImage(removed.imagePath);
  state.recipes = state.recipes.filter((recipe) => recipe.id !== id);
  if (openRecipeId === id) openRecipeId = null;
  planners().forEach((planner) => {
    Object.values(planner.plans).forEach((plan) => {
      days.forEach((day) => {
        meals.forEach((meal) => {
          if (plan[day][meal] === id) plan[day][meal] = "";
        });
      });
    });
  });
  saveState();
  renderAll();
}

function setupIngredientMentions(container) {
  container.querySelectorAll(".ingredient-mention").forEach((button) => {
    const toggleMention = (event) => {
      event.stopPropagation();
      const shouldOpen = button.dataset.open !== "true";
      container.querySelectorAll('.ingredient-mention[data-open="true"]').forEach((mention) => delete mention.dataset.open);
      if (shouldOpen) button.dataset.open = "true";
    };
    button.addEventListener("click", toggleMention);
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleMention(event);
    });
  });
}

function renderRecipes() {
  const view = document.getElementById("recipes-view");
  const catalogue = document.getElementById("recipe-catalogue");
  const detail = document.getElementById("recipe-detail");
  const filters = document.getElementById("recipe-filters");
  const search = document.getElementById("recipe-search").value.trim().toLowerCase();
  const selectedRecipe = openRecipeId ? recipeById(openRecipeId) : null;
  if (view.classList.contains("active")) syncRoute();

  // Reading a recipe swaps the collection header for the recipe's own back link.
  view.classList.toggle("is-reading", Boolean(selectedRecipe));

  if (selectedRecipe) {
    catalogue.hidden = true;
    filters.hidden = true;
    detail.hidden = false;
    detail.innerHTML = recipeDetailMarkup(selectedRecipe);
    setupCloudImageDiagnostics(detail);
    watchRecipeTitleFit(detail.querySelector(".recipe-hero-body h2"));
    detail.querySelector("[data-back-to-recipes]").addEventListener("click", () => {
      openRecipeId = null;
      renderRecipes();
    });
    detail.querySelectorAll("[data-edit-open-recipe]").forEach((button) => {
      button.addEventListener("click", () => showRecipeEditor(selectedRecipe));
    });
    detail.querySelector("[data-cook-recipe]").addEventListener("click", () => cookRecipe(scaledRecipe(selectedRecipe, recipeScale(selectedRecipe.id))));
    detail.querySelectorAll("[data-recipe-scale]").forEach((button) => {
      button.addEventListener("click", () => {
        const value = Number(button.dataset.recipeScale);
        if (value === 1) recipeScales.delete(selectedRecipe.id);
        else recipeScales.set(selectedRecipe.id, value);
        const top = window.scrollY;
        renderRecipes();
        window.scrollTo({ top });
      });
    });
    detail.querySelector("[data-add-to-plan]").addEventListener("click", () => openAddToPlan(selectedRecipe));
    detail.querySelector("[data-undo-cook]")?.addEventListener("click", undoStockDeduction);
    detail.querySelectorAll("[data-ingredient-check]").forEach((box) => {
      box.addEventListener("change", () => {
        const checks = recipeIngredientChecks.get(selectedRecipe.id) || new Set();
        if (box.checked) checks.add(box.dataset.ingredientCheck);
        else checks.delete(box.dataset.ingredientCheck);
        recipeIngredientChecks.set(selectedRecipe.id, checks);
      });
    });
    setupIngredientMentions(detail);
    bindFavoriteButtons(detail);
    updateDataControls();
    return;
  }

  detail.hidden = true;
  catalogue.hidden = false;
  filters.hidden = false;

  // A remembered category no recipe uses any more would hide everything with no
  // chip left to clear it, so it is dropped once recipes have loaded.
  if (recipeCategoryFilter && state.recipes.length && !state.recipes.some((recipe) => recipe.category === recipeCategoryFilter)) {
    recipeCategoryFilter = "";
    saveRecipeFilters();
  }

  const searched = state.recipes.filter((recipe) => !search || recipeSearchText(recipe).includes(search));
  const ready = new Set(searched.filter((recipe) => recipeStockCoverage(recipe).ready).map((recipe) => recipe.id));
  const recipes = searched
    .filter((recipe) => !recipeCanMakeOnly || ready.has(recipe.id))
    .filter((recipe) => !recipeFavoritesOnly || isFavoriteRecipe(recipe.id))
    .filter((recipe) => !recipeCategoryFilter || recipe.category === recipeCategoryFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  filters.innerHTML = recipeFilterMarkup(recipes.length);
  filters.querySelector("[data-can-make]").addEventListener("click", () => {
    recipeCanMakeOnly = !recipeCanMakeOnly;
    saveRecipeFilters();
    renderRecipes();
  });
  filters.querySelector("[data-favorites-only]").addEventListener("click", () => {
    recipeFavoritesOnly = !recipeFavoritesOnly;
    saveRecipeFilters();
    renderRecipes();
  });
  filters.querySelectorAll("[data-category-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      recipeCategoryFilter = recipeCategoryFilter === chip.dataset.categoryFilter ? "" : chip.dataset.categoryFilter;
      saveRecipeFilters();
      renderRecipes();
    });
  });

  catalogue.innerHTML = recipes.length
    ? groupRecipesByCategory(recipes).map(recipeCategorySection).join("")
    : `<p class="empty-state">${
        recipeFavoritesOnly && !favoriteRecipeIds.size
          ? "No favorites yet. Tap the heart on a recipe to save it here."
          : recipeCanMakeOnly && !hasKitchenStock()
            ? "Add what is in your kitchen on the Pantry page to see what you can make right now."
            : "No recipes match."
      }</p>`;
  setupCloudImageDiagnostics(catalogue);
  bindFavoriteButtons(catalogue);
  catalogue.querySelectorAll("[data-open-recipe]").forEach((button) => {
    button.addEventListener("click", () => {
      openRecipeId = button.dataset.openRecipe;
      renderRecipes();
      window.scrollTo({ top: 0 });
    });
  });
}

// Recipes are found by name, category, or any ingredient they use.
function recipeSearchText(recipe) {
  const ingredients = (recipe.ingredients || []).map((item) => recipeIngredientParts(item).name || "").join(" ");
  return `${recipe.name} ${recipe.category} ${ingredients}`.toLowerCase();
}

function recipeFilterMarkup(shown) {
  const categories = recipeCategories().filter((category) => state.recipes.some((recipe) => recipe.category === category));
  const ordered = [
    ...categoryOrder.filter((category) => categories.includes(category)),
    ...categories.filter((category) => !categoryOrder.includes(category))
  ];
  const noun = `recipe${shown === 1 ? "" : "s"}`;
  const label = recipeCanMakeOnly
    ? `Showing ${shown} ${noun} you have everything for`
    : recipeFavoritesOnly || recipeCategoryFilter || document.getElementById("recipe-search").value.trim()
      ? `Showing ${shown} ${noun}`
      : `Showing all ${shown} ${noun}`;
  return `
    <button class="filter-chip can-make-chip" type="button" data-can-make aria-pressed="${recipeCanMakeOnly}">${recipeCanMakeOnly ? `${icon("check")} ` : ""}Can make now</button>
    <button class="filter-chip favorites-chip" type="button" data-favorites-only aria-pressed="${recipeFavoritesOnly}">${heartIcon}Favorites</button>
    ${ordered
      .map(
        (category) =>
          `<button class="filter-chip" type="button" data-category-filter="${escapeHtml(category)}" aria-pressed="${recipeCategoryFilter === category}">${escapeHtml(category)}</button>`
      )
      .join("")}
    <span class="recipe-filter-count">${label}</span>`;
}

function groupRecipesByCategory(recipes) {
  const groups = new Map();
  recipes.forEach((recipe) => {
    const category = recipe.category || "Uncategorised";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(recipe);
  });

  return [...groups.entries()]
    .map(([category, items]) => ({ category, recipes: items }))
    .sort((a, b) => {
      const rankA = categoryOrder.indexOf(a.category);
      const rankB = categoryOrder.indexOf(b.category);
      if (rankA !== rankB) return (rankA < 0 ? categoryOrder.length : rankA) - (rankB < 0 ? categoryOrder.length : rankB);
      return a.category.localeCompare(b.category);
    });
}

function recipeCategorySection(group) {
  return `
    <section class="recipe-category-group">
      <header class="recipe-category-heading">
        <h3>${escapeHtml(group.category)}</h3>
        <span>${group.recipes.length} recipe${group.recipes.length === 1 ? "" : "s"}</span>
      </header>
      <div class="recipe-category-grid">
        ${group.recipes.map(recipeCatalogueCard).join("")}
      </div>
    </section>`;
}

function recipeCatalogueCard(recipe) {
  const coverage = recipeStockCoverage(recipe);
  // The heart sits beside the card button, since a button cannot contain another.
  return `
    <div class="recipe-catalogue-item">
      <button class="recipe-catalogue-card${coverage.ready ? " is-ready" : ""}" data-open-recipe="${escapeHtml(recipe.id)}" type="button">
        ${recipeCatalogueVisual(recipe)}
        ${unlinkedIngredientAlert(recipe)}
        <strong class="recipe-catalogue-name">${escapeHtml(recipe.name)}</strong>
        ${recipeStatusMarkup(recipe, coverage)}
      </button>
      ${favoriteButtonMarkup(recipe)}
    </div>`;
}

// The line under a recipe: what the kitchen covers once there is stock to compare
// against, and the recipe's size before that.
function recipeStatusMarkup(recipe, coverage = recipeStockCoverage(recipe)) {
  if (coverage.total && hasKitchenStock()) {
    if (coverage.ready) return `<span class="recipe-status is-ready">${icon("check")} Can make now</span>`;
    return `<span class="recipe-status">${coverage.have} of ${coverage.total} in stock</span>`;
  }
  return `<span class="recipe-status">${recipe.ingredients?.length || 0} ingredients · Serves ${formatQuantity(Number(recipe.servings || 1))}</span>`;
}

// Typed-in ingredients (and links to ingredients since deleted) carry no
// nutrition or stock data, so flag the recipe until they are added to the list.
function unlinkedIngredients(recipe) {
  return (recipe.ingredients || []).filter((item) => item && (typeof item === "string" || !state.ingredients[item.key]));
}

function unlinkedIngredientAlert(recipe) {
  const unlinked = unlinkedIngredients(recipe);
  if (!unlinked.length) return "";
  const names = unlinked.map((item) => recipeIngredientParts(item).name || item.name || "Ingredient");
  const label = `${unlinked.length} ingredient${unlinked.length === 1 ? "" : "s"} not in your ingredient list: ${names.join(", ")}`;
  return `<span class="recipe-unlinked-alert" role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">!</span>`;
}

// Silent until there is stock to compare against, so an empty kitchen does not
// stamp "0 of 5" on every recipe you own.
function stockCoverageBadge(coverage) {
  if (!coverage.total || !hasKitchenStock()) return "";
  if (coverage.ready) return `<span class="stock-pill is-ready">${icon("check")} Can make now</span>`;
  if (!coverage.have) return "";
  return `<span class="stock-pill">${coverage.have} of ${coverage.total} in stock</span>`;
}

function recipeCatalogueVisual(recipe) {
  const image = recipeImage(recipe);
  if (image) {
    return `<span class="recipe-catalogue-visual has-image" aria-hidden="true"><img class="recipe-catalogue-image" src="${escapeHtml(image)}" alt="" loading="lazy" data-cloud-image data-image-label="${escapeHtml(recipe.name)}" /></span>`;
  }
  return '<span class="recipe-catalogue-visual" aria-hidden="true"></span>';
}

// ---- Recipe scaling ---------------------------------------------------------
// The recipe page can show half, double or triple amounts. The saved recipe never
// changes; the page renders a scaled copy instead.
const recipeScaleOptions = [
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 3, label: "3×" }
];
// Per recipe, for this visit: reopening a recipe keeps the size you picked.
const recipeScales = new Map();

function recipeScale(recipeId) {
  return recipeScales.get(recipeId) || 1;
}

// "1 1/2 cups flour" x2 -> "3 cups flour". Only the leading amount is scaled, and a
// word unit after it is re-pluralised to match.
function scaleIngredientText(text, factor) {
  const match = String(text).match(/^(\s*)((?:\d+\s+)?[\d./¼-¾⅐-⅞]+)(\s+)([A-Za-z]+)?/);
  if (!match) return text;
  const quantity = parseFractionInput(match[2]);
  if (!(quantity > 0)) return text;
  const scaled = formatQuantity(roundTo(quantity * factor, 3));
  const word = match[4] || "";
  const unit = word ? normalizeMeasurementUnit(word) : "";
  const unitText = unit && (knownServingUnit(unit) || unit === "container") ? pluralizeUnit(unit, quantity * factor) : word;
  return `${match[1]}${scaled}${match[3]}${unitText}${String(text).slice(match[0].length)}`;
}

function scaledRecipe(recipe, factor) {
  if (factor === 1) return recipe;
  const copy = {
    ...recipe,
    servings: Number(recipe.servings || 1) * factor,
    ingredients: (recipe.ingredients || []).map((item) =>
      typeof item === "string" ? scaleIngredientText(item, factor) : item && typeof item === "object" ? { ...item, quantity: Number(item.quantity || 0) * factor } : item
    )
  };
  // Recipes without linked ingredients carry their nutrition as stored totals.
  nutrients.forEach((nutrient) => {
    const value = Number(recipe[nutrient.key]);
    if (Number.isFinite(value) && recipe[nutrient.key] !== undefined && recipe[nutrient.key] !== "") copy[nutrient.key] = value * factor;
  });
  return copy;
}

function recipeScaleMarkup(recipe) {
  const current = recipeScale(recipe.id);
  return `
    <div class="recipe-scale" role="group" aria-label="Recipe size">
      ${recipeScaleOptions
        .map((option) => `<button class="recipe-scale-option" type="button" data-recipe-scale="${option.value}" aria-pressed="${option.value === current}">${option.label}</button>`)
        .join("")}
    </div>`;
}

// Recipe titles try to stay on one line: a title that would wrap is shrunk just
// enough to fit, saving a line of height on phones. Below 60% of the normal size
// (or 22px) it would get hard to read, so a very long title wraps at that size.
const RECIPE_TITLE_MIN_SCALE = 0.6;
const RECIPE_TITLE_MIN_PX = 22;
let recipeTitleObserver = null;

function fitRecipeTitle(title) {
  if (!title?.isConnected) return;
  title.style.fontSize = "";
  title.style.whiteSpace = "nowrap";
  const available = title.clientWidth;
  // Hidden (another tab is showing): the observer re-fits once it has a width.
  if (!available) {
    title.style.whiteSpace = "";
    return;
  }
  const needed = title.scrollWidth;
  if (needed <= available) return;

  const base = parseFloat(getComputedStyle(title).fontSize);
  const min = Math.max(base * RECIPE_TITLE_MIN_SCALE, RECIPE_TITLE_MIN_PX);
  // Text width scales with font size; the small margin covers rounding.
  const fitted = Math.floor(base * (available / needed) * 0.98 * 2) / 2;
  if (fitted >= min) {
    title.style.fontSize = `${fitted}px`;
  } else {
    title.style.fontSize = `${min}px`;
    title.style.whiteSpace = "";
  }
}

function watchRecipeTitleFit(title) {
  recipeTitleObserver?.disconnect();
  if (!title) return;
  // Fires when the title first gets a width (tab shown) and on every resize;
  // the fit only changes its height, so it can't trigger itself.
  recipeTitleObserver = new ResizeObserver(() => fitRecipeTitle(title));
  recipeTitleObserver.observe(title);
  // Gloock is wider than the fallback font, so measure again once it loads.
  document.fonts?.ready.then(() => fitRecipeTitle(title));
}

function recipeDetailMarkup(savedRecipe) {
  const scale = recipeScale(savedRecipe.id);
  const recipe = scaledRecipe(savedRecipe, scale);
  const macros = recipeMacros(recipe);
  const containers = recipeContainers(recipe);
  const steps = recipeSteps(recipe);
  const image = recipeImage(recipe);
  const coverage = recipeStockCoverage(recipe);
  const checks = recipeIngredientChecks.get(recipe.id) || new Set();
  const servings = formatQuantity(Number(recipe.servings || 1));
  // Shared across the steps so a repeated ingredient takes its amounts in order.
  const mentionsSeen = new Map();
  // Only flag lines once there is a pantry to compare against.
  const showStockFlags = coverage.total > 0 && hasKitchenStock();
  const stockLine = showStockFlags
    ? coverage.ready
      ? `<p class="recipe-hero-stock is-ready">${icon("check")} Everything is in your kitchen</p>`
      : `<p class="recipe-hero-stock">${coverage.have} of ${coverage.total} ingredients in your kitchen</p>`
    : "";

  return `
    <button class="back-link" data-back-to-recipes type="button">${icon("arrow-left")} <span class="back-link-label">All recipes</span></button>
    <div class="recipe-hero">
      <div class="recipe-hero-photo">
        ${image ? `<img class="recipe-detail-image" src="${escapeHtml(image)}" alt="${escapeHtml(recipe.name)}" data-cloud-image data-image-label="${escapeHtml(recipe.name)}" />` : ""}
      </div>
      <div class="recipe-hero-body">
        <div class="recipe-hero-topline">
          <p class="eyebrow">${escapeHtml(recipe.category || "Recipe")} · Serves ${servings}${scale === 1 ? "" : ` · ${escapeHtml(recipeScaleOptions.find((option) => option.value === scale)?.label || `${scale}×`)} recipe`}</p>
          <div class="recipe-hero-icons">
            ${favoriteButtonMarkup(recipe)}
            <button class="recipe-hero-icon-button" data-edit-open-recipe type="button" aria-label="Edit recipe" title="Edit recipe">${icon("pencil")}</button>
          </div>
        </div>
        <h2>${escapeHtml(recipe.name)}</h2>
        ${recipe.notes ? `<p class="recipe-hero-notes">${escapeHtml(recipe.notes)}</p>` : ""}
        ${stockLine}
        <div class="recipe-hero-actions">
          <div class="recipe-hero-primary">
            <button class="primary-button" data-add-to-plan type="button">Add to plan</button>
            <button class="secondary-button" data-cook-recipe type="button" title="Subtract these ingredients from your kitchen stock">I made this</button>
          </div>
          ${lastStockDeduction?.recipeId === recipe.id ? '<button class="text-button" data-undo-cook type="button">Undo</button>' : ""}
          ${favoriteButtonMarkup(recipe, { withLabel: true })}
          <button class="text-button" data-edit-open-recipe type="button">Edit</button>
        </div>
      </div>
    </div>
    <div class="recipe-detail-layout">
      <section class="recipe-detail-ingredients">
        <div class="recipe-ingredients-heading">
          <h3>Ingredients · ${recipe.ingredients.length}</h3>
          ${recipeScaleMarkup(recipe)}
        </div>
        ${stockLine.replace("recipe-hero-stock", "recipe-hero-stock recipe-tab-stock")}
        <ul class="ingredient-checklist">
          ${recipe.ingredients
            .map((ingredient, index) => {
              const { amount, name } = recipeIngredientParts(ingredient);
              const stock = showStockFlags ? ingredientStockStatus(ingredient) : null;
              const flag = stock === "missing"
                ? '<span class="ingredient-stock-flag">Missing</span>'
                : stock === "short"
                  ? '<span class="ingredient-stock-flag is-short">Low</span>'
                  : "";
              return `
                <li>
                  <label>
                    <input type="checkbox" data-ingredient-check="${index}"${checks.has(String(index)) ? " checked" : ""} />
                    <span class="check-box" aria-hidden="true"></span>
                    <span class="ingredient-checklist-amount">${escapeHtml(amount || "")}</span>
                    <span class="ingredient-checklist-name">${escapeHtml(name)}</span>
                    ${flag}
                  </label>
                </li>`;
            })
            .join("")}
        </ul>
      </section>
      <section class="recipe-detail-method">
        <h3>Instructions · ${steps.length}</h3>
        ${steps.length
          ? `<ol class="method-steps">${steps
              .map((step, index) => `<li><span class="method-number" aria-hidden="true">${index + 1}</span><p data-step-index="${index}">${highlightIngredientMentions(step, recipe, mentionsSeen)}</p></li>`)
              .join("")}</ol>`
          : '<p class="empty-state">No instructions added yet.</p>'}
        <details class="recipe-totals nutrition-only">
          <summary>Nutrition for the whole recipe</summary>
          <div class="macro-row">${nutrientChips(macros)}${catalogItems(recipe).length ? macroChip("Containers", formatQuantity(roundTo(containers, 2))) : ""}</div>
        </details>
      </section>
    </div>`;
}

// ---------------------------------------------------------------- add to plan
let addPlanRecipe = null;
let addPlanWeekStart = null;

function openAddToPlan(recipe) {
  const dialog = document.getElementById("add-plan-dialog");
  addPlanRecipe = recipe;
  addPlanWeekStart = new Date(selectedWeekStart);
  const meal = meals.includes(recipe.category) ? recipe.category : "Dinner";
  document.getElementById("add-plan-meal").innerHTML = meals.map((name) => optionMarkup(name, name, meal)).join("");
  document.getElementById("add-plan-recipe").textContent = recipe.name;
  const planner = ensureActivePlanner();
  document.getElementById("add-plan-planner").textContent = planner ? planner.name : "No planner selected";
  renderAddToPlan(true);
  dialog.showModal();
}

function renderAddToPlan(pickDay = false) {
  const daySelect = document.getElementById("add-plan-day");
  const todayKey = dateKey(new Date());
  const current = pickDay ? "" : daySelect.value;
  // Default to today when it is in view, otherwise the first open slot.
  const todayIndex = days.findIndex((day, index) => dateKey(addDays(addPlanWeekStart, index)) === todayKey);
  const chosen = current || days[Math.max(todayIndex, 0)];
  daySelect.innerHTML = days
    .map((day, index) => optionMarkup(day, `${day}, ${formatDayDate(addDays(addPlanWeekStart, index))}`, chosen))
    .join("");
  document.getElementById("add-plan-week-label").textContent = formatWeekSpan(addPlanWeekStart, addDays(addPlanWeekStart, 6));
  updateAddToPlanNote();
}

function updateAddToPlanNote() {
  const note = document.getElementById("add-plan-note");
  const submit = document.getElementById("add-plan-submit");
  const planner = activePlanner();
  if (!planner) {
    note.textContent = "Create or join a planner on the Plan page first.";
    submit.disabled = true;
    return;
  }
  submit.disabled = !canWriteCloudData();
  const plan = planner.plans[dateKey(addPlanWeekStart)];
  const day = document.getElementById("add-plan-day").value;
  const meal = document.getElementById("add-plan-meal").value;
  const existing = plan?.[day]?.[meal];
  const summary = existing ? slotSummary(existing, slotPlate(plan, day, meal)) : null;
  note.textContent = summary && summary.kind !== "empty" ? `Replaces ${summary.label}.` : "";
}

function setupAddToPlan() {
  const dialog = document.getElementById("add-plan-dialog");
  document.getElementById("add-plan-previous").addEventListener("click", () => {
    addPlanWeekStart = addDays(addPlanWeekStart, -7);
    renderAddToPlan();
  });
  document.getElementById("add-plan-next").addEventListener("click", () => {
    addPlanWeekStart = addDays(addPlanWeekStart, 7);
    renderAddToPlan();
  });
  document.getElementById("add-plan-day").addEventListener("change", updateAddToPlanNote);
  document.getElementById("add-plan-meal").addEventListener("change", updateAddToPlanNote);
  document.getElementById("add-plan-cancel").addEventListener("click", () => dialog.close());
  document.getElementById("add-plan-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const planner = activePlanner();
    if (!planner || !addPlanRecipe || !requireCloudWrite()) return;
    const key = dateKey(addPlanWeekStart);
    if (!planner.plans[key]) planner.plans[key] = blankPlan();
    const day = document.getElementById("add-plan-day").value;
    const meal = document.getElementById("add-plan-meal").value;
    planner.plans[key][day][meal] = addPlanRecipe.id;
    // The recipe replaces whatever was there, a built plate included.
    setSlotPlate(planner.plans[key], day, meal, {});
    saveState();
    renderAll();
    dialog.close();
  });
}

function renderPlannerControls() {
  const select = document.getElementById("active-planner");
  if (!select) return;

  const joined = joinedPlanners();
  ensureActivePlanner();
  select.innerHTML = joined.length
    ? joined.map((planner) => `<option value="${escapeHtml(planner.id)}">${escapeHtml(planner.name)}</option>`).join("")
    : '<option value="">No joined planners</option>';
  select.value = activePlannerId || "";
  select.disabled = !joined.length;
  document.getElementById("clear-week").disabled = !activePlanner();
  renderPlannerDirectory();
}

function renderPlannerDirectory() {
  const directory = document.getElementById("planner-directory");
  if (!directory) return;

  const items = planners();
  if (!items.length) {
    directory.innerHTML = '<p class="empty-state">No planners have been created yet.</p>';
    return;
  }

  directory.innerHTML = items
    .map((planner) => {
      const joined = isPlannerMember(planner);
      const memberCount = planner.allHouseholdMembers ? householdMembers.length : planner.memberUids.length;
      const memberNames = householdMembers.filter((member) => planner.memberUids.includes(member.uid)).map(memberName);
      const membership = planner.allHouseholdMembers
        ? "All household members"
        : memberNames.length === memberCount ? memberNames.join(", ") : `${memberCount} member${memberCount === 1 ? "" : "s"}`;
      const owner = householdMembers.find((member) => member.uid === planner.ownerUid);
      const ownerText = owner ? ` - Created by ${memberName(owner)}` : "";
      // Members can bring other household members into a planner directly,
      // instead of each person having to find it and press Join themselves.
      const addable = joined && !planner.allHouseholdMembers
        ? householdMembers.filter((member) => !planner.memberUids.includes(member.uid))
        : [];
      const addControl = addable.length
        ? `<select class="planner-add-member" data-add-member-planner="${escapeHtml(planner.id)}" aria-label="Add a household member to ${escapeHtml(planner.name)}">
            ${optionMarkup("", "+ Add member")}
            ${addable.map((member) => optionMarkup(member.uid, memberName(member))).join("")}
          </select>`
        : "";
      return `
        <div class="planner-directory-row">
          <div>
            <strong>${escapeHtml(planner.name)}</strong>
            <span class="planner-directory-meta">${escapeHtml(membership + ownerText)}</span>
            ${addControl}
          </div>
          <div class="planner-directory-actions">
            ${joined
              ? `<button class="secondary-button" data-open-planner="${escapeHtml(planner.id)}" type="button">${planner.id === activePlannerId ? "Selected" : "Open"}</button>${!planner.allHouseholdMembers ? `<button class="text-button" data-leave-planner="${escapeHtml(planner.id)}" type="button">Leave</button>` : ""}`
              : `<button class="primary-button" data-join-planner="${escapeHtml(planner.id)}" type="button">Join</button>`}
          </div>
        </div>`;
    })
    .join("");

  directory.querySelectorAll("[data-open-planner]").forEach((button) => {
    button.addEventListener("click", () => {
      selectPlanner(button.dataset.openPlanner);
      authEls.plannerDialog.close();
    });
  });
  directory.querySelectorAll("[data-join-planner]").forEach((button) => {
    button.addEventListener("click", () => joinPlanner(button.dataset.joinPlanner));
  });
  directory.querySelectorAll("[data-leave-planner]").forEach((button) => {
    button.addEventListener("click", () => leavePlanner(button.dataset.leavePlanner));
  });
  directory.querySelectorAll("[data-add-member-planner]").forEach((select) => {
    select.addEventListener("change", () => {
      if (select.value) addPlannerMember(select.dataset.addMemberPlanner, select.value);
    });
  });
}

function createPlanner(name) {
  const uid = cloud?.auth.currentUser?.uid;
  if (!uid || !requireCloudWrite()) return;
  const id = crypto.randomUUID();
  state.planners[id] = {
    id,
    name,
    ownerUid: uid,
    memberUids: [uid],
    allHouseholdMembers: false,
    plans: { [dateKey(selectedWeekStart)]: blankPlan() }
  };
  saveState();
  selectPlanner(id);
  if (authEls.plannerDialog.open) authEls.plannerDialog.close();
}

function joinPlanner(plannerId) {
  const uid = cloud?.auth.currentUser?.uid;
  const planner = state.planners?.[plannerId];
  if (!uid || !planner || !requireCloudWrite()) return;
  planner.memberUids = [...new Set([...(planner.memberUids || []), uid])];
  saveState();
  selectPlanner(plannerId);
  if (authEls.plannerDialog.open) authEls.plannerDialog.close();
}

function addPlannerMember(plannerId, memberUid) {
  const planner = state.planners?.[plannerId];
  const isHouseholdMember = householdMembers.some((member) => member.uid === memberUid);
  if (!planner || planner.allHouseholdMembers || !isPlannerMember(planner) || !isHouseholdMember || !requireCloudWrite()) return;
  planner.memberUids = [...new Set([...(planner.memberUids || []), memberUid])];
  saveState();
  renderAll();
  renderPlannerDirectory();
}

function leavePlanner(plannerId) {
  const uid = cloud?.auth.currentUser?.uid;
  const planner = state.planners?.[plannerId];
  if (!uid || !planner || planner.allHouseholdMembers || !requireCloudWrite()) return;
  planner.memberUids = (planner.memberUids || []).filter((memberUid) => memberUid !== uid);
  if (activePlannerId === plannerId) activePlannerId = null;
  ensureActivePlanner();
  saveState();
  renderAll();
}

function recipeSteps(recipe) {
  const value = recipe.steps ?? recipe.instructions;
  if (Array.isArray(value)) return value.map(String).map((step) => step.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/\r?\n/).map((step) => step.trim()).filter(Boolean);
  return [];
}

// Steps may carry explicit ingredient labels written as {{Ingredient Name}} or
// {{Ingredient Name|the words as they read in the step}}. An ingredient listed more
// than once can be pinned to one of its rows as {{Ingredient Name#2|...}}.
// Anything untagged still falls back to matching ingredient names automatically.
const stepTagPattern = /\{\{([^{}|]+?)(?:\|([^{}]*?))?\}\}/g;

// "Granulated Sugar#2" -> { name: "Granulated Sugar", use: 2 }; no suffix -> use 0.
function parseStepTagTarget(target) {
  const match = String(target ?? "").trim().match(/^(.*?)#(\d+)$/);
  return match ? { name: match[1].trim(), use: Number(match[2]) } : { name: String(target ?? "").trim(), use: 0 };
}

function stepTagMarkup(target, text) {
  const { name } = parseStepTagTarget(target);
  const label = String(text ?? "").trim() || name;
  return label.toLowerCase() === String(target).toLowerCase() ? `{{${target}}}` : `{{${target}|${label}}}`;
}

// The step as a reader sees it, with every label reduced to its visible words.
function stripStepTags(step) {
  return String(step ?? "").replace(stepTagPattern, (match, target, text) => {
    const { name } = parseStepTagTarget(target);
    return (text ?? name).trim() || name;
  });
}

// Every amount listed for each ingredient name, in list order, so an ingredient
// used more than once (butter for the roux, then butter to finish) keeps each use.
function recipeIngredientAmounts(recipe) {
  const amounts = new Map();
  recipe.ingredients?.forEach((item) => {
    const detail = recipeIngredientMention(item);
    if (!detail?.name) return;
    const key = detail.name.toLowerCase();
    amounts.set(key, [...(amounts.get(key) || []), detail.amount]);
  });
  return amounts;
}

function mentionMarkup(text, amount) {
  if (!amount) return escapeHtml(text);
  // The space sits inside the amount span so everything outside the amounts is
  // exactly the step's own text (the recipe-page labeller counts on that).
  return `<span class="ingredient-mention">${escapeHtml(text)}</span><span class="ingredient-mention-amount"> (${escapeHtml(amount)})</span>`;
}

// `seen` counts mentions per name across all of a recipe's steps: the nth
// mention of a repeated ingredient shows its nth listed amount. An ingredient
// listed once shows that amount every time; mentions past the last listed use
// of a repeated one show no amount rather than a wrong one.
// Matches any of the given ingredient names as whole words, longest first so
// "light brown sugar" wins over "sugar". Shared by the recipe page and the editor.
function ingredientMentionPattern(names) {
  const sorted = [...new Set(names.map((name) => String(name).toLowerCase()).filter(Boolean))].sort((a, b) => b.length - a.length);
  return sorted.length ? new RegExp(`\\b(${sorted.map(escapeRegExp).join("|")})\\b`, "gi") : null;
}

function highlightIngredientMentions(step, recipe, seen = new Map()) {
  const lists = recipeIngredientAmounts(recipe);
  const amounts = {
    get(key) {
      const list = lists.get(key);
      if (!list) return "";
      if (list.length === 1) return list[0];
      const index = seen.get(key) || 0;
      seen.set(key, index + 1);
      return list[index] || "";
    }
  };
  const autoPattern = ingredientMentionPattern([...lists.keys()]);

  // Untagged stretches keep the old automatic name matching.
  const autoHighlight = (text) => {
    if (!autoPattern) return escapeHtml(text);
    let cursor = 0;
    let html = "";
    for (const match of text.matchAll(autoPattern)) {
      html += escapeHtml(text.slice(cursor, match.index));
      html += mentionMarkup(match[0], amounts.get(match[0].toLowerCase()));
      cursor = match.index + match[0].length;
    }
    return html + escapeHtml(text.slice(cursor));
  };

  let cursor = 0;
  let html = "";
  for (const match of String(step ?? "").matchAll(stepTagPattern)) {
    html += autoHighlight(step.slice(cursor, match.index));
    const { name, use } = parseStepTagTarget(match[1]);
    const label = (match[2] ?? name).trim() || name;
    // A label pinned to one row of a repeated ingredient shows that row's amount;
    // one pointing at an ingredient the recipe no longer has degrades to plain words.
    const pinned = use ? lists.get(name.toLowerCase())?.[use - 1] : undefined;
    html += mentionMarkup(label, pinned ?? (amounts.get(name.toLowerCase()) || ""));
    cursor = match.index + match[0].length;
  }
  return html + autoHighlight(step.slice(cursor));
}

function recipeIngredientMention(item) {
  if (typeof item === "string") {
    const parsed = parseIngredient(item);
    if (!parsed) return null;
    const shownUnit = normalizeMeasurementUnit(parsed.unit) === countOnlyUnit ? "" : parsed.unit;
    const amount = parsed.quantity ? `${formatQuantity(parsed.quantity)}${shownUnit ? ` ${shownUnit}` : ""}` : formatAmountsInText(item);
    return { name: parsed.name, amount };
  }

  const ingredient = state.ingredients[item.key] || item;
  if (!ingredient?.name) return null;
  return {
    name: ingredient.name,
    amount: recipeIngredientAmount(item, ingredient)
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function macroChip(label, value, className = "") {
  return `<div class="macro-chip ${className}"><span>${label}</span><strong>${value}</strong></div>`;
}

function emptyNutrients() {
  return Object.fromEntries(nutrients.map((nutrient) => [nutrient.key, 0]));
}

function nutrientValues(source) {
  return Object.fromEntries(nutrients.map((nutrient) => [nutrient.key, Number(source?.[nutrient.key] || 0)]));
}

function addNutrients(totals, source, multiplier = 1) {
  nutrients.forEach((nutrient) => {
    totals[nutrient.key] += Number(source?.[nutrient.key] || 0) * multiplier;
  });
  return totals;
}

function nutrientText(nutrient, value) {
  return `${formatMacro(value)}${nutrient.unit}`;
}

function nutrientChips(totals, labelKey = "short") {
  return nutrients.map((nutrient) => macroChip(nutrient[labelKey], nutrientText(nutrient, totals[nutrient.key]), "nutrition-only")).join("");
}

function servingsPerContainer(source) {
  const value = Number(source?.servingsPerContainer || 0);
  return value > 0 ? value : 1;
}

function containersForServings(quantity, perContainer) {
  const value = Number(perContainer || 0);
  return Number(quantity || 0) / (value > 0 ? value : 1);
}

function normalizeMeasurementUnit(unit) {
  const normalized = String(unit || "").trim().toLowerCase().replace(/\s+/g, " ");
  return measurementAliases[normalized] || normalized;
}

// Word units read naturally in the plural ("2 eggs"); abbreviations never do ("2 g").
const pluralizableUnits = new Set([
  "piece", "slice", "serving", "can", "package", "scoop", "clove", "egg", "cup",
  "container", "box", "bag", "bottle", "jar", "carton", "pack", "jug", "tub", "bunch"
]);

function pluralizeUnit(unit, quantity) {
  const normalized = normalizeMeasurementUnit(unit);
  if (!normalized || !pluralizableUnits.has(normalized)) return normalized;
  if (roundTo(Number(quantity || 0), 2) <= 1) return normalized;
  return /(?:s|x|z|ch|sh)$/.test(normalized) ? `${normalized}es` : `${normalized}s`;
}

// "2 eggs Egg" reads badly: when the unit already names the ingredient, the name is redundant.
function unitNamesIngredient(unit, name) {
  const normalizedUnit = normalizeMeasurementUnit(unit);
  return Boolean(normalizedUnit) && normalizedUnit === normalizeMeasurementUnit(name);
}

// Fractions read well for cups and spoons; metric amounts read better as decimals,
// so 0.8 kg stays "0.8 kg" instead of turning into "⅘ kg".
const decimalUnits = new Set(["mg", "g", "kg", "ml", "cl", "dl", "l"]);

function formatUnitQuantity(quantity, unit) {
  const value = roundTo(Number(quantity || 0), 2);
  return decimalUnits.has(normalizeMeasurementUnit(unit)) ? String(value) : formatQuantity(value);
}

// Shared "<amount> <unit>" builder that also reports the singular unit it settled on,
// so callers can drop an ingredient name the unit already covers.
function amountParts(quantity, unit) {
  const shownUnit = normalizeMeasurementUnit(unit) === countOnlyUnit ? "" : pluralizeUnit(unit, quantity);
  return {
    text: `${formatUnitQuantity(quantity, unit)} ${shownUnit}`.replace(/\s+/g, " ").trim(),
    unit: normalizeMeasurementUnit(unit),
    quantity: Number(quantity || 0)
  };
}

// "5 pieces Potato" reads better as "5 potatoes": a plain count names the
// ingredient itself, pluralised when there is more than one.
const pluralNameExceptions = { potato: "potatoes", tomato: "tomatoes", leaf: "leaves", loaf: "loaves", knife: "knives", mouse: "mice", goose: "geese" };

function pluralizeName(name, quantity) {
  const text = String(name || "").trim();
  if (!text || roundTo(Number(quantity || 0), 2) <= 1) return text;
  const match = text.match(/^(.*?)([A-Za-z]+)$/);
  if (!match) return text;
  const [, head, word] = match;
  const lower = word.toLowerCase();
  let plural;
  if (pluralNameExceptions[lower]) plural = pluralNameExceptions[lower];
  else if (/s$/.test(lower)) return text;
  else if (/[^aeiou]y$/.test(lower)) plural = `${lower.slice(0, -1)}ies`;
  else if (/(?:x|z|ch|sh)$/.test(lower)) plural = `${lower}es`;
  else plural = `${lower}s`;
  // Keep the original word's capitalisation.
  const cased = word === word.toUpperCase() && word.length > 1 ? plural.toUpperCase()
    : word[0] === word[0].toUpperCase() ? plural[0].toUpperCase() + plural.slice(1) : plural;
  return `${head}${cased}`;
}

// "<amount> <unit> <name>", with the name dropped when the unit already names it.
function amountWithName(quantity, unit, name) {
  const amount = amountParts(quantity, unit);
  return `${amount.text} ${unitNamesIngredient(amount.unit, name) ? "" : name}`.replace(/\s+/g, " ").trim();
}

function convertMeasurement(amount, fromUnit, toUnit) {
  const from = normalizeMeasurementUnit(fromUnit);
  const to = normalizeMeasurementUnit(toUnit);
  if (from === to) return Number(amount || 0);

  const fromDefinition = measurementConversions[from];
  const toDefinition = measurementConversions[to];
  if (!fromDefinition || !toDefinition || fromDefinition.dimension !== toDefinition.dimension) return null;
  if (fromDefinition.dimension === "count" && from !== to) return null;
  return Number(amount || 0) * fromDefinition.factor / toDefinition.factor;
}

function measurementIsCompatible(unit, servingUnit) {
  const from = normalizeMeasurementUnit(unit);
  const to = normalizeMeasurementUnit(servingUnit);
  if (from === to) return true;
  const fromDefinition = measurementConversions[from];
  const toDefinition = measurementConversions[to];
  return Boolean(fromDefinition && toDefinition && fromDefinition.dimension !== "count" && fromDefinition.dimension === toDefinition.dimension);
}

function recipeItemServingCount(item, ingredient) {
  const quantity = Number(item?.quantity || 0);
  if (item?.measure === "container") return quantity * servingsPerContainer(ingredient);
  if (!item?.measure || item.measure === "serving") return quantity;

  const serving = parseServing(ingredient?.serving);
  const converted = convertMeasurement(quantity, item.measure, serving.unit);
  return converted === null || serving.amount <= 0 ? quantity : converted / serving.amount;
}

function recipeItemContainerCount(item, ingredient) {
  const quantity = Number(item?.quantity || 0);
  return item?.measure === "container" ? quantity : containersForServings(quantity, ingredient?.servingsPerContainer);
}

function roundTo(value, places) {
  const factor = 10 ** places;
  return Math.round(Number(value || 0) * factor) / factor;
}

function recipeMacros(recipe) {
  const catalogIngredients = catalogItems(recipe);
  if (!catalogIngredients.length) return nutrientValues(recipe);

  return catalogIngredients.reduce((totals, item) => {
    const ingredient = state.ingredients[item.key] || item;
    return addNutrients(totals, ingredient, recipeItemServingCount(item, ingredient));
  }, emptyNutrients());
}

function catalogItems(recipe) {
  return recipe.ingredients?.filter((item) => item && typeof item === "object") || [];
}

function recipeContainers(recipe) {
  return catalogItems(recipe).reduce((total, item) => {
    const ingredient = state.ingredients[item.key] || item;
    return total + recipeItemContainerCount(item, ingredient);
  }, 0);
}

function recipeIngredientText(item) {
  const parts = recipeIngredientParts(item);
  return `${parts.amount} ${parts.name}`.replace(/\s+/g, " ").trim();
}

// The amount is rendered in its own colour, so it has to come back separated
// from the name rather than pre-joined into one string.
function recipeIngredientParts(item) {
  if (typeof item === "string") return splitLeadingAmount(formatAmountsInText(item));
  const ingredient = state.ingredients[item.key] || item;
  const name = ingredient.name || "Ingredient";
  const amount = recipeIngredientAmountParts(item, ingredient);
  // A plain count, or a unit that already names the ingredient ("2 eggs Egg"),
  // reads as the number beside the pluralised name: "2" and "Eggs".
  if (amount.unit === "piece" || unitNamesIngredient(amount.unit, name)) {
    return { amount: formatUnitQuantity(amount.quantity, amount.unit), name: pluralizeName(name, amount.quantity) };
  }
  return { amount: amount.text, name };
}

// Pulls "2 tbsp" off the front of "2 tbsp Olive oil". The trailing word only
// joins the amount when it is a unit, so "3 Chicken breasts" keeps its name whole.
function splitLeadingAmount(text) {
  const match = String(text ?? "").trim().match(/^((?:\d+\s+)?[\d./¼-¾⅐-⅞]+)\s*(.*)$/);
  if (!match) return { amount: "", name: String(text ?? "").trim() };

  const [, quantity, rest] = match;
  const unitMatch = rest.match(/^([a-zA-Z]+)\s+(\S.*)$/);
  const unit = unitMatch ? normalizeMeasurementUnit(unitMatch[1]) : "";
  if (unitMatch && unit === countOnlyUnit) return { amount: quantity, name: unitMatch[2] };
  if (unitMatch && (knownServingUnit(unit) || unit === "container")) {
    return { amount: `${quantity} ${unitMatch[1]}`, name: unitMatch[2] };
  }
  return { amount: quantity, name: rest };
}

function recipeIngredientMarkup(item) {
  const { amount, name } = recipeIngredientParts(item);
  const amountHtml = amount ? `<span class="ingredient-measure">${escapeHtml(amount)}</span>` : "";
  return `${amountHtml} ${escapeHtml(name)}`.trim();
}

function recipeIngredientAmount(item, ingredient) {
  return recipeIngredientAmountParts(item, ingredient).text;
}

// Just the amount: "1 tbsp", "2 eggs", "1 container". Serving counts and container
// maths stay in the recipe totals instead of padding out every line.
function recipeIngredientAmountParts(item, ingredient) {
  const quantity = Number(item.quantity || 0);
  if (item.measure === "container") {
    return amountParts(quantity, "container");
  }
  if (item.measure && item.measure !== "serving") {
    return amountParts(quantity, item.measure);
  }

  // "Serving" rows count the ingredient's own serving size, so fold the two
  // numbers together: 2 x "1 egg" reads as "2 eggs", not "2 x 1 egg".
  const serving = parseServing(ingredient?.serving);
  if (serving.amount > 0) {
    return amountParts(quantity * serving.amount, serving.unit === "serving" ? "" : serving.unit);
  }
  return { text: `${formatQuantity(quantity)} x ${ingredient?.serving || "serving"}`, unit: "" };
}

function formatMacro(value) {
  return String(roundTo(Number(value || 0), 2));
}

function renderGroceries() {
  const groceries = new Map();
  const recipes = upcomingPlannedRecipes();
  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const parsed = parseRecipeIngredient(ingredient);
      if (!parsed) return;

      const existing = groceries.get(parsed.key);
      if (existing) {
        existing.from.add(recipe.name);
        if (existing.unit === parsed.unit && parsed.quantity) existing.quantity += parsed.quantity;
        else existing.count += 1;
        return;
      }

      groceries.set(parsed.key, { ...parsed, from: new Set([recipe.name]) });
    });
  });

  renderGroceryHeader(recipes.length);
  const groceryList = document.getElementById("grocery-list");
  if (!groceries.size) {
    groceryList.innerHTML = '<p class="empty-state">Plan meals for this week or later and your grocery list will appear here.</p>';
    updateGroceryTally();
    return;
  }

  const checked = groceryChecks();
  groceryList.innerHTML = `
    <ul class="grocery-rows">
      ${[...groceries.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => {
          const text = formatGroceryItem(item);
          const ingredient = state.ingredients[item.key] || findIngredient(item.name);
          const link = safeLinkUrl(ingredient?.url) || walmartSearchUrl(item.name);
          const saved = Boolean(safeLinkUrl(ingredient?.url));
          const perContainer = item.servingsPerContainer || ingredient?.servingsPerContainer;
          const containers = perContainer && item.quantity ? containersForServings(item.quantity, perContainer) : 0;
          // Shown, never subtracted: stock can be out of date, and a wrong
          // grocery amount is worse than a redundant one.
          const stocked = stockedFor(item.key, item.name);
          const notes = [
            [...item.from].join(", "),
            containers ? `buy ${Math.ceil(containers)} ${pluralizeUnit("container", Math.ceil(containers))}` : "",
            stocked ? `${kitchenStockAmountText(stocked)} in your kitchen` : ""
          ].filter(Boolean);
          const isChecked = checked.has(item.key);
          return `
            <li class="grocery-row${stocked ? " is-stocked" : ""}" data-grocery-text="${escapeHtml(text)}" data-checked="${isChecked}">
              <label class="grocery-row-check">
                <input type="checkbox" data-grocery-key="${escapeHtml(item.key)}"${isChecked ? " checked" : ""} />
                <span class="check-box" aria-hidden="true"></span>
                <span class="grocery-row-text">
                  <strong class="grocery-row-name">${escapeHtml(item.name.charAt(0).toUpperCase() + item.name.slice(1))}</strong>
                  <span class="grocery-row-from">${escapeHtml(notes.join(" · "))}</span>
                </span>
              </label>
              <span class="grocery-row-amount">${escapeHtml(groceryAmountText(item))}</span>
              <a class="grocery-row-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" title="${saved ? "Open the saved Walmart product" : "Search Walmart"}">Walmart <span aria-hidden="true">↗</span></a>
            </li>`;
        })
        .join("")}
    </ul>`;
  groceryList.querySelectorAll("[data-grocery-key]").forEach((box) => {
    box.addEventListener("change", () => {
      const checks = groceryChecks();
      if (box.checked) checks.add(box.dataset.groceryKey);
      else checks.delete(box.dataset.groceryKey);
      saveGroceryChecks(checks);
      box.closest(".grocery-row").dataset.checked = String(box.checked);
      updateGroceryTally();
    });
  });
  updateGroceryTally();
}

// The list covers this week and every later week with meals planned.
function renderGroceryHeader(mealCount) {
  const planner = ensureActivePlanner();
  const start = getWeekStart(new Date());
  const thisWeekKey = dateKey(start);
  const lastKey = planner
    ? Object.entries(planner.plans)
        .filter(([key, plan]) => key >= thisWeekKey && days.some((day) => meals.some((meal) => plan[day]?.[meal])))
        .map(([key]) => key)
        .sort()
        .pop()
    : "";
  const lastStart = lastKey ? new Date(`${lastKey}T00:00:00`) : start;
  document.getElementById("groceries-range").textContent = formatWeekSpan(start, addDays(lastStart, 6));
  document.getElementById("groceries-view").dataset.meals = String(mealCount);
}

function updateGroceryTally() {
  const rows = [...document.querySelectorAll("#grocery-list .grocery-row")];
  const left = rows.filter((row) => row.dataset.checked !== "true").length;
  const meals = Number(document.getElementById("groceries-view").dataset.meals || 0);
  document.getElementById("grocery-left").textContent = String(left);
  document.getElementById("grocery-left-label").textContent = `left to buy · from ${meals} meal${meals === 1 ? "" : "s"}`;
}

// Ticked-off groceries are a shopping-trip convenience, so they stay on this device.
function groceryChecksKey() {
  return `recipe-grocery-checks:${currentHouseholdId || "local"}:${activePlannerId || ""}`;
}

function groceryChecks() {
  try {
    return new Set(JSON.parse(localStorage.getItem(groceryChecksKey()) || "[]"));
  } catch (error) {
    return new Set();
  }
}

function saveGroceryChecks(checks) {
  try {
    localStorage.setItem(groceryChecksKey(), JSON.stringify([...checks]));
  } catch (error) {
    // Checks still work for this visit when storage is unavailable.
  }
}

// "2 cups" for measured items, "x3" when the same item shows up in several recipes.
function groceryAmountText(item) {
  if (item.quantity) return groceryAmountParts(item).text;
  return item.count > 1 ? `x${item.count}` : "As needed";
}

function groceryAmountParts(item) {
  const quantity = Number(item.quantity || 0) * (Number(item.servingAmount) || 1);
  return amountParts(quantity, item.servingUnit);
}

// Shortened link text so the destination is visible on the card.
function linkDisplayUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = decodeURIComponent(parsed.pathname + parsed.search).replace(/\/$/, "");
    const label = `${host}${path === "/" ? "" : path}`;
    return label.length > 46 ? `${label.slice(0, 45)}…` : label;
  } catch (error) {
    return url;
  }
}

function parseRecipeIngredient(item) {
  if (typeof item === "string") return parseIngredient(item);
  const ingredient = state.ingredients[item.key] || item;
  if (!ingredient?.name) return null;

  // `quantity` counts servings (container maths depends on that), so the serving size
  // rides along separately for display: 2 servings of "1 egg" shows as "2 eggs".
  const serving = parseServing(ingredient.serving);
  return {
    key: ingredient.key || ingredientKey(ingredient.name),
    name: ingredient.name,
    unit: ingredient.serving || "serving",
    servingAmount: serving.amount > 0 ? serving.amount : 1,
    servingUnit: serving.unit === "serving" ? "" : serving.unit,
    quantity: recipeItemServingCount(item, ingredient),
    servingsPerContainer: servingsPerContainer(ingredient),
    count: 1
  };
}

function parseIngredient(ingredient) {
  const clean = ingredient.trim();
  if (!clean) return null;

  const match = clean.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s+([a-zA-Z]+)\s+(.+)$/);
  if (!match) {
    const quantityOnly = clean.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s+(.+)$/);
    if (quantityOnly) {
      const [, quantityText, name] = quantityOnly;
      return {
        key: name.trim().toLowerCase(),
        name: name.trim(),
        unit: "",
        servingAmount: 1,
        servingUnit: "",
        quantity: parseQuantity(quantityText),
        count: 1
      };
    }

    return {
      key: clean.toLowerCase(),
      name: clean,
      unit: "",
      servingAmount: 1,
      servingUnit: "",
      quantity: 0,
      count: 1
    };
  }

  const [, quantityText, unit, name] = match;
  return {
    key: `${unit.toLowerCase()}|${name.trim().toLowerCase()}`,
    name: name.trim(),
    unit,
    servingAmount: 1,
    servingUnit: unit,
    quantity: parseQuantity(quantityText),
    count: 1
  };
}

function parseQuantity(value) {
  return parseFractionInput(value);
}

// Amounts are stored as numbers but always shown as whole numbers or fractions.
const fractionGlyphs = {
  "1/2": "½", "1/3": "⅓", "2/3": "⅔", "1/4": "¼", "3/4": "¾",
  "1/5": "⅕", "2/5": "⅖", "3/5": "⅗", "4/5": "⅘",
  "1/6": "⅙", "5/6": "⅚",
  "1/8": "⅛", "3/8": "⅜", "5/8": "⅝", "7/8": "⅞"
};
const fractionDenominators = [2, 3, 4, 5, 6, 8, 16];
const fractionTolerance = 0.02;

function greatestCommonDivisor(a, b) {
  return b ? greatestCommonDivisor(b, a % b) : a || 1;
}

function nearestFraction(value) {
  const simplify = (numerator, denominator) => {
    const divisor = greatestCommonDivisor(numerator, denominator);
    return { numerator: numerator / divisor, denominator: denominator / divisor };
  };

  for (const denominator of fractionDenominators) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) <= fractionTolerance) return simplify(numerator, denominator);
  }

  return simplify(Math.round(value * 16), 16);
}

function formatQuantity(quantity) {
  const value = Number(quantity || 0);
  if (!Number.isFinite(value)) return "0";
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  let whole = Math.floor(absolute);
  let { numerator, denominator } = nearestFraction(absolute - whole);
  if (numerator >= denominator) {
    whole += 1;
    numerator = 0;
  }
  if (!numerator) return `${sign}${whole}`;
  const text = `${numerator}/${denominator}`;
  const glyph = fractionGlyphs[text];
  if (!whole) return `${sign}${glyph || text}`;
  return glyph ? `${sign}${whole}${glyph}` : `${sign}${whole} ${text}`;
}

// Recipes imported as plain text can carry decimal amounts ("0.25 tsp salt").
function formatAmountsInText(text) {
  return String(text ?? "")
    .replace(/^(\d+)\s+(?=\d*\.\d)/, "").replace(/(^|[^\w.\/])((?:\d+\s+)?\d+\/\d+|\d*\.\d+)(?![\w.\/])/g, (match, lead, amount) => {
    const value = parseFractionInput(amount);
    return value > 0 ? `${lead}${formatQuantity(value)}` : match;
  });
}

// Accepts "1 1/2", "3/4", "1½" or "1.5" and returns a number.
function parseFractionInput(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let text = String(value ?? "").trim();
  if (!text) return 0;
  const negative = text.startsWith("-");
  if (negative) text = text.slice(1);
  Object.entries(vulgarFractions).forEach(([glyph, fraction]) => {
    text = text.split(glyph).join(` ${fraction} `);
  });

  let total = 0;
  for (const part of text.split(/\s+/).filter(Boolean)) {
    if (part.includes("/")) {
      const [top, bottom] = part.split("/").map(Number);
      if (!Number.isFinite(top) || !Number.isFinite(bottom) || !bottom) return 0;
      total += top / bottom;
    } else {
      const number = Number(part);
      if (!Number.isFinite(number)) return 0;
      total += number;
    }
  }

  return negative ? -total : total;
}

function bindQuantityInput(input) {
  if (!input) return;
  input.addEventListener("blur", () => {
    const value = parseFractionInput(input.value);
    if (value > 0) input.value = formatQuantity(value);
  });
}

function isValidQuantityInput(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return /^[0-9./\s¼-¾⅐-⅞]+$/.test(text) && parseFractionInput(text) > 0;
}

function formatGroceryItem(item) {
  if (item.quantity) {
    return amountWithName(Number(item.quantity || 0) * (Number(item.servingAmount) || 1), item.servingUnit, item.name);
  }

  return `${item.name}${item.count > 1 ? ` x${item.count}` : ""}`;
}

// How many people the planned meals are cooked for. Defaults to the active
// planner's members, since that is who the plan is actually for, and can be
// overridden when the plan also feeds people without an account.
function plannerEaters() {
  const planner = activePlanner();
  if (!planner) return 1;
  if (planner.allHouseholdMembers) return Math.max(1, householdMembers.length);
  return Math.max(1, planner.memberUids?.length || 1);
}

function nutritionSettings() {
  const shared = normalizeNutritionSettings(state.nutrition);
  return {
    ...personalNutrition,
    people: shared.people || plannerEaters(),
    peopleOverride: shared.people
  };
}

function isFavoriteRecipe(id) {
  return favoriteRecipeIds.has(String(id));
}

const heartIcon = icon("heart");

function favoriteButtonMarkup(recipe, { withLabel = false } = {}) {
  const on = isFavoriteRecipe(recipe.id);
  const label = on ? `Remove ${recipe.name} from your favorites` : `Add ${recipe.name} to your favorites`;
  return `<button class="favorite-toggle${withLabel ? " secondary-button" : ""}" data-favorite-recipe="${escapeHtml(recipe.id)}" type="button"
    aria-pressed="${on}" aria-label="${escapeHtml(label)}" title="${on ? "Favorited" : "Favorite"}">${heartIcon}${withLabel ? `<span>${on ? "Favorited" : "Favorite"}</span>` : ""}</button>`;
}

async function toggleFavoriteRecipe(id) {
  const user = cloud?.auth.currentUser;
  if (!user) return;
  const key = String(id);
  const next = new Set(favoriteRecipeIds);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  const previous = favoriteRecipeIds;
  favoriteRecipeIds = next;
  renderRecipes();
  try {
    // Only ids of recipes that still exist are kept, so deleted recipes drop out.
    const ids = [...next].filter((recipeId) => recipeById(recipeId));
    await cloud.setDoc(cloud.doc(cloud.db, "users", user.uid), { profile: { favoriteRecipes: ids } }, { merge: true });
  } catch (error) {
    favoriteRecipeIds = previous;
    renderRecipes();
    setAuthMessage("Could not save your favorite: " + error.message);
  }
}

function bindFavoriteButtons(container) {
  container.querySelectorAll("[data-favorite-recipe]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavoriteRecipe(button.dataset.favoriteRecipe);
    });
  });
}

async function savePersonalNutrition() {
  const user = cloud?.auth.currentUser;
  if (!user) return;
  try {
    const ref = cloud.doc(cloud.db, "users", user.uid);
    await cloud.setDoc(ref, { profile: { nutrition: personalNutrition } }, { merge: true });
  } catch (error) {
    setAuthMessage("Could not save your nutrition targets: " + error.message);
  }
}

// The reference daily range for one person, before any personal override. Energy-
// linked nutrients follow your calorie target; fixed intakes follow your profile.
function nutrientReferenceRange(nutrient, settings = nutritionSettings()) {
  if (nutrient.fromCalories) {
    // A calorie goal is a point, so allow the usual +/-10% either side of it.
    return { min: roundTo(settings.calories * 0.9, 2), max: roundTo(settings.calories * 1.1, 2) };
  }
  if (nutrient.perMin != null || nutrient.perMax != null) {
    const scale = settings.calories / 1000;
    return {
      min: nutrient.perMin == null ? null : roundTo(nutrient.perMin * scale, 2),
      max: nutrient.perMax == null ? null : roundTo(nutrient.perMax * scale, 2)
    };
  }
  const min = settings.profile === "general" ? nutrient.min : nutrient[settings.profile] ?? nutrient.min;
  return { min: min ?? null, max: nutrient.max ?? null };
}

// The range actually in force, with your own overrides applied.
function nutrientDailyRange(nutrient, settings = nutritionSettings()) {
  const reference = nutrientReferenceRange(nutrient, settings);
  const override = settings.targets?.[nutrient.key];
  if (!override) return reference;
  return {
    min: override.min === undefined ? reference.min : override.min,
    max: override.max === undefined ? reference.max : override.max
  };
}

function nutrientWeeklyRange(nutrient, settings = nutritionSettings()) {
  const daily = nutrientDailyRange(nutrient, settings);
  return { min: daily.min == null ? null : daily.min * 7, max: daily.max == null ? null : daily.max * 7 };
}

// Kept for the places that just want one number to show: the floor if there is
// one, otherwise the ceiling.
function nutrientWeeklyTarget(nutrient, settings = nutritionSettings()) {
  const range = nutrientWeeklyRange(nutrient, settings);
  return range.min ?? range.max ?? 0;
}

function nutrientDailyTarget(nutrient, settings = nutritionSettings()) {
  const range = nutrientDailyRange(nutrient, settings);
  return range.min ?? range.max ?? 0;
}

// Your share of the week's planned food against your own weekly range. The bar
// fills toward the floor, or toward the ceiling when the goal is only a cap.
function nutrientProgress(nutrient, weeklyTotal, settings = nutritionSettings()) {
  const range = nutrientWeeklyRange(nutrient, settings);
  const total = Number(weeklyTotal || 0);
  const share = total / settings.people;
  const basis = range.min ?? range.max ?? 0;
  const percent = basis > 0 ? (share / basis) * 100 : 0;

  let status = "none";
  if (share > 0) {
    if (range.max != null && share > range.max) status = "over";
    else if (range.min == null) status = "good";
    else if (share >= range.min) status = "good";
    else status = share >= range.min * 0.6 ? "low" : "short";
  }

  return {
    total,
    share,
    range,
    dailyRange: nutrientDailyRange(nutrient, settings),
    target: basis,
    perDay: share / 7,
    dailyTarget: basis / 7,
    percent,
    status,
    bar: Math.max(0, Math.min(100, percent))
  };
}

const macroStatusLabels = {
  good: "On track",
  low: "A little low",
  short: "Well under",
  over: "Over",
  none: "No data"
};

function renderMacros() {
  const planned = plannedRecipes();
  // A plate adds its three picks to the totals and counts as one meal.
  const plates = [...planned, ...plannedPlateRecipes()];
  const mealCount = planned.length + plannedSlotValues().filter(isPlateValue).length;
  const totals = plates.reduce((sum, recipe) => addNutrients(sum, recipeMacros(recipe)), emptyNutrients());
  const containers = plates.reduce((sum, recipe) => sum + recipeContainers(recipe), 0);
  const settings = nutritionSettings();

  syncNutritionControls(settings);

  const tracked = nutrients.map((nutrient) => ({ nutrient, progress: nutrientProgress(nutrient, totals[nutrient.key], settings) }));
  const withData = tracked.filter((item) => item.progress.percent > 0);
  const onTrack = withData.filter((item) => item.progress.status === "good").length;
  // The calorie goal itself, not the bottom of its +/-10% band.
  const weeklyCalories = settings.calories * 7;
  const share = settings.people > 1
    ? `Your share: 1 of ${settings.people} eating this plan`
    : "Your share: everything planned";

  document.getElementById("macro-summary").innerHTML = `
    <div class="macro-summary-headline">
      <strong>${onTrack} of ${withData.length || nutrients.length}</strong>
      <span>of your weekly targets met</span>
    </div>
    <div class="macro-summary-meta">
      <span>${share}</span>
      <span>Your week: ${formatMacro(weeklyCalories)} cal (${settings.calories}/day)</span>
      <span>${mealCount} meal${mealCount === 1 ? "" : "s"} planned</span>
      <span>${formatQuantity(roundTo(containers, 2))} containers</span>
    </div>
    ${withData.length ? "" : '<p class="empty-state">Plan meals with saved ingredients to see how the week measures up.</p>'}`;

  const dashboard = document.getElementById("macro-dashboard");
  dashboard.innerHTML = nutrientGroups
    .map((group) => {
      const rows = tracked
        .filter((item) => item.nutrient.group === group)
        .map(({ nutrient, progress }) => macroProgressRow(nutrient, progress, editingGoals))
        .join("");
      return `
        <section class="macro-group">
          <h3>${escapeHtml(group)}</h3>
          <div class="macro-group-rows">${rows}</div>
        </section>`;
    })
    .join("");

  bindGoalEditors(dashboard);
}

let editingGoals = false;

function bindGoalEditors(dashboard) {
  const toggle = document.getElementById("macro-edit-goals");
  if (toggle) {
    toggle.textContent = editingGoals ? "Done editing goals" : "Edit goals";
    toggle.setAttribute("aria-pressed", String(editingGoals));
  }
  if (!editingGoals) return;

  dashboard.querySelectorAll("[data-goal-key]").forEach((input) => {
    input.addEventListener("change", () => {
      if (!requireCloudWrite()) return;
      const { goalKey, goalBound } = input.dataset;
      const text = input.value.trim();
      const targets = { ...personalNutrition.targets };
      const entry = { ...(targets[goalKey] || {}) };

      // Clearing the box drops the override and lets the reference value return.
      if (!text) delete entry[goalBound];
      else entry[goalBound] = Number(text);

      if (Object.keys(entry).length) targets[goalKey] = entry;
      else delete targets[goalKey];

      personalNutrition = normalizePersonalNutrition({ ...personalNutrition, targets });
      renderMacros();
      void savePersonalNutrition();
    });
  });

  dashboard.querySelectorAll("[data-goal-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!requireCloudWrite()) return;
      const targets = { ...personalNutrition.targets };
      delete targets[button.dataset.goalReset];
      personalNutrition = normalizePersonalNutrition({ ...personalNutrition, targets });
      renderMacros();
      void savePersonalNutrition();
    });
  });
}

// Never overwrite a field the user is mid-edit in.
function syncNutritionControls(settings) {
  const people = document.getElementById("macro-people");
  if (people && document.activeElement !== people) {
    const auto = plannerEaters();
    people.innerHTML = [
      optionMarkup("0", `Follow this planner (${auto})`),
      ...Array.from({ length: 20 }, (_, index) => optionMarkup(String(index + 1), `${index + 1} ${index ? "people" : "person"}`))
    ].join("");
    people.value = String(settings.peopleOverride || 0);
  }

  const fields = { "macro-calories": settings.calories, "macro-profile": settings.profile };
  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element && document.activeElement !== element) element.value = value;
  });
}

// "350-612g", "at least 350g", "up to 16100mg" - whichever bounds are set.
function rangeText(nutrient, range) {
  const min = range.min == null ? null : nutrientText(nutrient, range.min);
  const max = range.max == null ? null : nutrientText(nutrient, range.max);
  if (min && max) return `${formatMacro(range.min)}-${max}`;
  if (min) return `at least ${min}`;
  if (max) return `up to ${max}`;
  return "no goal set";
}

function macroProgressRow(nutrient, progress, editing) {
  const customised = Boolean(nutritionSettings().targets?.[nutrient.key]);
  const boundInput = (bound) => {
    const value = progress.dailyRange[bound];
    return `<label class="macro-bound">
      <span>${bound === "min" ? "Min" : "Max"}/day</span>
      <input type="number" min="0" step="any" inputmode="decimal" data-goal-key="${escapeHtml(nutrient.key)}" data-goal-bound="${bound}"
        value="${value == null ? "" : formatMacro(value)}" placeholder="none" />
    </label>`;
  };

  return `
    <div class="macro-progress" data-status="${progress.status}">
      <div class="macro-progress-head">
        <span class="macro-progress-name">${escapeHtml(nutrient.label)}${customised ? '<em class="macro-custom-flag" title="Custom goal">custom</em>' : ""}</span>
        <span class="macro-progress-value">
          <strong>${nutrientText(nutrient, progress.share)}</strong>
          <em>/ ${escapeHtml(rangeText(nutrient, progress.range))}</em>
        </span>
      </div>
      <div class="macro-progress-track" role="img" aria-label="${Math.round(progress.percent)}% of the weekly goal">
        <span class="macro-progress-fill" style="width: ${progress.bar}%"></span>
      </div>
      <div class="macro-progress-foot">
        <span class="macro-progress-percent">${Math.round(progress.percent)}%</span>
        <span class="macro-progress-daily">${nutrientText(nutrient, progress.perDay)} a day, goal ${escapeHtml(rangeText(nutrient, progress.dailyRange))}</span>
        <span class="macro-progress-status">${macroStatusLabels[progress.status]}</span>
      </div>
      ${editing
        ? `<div class="macro-bounds">
            ${boundInput("min")}
            ${boundInput("max")}
            <button class="text-button" data-goal-reset="${escapeHtml(nutrient.key)}" type="button" ${customised ? "" : "disabled"}>Reset</button>
          </div>`
        : ""}
    </div>`;
}

// Store-aisle style sections for the ingredient index, in display order.
const ingredientCategories = [
  "Produce",
  "Meat & seafood",
  "Dairy & eggs",
  "Bakery & grains",
  "Baking",
  "Spices & seasonings",
  "Oils, sauces & condiments",
  "Canned & dry goods",
  "Frozen",
  "Snacks & sweets",
  "Drinks",
  "Other"
];

// Keywords match at the start of a word ("tea" never matches "steak"), the
// longest match wins ("chicken broth" over "chicken"), and ties go to the
// earlier category, so "garlic powder" lands in spices rather than produce.
const ingredientCategoryKeywords = [
  ["Baking", ["baking powder", "baking soda", "yeast", "cornstarch", "flour", "sugar", "vanilla", "cocoa", "chocolate chip", "sprinkles", "food coloring", "extract", "gelatin", "corn syrup", "molasses"]],
  ["Spices & seasonings", ["salt", "pepper flakes", "black pepper", "peppercorn", "powder", "seasoning", "spice", "paprika", "cumin", "oregano", "basil leaves", "thyme", "rosemary", "cinnamon", "nutmeg", "chili flakes", "red pepper flake", "bay leaf", "bay leaves", "turmeric", "curry", "cayenne", "allspice", "clove", "ginger ground", "italian seasoning", "everything bagel", "rub", "chipotle"]],
  ["Oils, sauces & condiments", ["oil", "vinegar", "sauce", "ketchup", "mustard", "mayo", "mayonnaise", "dressing", "salsa", "soy", "sriracha", "honey", "syrup", "jam", "jelly", "peanut butter", "relish", "pesto", "hummus", "worcestershire", "marinade", "glaze", "spray"]],
  ["Frozen", ["frozen", "ice cream", "popsicle", "tater tot"]],
  ["Drinks", ["juice", "soda", "coffee", "tea", "water", "kombucha", "lemonade", "wine", "beer", "sparkling"]],
  ["Dairy & eggs", ["egg", "milk", "cheese", "cheddar", "mozzarella", "parmesan", "butter", "yogurt", "yoghurt", "cream", "half and half", "half & half", "cottage", "ricotta", "feta", "sour cream", "creamer", "ghee"]],
  ["Meat & seafood", ["chicken", "beef", "pork", "turkey", "bacon", "sausage", "ham", "steak", "ground meat", "lamb", "salmon", "tuna", "shrimp", "fish", "cod", "tilapia", "crab", "lobster", "scallop", "prosciutto", "pepperoni", "salami", "chorizo", "hot dog", "meatball", "venison", "duck", "brisket", "ribs", "jerky"]],
  ["Bakery & grains", ["bread", "bun", "roll", "bagel", "tortilla", "pita", "naan", "croissant", "english muffin", "rice", "pasta", "spaghetti", "noodle", "macaroni", "penne", "oat", "quinoa", "couscous", "cereal", "granola", "cracker", "breadcrumb", "panko", "barley"]],
  ["Canned & dry goods", ["canned", "can of", "chicken broth", "beef broth", "chicken stock", "beef stock", "broth", "stock", "bean", "lentil", "chickpea", "tomato paste", "diced tomatoes", "crushed tomatoes", "tomato sauce", "soup", "coconut milk", "nut", "almond", "walnut", "pecan", "cashew", "peanut", "seed", "raisin", "dried fruit"]],
  ["Snacks & sweets", ["chip", "cookie", "candy", "chocolate", "pretzel", "popcorn", "bar", "snack", "gummy", "marshmallow", "dessert"]],
  ["Produce", ["watermelon", "eggplant", "bell pepper", "apple", "banana", "berry", "berries", "orange", "lemon", "lime", "grape", "melon", "peach", "pear", "plum", "cherry", "mango", "pineapple", "avocado", "tomato", "potato", "onion", "garlic", "carrot", "celery", "lettuce", "spinach", "kale", "cabbage", "broccoli", "cauliflower", "pepper", "jalapeno", "jalapeño", "cucumber", "zucchini", "squash", "mushroom", "corn", "pea", "green bean", "asparagus", "cilantro", "parsley", "basil", "mint", "dill", "scallion", "green onion", "shallot", "leek", "ginger", "herb", "salad", "sprout", "radish", "beet", "yam", "sweet potato", "fruit", "veggie", "vegetable"]]
];

// Keywords are plain words (no regex characters), so they drop straight in.
const ingredientCategoryMatchers = ingredientCategoryKeywords.map(([category, words]) => [
  category,
  words.map((word) => ({ length: word.length, pattern: new RegExp(`(^|[^a-z])${word}`) }))
]);

function guessIngredientCategory(name) {
  const text = String(name || "").toLowerCase();
  let best = { category: "Other", length: 0 };
  ingredientCategoryMatchers.forEach(([category, words]) => {
    words.forEach(({ length, pattern }) => {
      if (length > best.length && pattern.test(text)) best = { category, length };
    });
  });
  return best.category;
}

// A chosen category wins; older ingredients without one are sorted by their name.
function ingredientCategory(ingredient) {
  return ingredientCategories.includes(ingredient?.category) ? ingredient.category : guessIngredientCategory(ingredient?.name);
}

function populateIngredientCategorySelect() {
  const select = document.getElementById("ingredient-category");
  if (!select || select.options.length) return;
  select.innerHTML = `<option value="">Auto</option>${ingredientCategories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("")}`;
}

let ingredientCategoryFilter = "";

function renderIngredients() {
  const all = Object.values(state.ingredients || {}).sort((a, b) => a.name.localeCompare(b.name));
  const list = document.getElementById("ingredient-list");
  const filters = document.getElementById("ingredient-filters");
  const searchInput = document.getElementById("ingredient-search");
  if (!all.length) {
    filters.innerHTML = "";
    searchInput.closest("label").hidden = true;
    list.innerHTML = '<p class="empty-state">Add an ingredient with its serving macros before building a recipe.</p>';
    return;
  }
  searchInput.closest("label").hidden = false;

  const present = ingredientCategories.filter((category) => all.some((ingredient) => ingredientCategory(ingredient) === category));
  if (ingredientCategoryFilter && !present.includes(ingredientCategoryFilter)) ingredientCategoryFilter = "";
  filters.innerHTML = [
    `<button class="filter-chip" type="button" data-ingredient-category="" aria-pressed="${!ingredientCategoryFilter}">All</button>`,
    ...present.map(
      (category) =>
        `<button class="filter-chip" type="button" data-ingredient-category="${escapeHtml(category)}" aria-pressed="${ingredientCategoryFilter === category}">${escapeHtml(category)}</button>`
    ),
    // Long press is the quick way in; this is the way in without a touchscreen.
    `<button class="filter-chip ingredient-select-chip" type="button" data-ingredient-bulk-start>${icon("check")} Select</button>`
  ].join("");
  filters.querySelector("[data-ingredient-bulk-start]").addEventListener("click", () => enterIngredientBulkMode());
  filters.querySelectorAll("[data-ingredient-category]").forEach((chip) => {
    chip.addEventListener("click", () => {
      ingredientCategoryFilter = chip.dataset.ingredientCategory;
      renderIngredients();
    });
  });

  // Every word must appear in the name or the category, in any order.
  const terms = searchInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const ingredients = all.filter((ingredient) => {
    const category = ingredientCategory(ingredient);
    if (ingredientCategoryFilter && category !== ingredientCategoryFilter) return false;
    const haystack = `${ingredient.name} ${category}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });

  if (!ingredients.length) {
    list.innerHTML = '<p class="empty-state">No ingredients match. Try a different search or category.</p>';
    return;
  }

  // Tiles go in aisle order; each category heading still shows its full count
  // even while only part of that aisle has been drawn.
  const ordered = ingredientCategories.flatMap((category) => ingredients.filter((ingredient) => ingredientCategory(ingredient) === category));
  const totals = new Map();
  ordered.forEach((ingredient) => {
    const category = ingredientCategory(ingredient);
    totals.set(category, (totals.get(category) || 0) + 1);
  });

  // A new search or filter starts from the top; anything else (a save, a delete)
  // redraws at least as many tiles as were showing, so the page doesn't shrink
  // under the user and jump their scroll position.
  const viewKey = `${ingredientCategoryFilter}|${terms.join(" ")}`;
  if (viewKey !== ingredientListViewKey) {
    ingredientListViewKey = viewKey;
    ingredientListShown = INGREDIENT_BATCH_SIZE;
  }
  const target = Math.max(INGREDIENT_BATCH_SIZE, ingredientListShown);

  ingredientListObserver?.disconnect();
  list.innerHTML = "";
  let drawn = 0;
  const sentinel = document.createElement("div");
  sentinel.className = "ingredient-list-sentinel";
  sentinel.setAttribute("aria-hidden", "true");

  const drawUpTo = (count) => {
    const batch = ordered.slice(drawn, count);
    if (!batch.length) return;
    let group = list.querySelector(":scope > .ingredient-group:last-of-type");
    batch.forEach((ingredient) => {
      const category = ingredientCategory(ingredient);
      if (group?.dataset.category !== category) {
        group = document.createElement("section");
        group.className = "ingredient-group";
        group.dataset.category = category;
        group.innerHTML = `
          <header class="recipe-category-heading">
            <h4>${escapeHtml(category)}</h4>
            <span>${totals.get(category)}</span>
          </header>
          <div class="mapping-list"></div>`;
        list.append(group);
      }
      const holder = document.createElement("div");
      holder.innerHTML = ingredientTile(ingredient);
      const tile = holder.firstElementChild;
      group.querySelector(".mapping-list").append(tile);
      bindIngredientTile(tile);
      syncIngredientTileSelection(tile);
      setupCloudImageDiagnostics(tile);
    });
    drawn += batch.length;
    ingredientListShown = Math.max(ingredientListShown, drawn);
    // Keep the sentinel last so it trails the newest tiles.
    if (drawn < ordered.length) {
      list.append(sentinel);
      // An observer only reports changes, so if the sentinel is still on screen
      // after this batch (a tall screen), re-observing asks again.
      if (ingredientListObserver) {
        ingredientListObserver.unobserve(sentinel);
        ingredientListObserver.observe(sentinel);
      }
    } else {
      sentinel.remove();
      ingredientListObserver?.disconnect();
    }
  };

  drawUpTo(target);
  // Deleted (or renamed) ingredients drop out of a bulk selection.
  [...ingredientBulkSelection].forEach((key) => {
    if (!state.ingredients[key]) ingredientBulkSelection.delete(key);
  });
  syncIngredientBulkBar();
  if (drawn < ordered.length) {
    // Draw the next batch a screen or so before the user reaches the end.
    ingredientListObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) drawUpTo(drawn + INGREDIENT_BATCH_SIZE);
      },
      { rootMargin: "0px 0px 800px 0px" }
    );
    ingredientListObserver.observe(sentinel);
  }
}

function bindIngredientTileBulk(tile) {
  const key = tile.dataset.ingredientKey;
  let timer = null;
  let start = null;
  let longPressed = false;
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  tile.addEventListener("pointerdown", (event) => {
    // Edit/Delete keep their own taps; a right click keeps the browser menu.
    if (event.button !== 0 || event.target.closest(".ingredient-tile-actions")) return;
    longPressed = false;
    start = { x: event.clientX, y: event.clientY };
    cancel();
    timer = setTimeout(() => {
      timer = null;
      longPressed = true;
      navigator.vibrate?.(10);
      if (!ingredientBulkMode) enterIngredientBulkMode();
      ingredientBulkSelection.add(key);
      syncIngredientBulkBar();
    }, INGREDIENT_LONG_PRESS_MS);
  });
  // A scroll or drag is not a press.
  tile.addEventListener("pointermove", (event) => {
    if (timer && start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancel();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((type) => tile.addEventListener(type, cancel));
  // Phones raise their own long-press menu (open link, copy...) on the tile's link.
  tile.addEventListener("contextmenu", (event) => {
    if (timer || longPressed || ingredientBulkMode) event.preventDefault();
  });

  // Capture phase, so in bulk mode a tap picks the tile instead of opening its link.
  tile.addEventListener(
    "click",
    (event) => {
      if (event.target.closest(".ingredient-tile-actions")) return;
      if (longPressed) {
        // The click that ends the long press already selected the tile.
        longPressed = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!ingredientBulkMode) return;
      event.preventDefault();
      event.stopPropagation();
      toggleIngredientBulkSelection(key);
    },
    true
  );
  // Plain tiles (no link) aren't focusable on their own; in bulk mode Space or
  // Enter on a focused tile toggles it.
  tile.addEventListener("keydown", (event) => {
    if (!ingredientBulkMode || event.target.closest(".ingredient-tile-actions")) return;
    if (event.key === " " || (event.key === "Enter" && !event.target.closest("a"))) {
      event.preventDefault();
      toggleIngredientBulkSelection(key);
    }
  });
}

function enterIngredientBulkMode() {
  ingredientBulkMode = true;
  syncIngredientBulkBar();
}

function exitIngredientBulkMode() {
  if (!ingredientBulkMode && !ingredientBulkSelection.size) return;
  ingredientBulkMode = false;
  ingredientBulkSelection.clear();
  syncIngredientBulkBar();
}

function toggleIngredientBulkSelection(key) {
  if (ingredientBulkSelection.has(key)) ingredientBulkSelection.delete(key);
  else ingredientBulkSelection.add(key);
  syncIngredientBulkBar();
}

function syncIngredientTileSelection(tile) {
  const selected = ingredientBulkMode && ingredientBulkSelection.has(tile.dataset.ingredientKey);
  tile.dataset.selected = String(selected);
  const surface = tile.querySelector(".ingredient-tile-link");
  if (!surface) return;
  if (ingredientBulkMode) {
    surface.setAttribute("aria-pressed", String(selected));
    if (surface.classList.contains("is-plain")) {
      surface.setAttribute("role", "button");
      surface.tabIndex = 0;
    }
  } else {
    surface.removeAttribute("aria-pressed");
    if (surface.classList.contains("is-plain")) {
      surface.removeAttribute("role");
      surface.removeAttribute("tabindex");
    }
  }
}

function syncIngredientBulkBar() {
  const view = document.getElementById("ingredients-view");
  const bar = document.getElementById("ingredient-bulk-bar");
  if (!view || !bar) return;
  view.classList.toggle("is-bulk-selecting", ingredientBulkMode);
  bar.hidden = !ingredientBulkMode;
  const count = ingredientBulkSelection.size;
  document.getElementById("ingredient-bulk-count").textContent = count ? `${count} selected` : "Tap to select";
  const select = document.getElementById("ingredient-bulk-category");
  document.getElementById("ingredient-bulk-apply").disabled = !count || select.value === INGREDIENT_BULK_CHOOSE;
  document.querySelectorAll("#ingredient-list .ingredient-tile").forEach(syncIngredientTileSelection);
}

function setupIngredientBulkBar() {
  const select = document.getElementById("ingredient-bulk-category");
  if (!select) return;
  // Every option passes the placeholder as "selected": the default "" would
  // otherwise preselect Auto, whose value is "".
  select.innerHTML = [
    optionMarkup(INGREDIENT_BULK_CHOOSE, "Move to…", INGREDIENT_BULK_CHOOSE, " disabled"),
    ...ingredientCategories.map((category) => optionMarkup(category, category, INGREDIENT_BULK_CHOOSE)),
    optionMarkup("", "Auto (from name)", INGREDIENT_BULK_CHOOSE)
  ].join("");
  select.addEventListener("change", syncIngredientBulkBar);
  document.getElementById("ingredient-bulk-cancel").innerHTML = icon("x");
  document.getElementById("ingredient-bulk-cancel").addEventListener("click", exitIngredientBulkMode);
  document.getElementById("ingredient-bulk-apply").addEventListener("click", applyIngredientBulkCategory);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ingredientBulkMode && !document.querySelector("dialog[open]")) exitIngredientBulkMode();
  });
}

function applyIngredientBulkCategory() {
  const select = document.getElementById("ingredient-bulk-category");
  const category = select.value;
  if (category === INGREDIENT_BULK_CHOOSE || !ingredientBulkSelection.size || !requireCloudWrite()) return;
  let moved = 0;
  ingredientBulkSelection.forEach((key) => {
    const ingredient = state.ingredients[key];
    if (!ingredient) return;
    // "" means Auto: the category is guessed from the name again.
    ingredient.category = category;
    moved += 1;
  });
  select.value = INGREDIENT_BULK_CHOOSE;
  exitIngredientBulkMode();
  saveState();
  renderAll();
  showToast(`Moved ${moved} ingredient${moved === 1 ? "" : "s"} to ${category || "Auto"}`);
}

function bindIngredientTile(tile) {
  bindIngredientTileBulk(tile);
  tile.querySelector("[data-edit-ingredient]")?.addEventListener("click", (event) => {
    fillIngredientForm(state.ingredients[event.currentTarget.dataset.editIngredient]);
  });

  const button = tile.querySelector("[data-delete-ingredient]");
  if (!button) return;
  button.addEventListener("click", async () => {
    if (!requireCloudWrite()) return;
    const key = button.dataset.deleteIngredient;
    const inUse = state.recipes.some((recipe) => recipe.ingredients?.some((item) => typeof item === "object" && item.key === key));
    if (inUse) {
      setAuthMessage("This ingredient is used by a recipe and cannot be deleted.");
      return;
    }

    // Deleting drops its photo and macros for good, so ask first (same dialog
    // as removing an ingredient row in the recipe editor).
    const name = state.ingredients[key]?.name || "This ingredient";
    if (!await confirmAction({
      title: "Delete ingredient?",
      message: `${name} will be removed from your ingredient list.`,
      confirmLabel: "Delete",
    })) return;
    if (!state.ingredients[key]) return;

    if (state.ingredients[key]?.imagePath) void deleteStoredImage(state.ingredients[key].imagePath);
    delete state.ingredients[key];
    saveState();
    renderAll();
    refreshRecipeMacroPreview();
  });
}

// Held only for the session so the last "I made this" can be taken back; a bulk
// change across several entries is tedious to reverse by hand.
let lastStockDeduction = null;

function cookRecipe(recipe) {
  if (!requireCloudWrite()) return;

  const result = deductRecipeFromStock(recipe);
  lastStockDeduction = result.used.length ? { recipeId: recipe.id, snapshot: result.snapshot } : null;
  if (result.used.length) saveState();
  renderAll();
  setAuthMessage(describeStockDeduction(result));
}

function undoStockDeduction() {
  if (!lastStockDeduction || !requireCloudWrite()) return;

  Object.values(lastStockDeduction.snapshot).forEach((entry) => {
    state.kitchenStock[entry.id] = { ...entry };
  });
  lastStockDeduction = null;
  saveState();
  renderAll();
  setAuthMessage("Kitchen stock restored.");
}

// Read the latest stock and record the receipt in the same commit, so retries
// and concurrent receipt imports cannot add the same purchase twice.
async function saveStockReceipt(receiptId, rows, householdId) {
  const ref = cloud.doc(cloud.db, "households", householdId);
  return cloud.runTransaction(cloud.db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("This household no longer exists.");
    const household = snapshot.data();
    const imports = Array.isArray(household.stockReceiptImports) ? household.stockReceiptImports : [];
    if (imports.includes(receiptId)) throw new Error("This receipt has already been added to kitchen stock.");
    const catalog = normalizeIngredientCatalog(household.ingredients);
    const kitchenStock = WalmartReceipt.mergeStock(
      normalizeKitchenStock(household.kitchenStock), rows,
      name => catalog[ingredientKey(name)], convertMeasurement, new Date().toISOString()
    );
    const stockReceiptImports = [...imports, receiptId].slice(-200);
    if (new Blob([JSON.stringify({ ...household, kitchenStock, stockReceiptImports })]).size > FIRESTORE_DOC_LIMIT) {
      throw new Error("This household is full. Remove some old data before importing this receipt.");
    }
    transaction.update(ref, { kitchenStock, stockReceiptImports });
    return { kitchenStock, stockReceiptImports };
  });
}

function setupStockReceiptImport() {
  const source = document.getElementById("stock-receipt-source");
  const file = document.getElementById("stock-receipt-file");
  const review = document.getElementById("stock-receipt-review");
  const items = document.getElementById("stock-receipt-items");
  const message = document.getElementById("stock-receipt-message");
  const importer = document.getElementById("stock-receipt-import");
  let receiptId = "";
  let reviewedHouseholdId = "";
  let busy = false;
  let revision = 0;
  const invalidate = () => {
    revision++;
    receiptId = "";
    reviewedHouseholdId = "";
    review.hidden = true;
    items.replaceChildren();
    message.textContent = "";
  };
  const setBusy = (value) => {
    busy = value;
    importer.querySelectorAll("input, textarea, select, button").forEach(element => {
      element.disabled = value || !canWriteCloudData();
    });
    importer.setAttribute("aria-busy", String(value));
  };
  source.addEventListener("input", invalidate);
  source.addEventListener("paste", event => {
    const html = event.clipboardData?.getData("text/html");
    if (!html) return;
    try {
      const text = WalmartReceipt.toText(html);
      if (text.length > 1000000) throw new Error("That receipt is too large. Paste just the purchased item list.");
      event.preventDefault();
      source.setRangeText(text, source.selectionStart, source.selectionEnd, "end");
      invalidate();
    } catch (error) {
      message.textContent = error.message;
    }
  });
  file.addEventListener("change", async () => {
    if (busy || !file.files[0]) return;
    invalidate();
    const selected = file.files[0];
    if (!/\.(eml|html?|txt)$/i.test(selected.name)) {
      message.textContent = "Choose an .eml, .html, or .txt file, or paste the receipt text.";
      return;
    }
    if (selected.size > 1000000) {
      message.textContent = "That file is too large. Paste just the purchased item list (up to 1 MB).";
      return;
    }
    setBusy(true);
    try {
      source.value = WalmartReceipt.toText(await selected.text());
      message.textContent = "Receipt loaded. Choose Find items to review it.";
    } catch (error) {
      message.textContent = "Could not read that receipt: " + error.message;
    } finally {
      setBusy(false);
    }
  });
  document.getElementById("stock-receipt-clear").addEventListener("click", () => {
    if (busy) return;
    source.value = "";
    file.value = "";
    invalidate();
  });
  document.getElementById("stock-receipt-read").addEventListener("click", async () => {
    if (busy || !requireCloudWrite()) return;
    invalidate();
    const readRevision = revision;
    setBusy(true);
    try {
      if (source.value.length > 1000000) throw new Error("Paste just the purchased item list (up to 1 MB).");
      const text = WalmartReceipt.toText(source.value);
      if (!text.trim()) throw new Error("Paste or choose a Walmart receipt first.");
      const rows = WalmartReceipt.parse(text);
      if (!rows.length) throw new Error("No items found. Copy the receipt's item list including prices and Qty lines, then try again.");
      if (rows.length > 300) throw new Error("This receipt has too many items. Import up to 300 items at a time.");
      const order = text.match(/\border\s*(?:number|no\.?|#|id)\s*[:#]?\s*([\d-]{8,})\b/i);
      const readHouseholdId = currentHouseholdId;
      const identity = order ? `walmart-order:${order[1]}` : text.toLowerCase().replace(/\s+/g, " ").trim();
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
      if (readRevision !== revision || readHouseholdId !== currentHouseholdId) return;
      receiptId = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      if (state.stockReceiptImports.includes(receiptId)) throw new Error("This receipt has already been added to kitchen stock.");
      reviewedHouseholdId = readHouseholdId;
      document.getElementById("stock-receipt-ingredients").innerHTML = Object.values(state.ingredients).map(item => optionMarkup(item.name, item.name)).join("");
      items.innerHTML = rows.map((row, index) => `
        <div class="stock-receipt-row">
          <input class="stock-receipt-selected" type="checkbox" aria-label="Include ${escapeHtml(row.name)}"${row.selected ? " checked" : ""} />
          <label class="stock-receipt-name">Item
            <input class="stock-receipt-item-name" list="stock-receipt-ingredients" maxlength="250" value="${escapeHtml(row.name)}" aria-label="Item ${index + 1}" />
            <small>${escapeHtml(row.warning || row.name)}</small>
          </label>
          <label class="stock-receipt-amount">Amount
            <input class="stock-receipt-quantity" type="text" inputmode="decimal" value="${escapeHtml(row.quantity)}" aria-label="Amount for item ${index + 1}" />
          </label>
          <label>Unit
            <select class="stock-receipt-unit" aria-label="Unit for item ${index + 1}">${unitOptionsMarkup({ selected: row.unit })}</select>
          </label>
        </div>`).join("");
      items.querySelectorAll(".stock-receipt-quantity").forEach(bindQuantityInput);
      review.hidden = false;
      message.textContent = `Found ${rows.length} items. Review the names, amounts, and units, and uncheck anything you did not receive or do not keep in your kitchen.`;
    } catch (error) {
      receiptId = "";
      message.textContent = error.message;
    } finally {
      setBusy(false);
    }
  });
  review.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !requireCloudWrite() || !receiptId) return;
    if (reviewedHouseholdId !== currentHouseholdId) {
      invalidate();
      message.textContent = "Your household changed. Choose Find items to review this receipt again.";
      return;
    }
    if (state.stockReceiptImports.includes(receiptId)) {
      message.textContent = "This receipt has already been added to kitchen stock.";
      return;
    }
    try {
      const rows = [...items.querySelectorAll(".stock-receipt-row")].filter(row => row.querySelector(".stock-receipt-selected").checked).map(row => {
        const input = row.querySelector(".stock-receipt-quantity");
        if (!isValidQuantityInput(input.value)) throw new Error("Use a whole number, decimal, or fraction for each selected amount.");
        return { name: row.querySelector(".stock-receipt-item-name").value.trim(), quantity: parseFractionInput(input.value), unit: normalizeMeasurementUnit(row.querySelector(".stock-receipt-unit").value) };
      });
      if (!rows.length) throw new Error("Select at least one item to add.");
      const householdId = currentHouseholdId;
      setBusy(true);
      message.textContent = "Adding receipt items to kitchen stock...";
      const saved = await saveStockReceipt(receiptId, rows, householdId);
      if (currentHouseholdId !== householdId) {
        invalidate();
        return;
      }
      state.kitchenStock = saved.kitchenStock;
      state.stockReceiptImports = saved.stockReceiptImports;
      lastStockDeduction = null;
      source.value = "";
      file.value = "";
      invalidate();
      renderAll();
      message.textContent = `Added ${rows.length} items to kitchen stock. Existing amounts were increased.`;
      setAuthMessage("Walmart receipt items saved to Firebase.");
    } catch (error) {
      message.textContent = error.message;
    } finally {
      setBusy(false);
    }
  });
}

// The mobile "+" in the tab bar: pick what you cooked and it comes off the stock.
function setupCookDialog() {
  const dialog = document.getElementById("cook-dialog");
  const open = document.getElementById("log-cooked");
  const search = document.getElementById("cook-search");
  if (!dialog || !open) return;

  open.addEventListener("click", () => {
    if (!requireCloudWrite()) return;
    search.value = "";
    renderCookRecipeList();
    dialog.showModal();
  });

  search.addEventListener("input", renderCookRecipeList);
  document.getElementById("close-cook-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.getElementById("cook-recipe-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-cook-id]");
    if (!button) return;
    const recipe = recipeById(button.dataset.cookId);
    if (!recipe) return;
    dialog.close();
    cookRecipe(recipe);
  });
}

function renderCookRecipeList() {
  const list = document.getElementById("cook-recipe-list");
  if (!list) return;

  const query = document.getElementById("cook-search").value.trim().toLowerCase();
  const recipes = state.recipes
    .filter((recipe) => !query || recipe.name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!recipes.length) {
    list.innerHTML = `<p class="empty-state">${state.recipes.length ? "No recipe matches that search." : "Add a recipe first."}</p>`;
    return;
  }

  list.innerHTML = recipes
    .map((recipe) => {
      // Same coverage figure the recipe cards show, so the two never disagree.
      const coverage = recipeStockCoverage(recipe);
      const label = coverage.total ? (coverage.ready ? `${icon("check")} Can make now` : `${coverage.have} of ${coverage.total} in stock`) : "No amounts set";
      return `
        <button class="cook-recipe${coverage.ready ? " is-ready" : ""}" data-cook-id="${escapeHtml(recipe.id)}" type="button">
          <span class="cook-recipe-body">
            <strong>${escapeHtml(recipe.name)}</strong>
            <span class="cook-recipe-meta">${escapeHtml(recipe.category)} · ${coverage.total || recipe.ingredients?.length || 0} ingredients</span>
          </span>
          <span class="cook-recipe-stock${coverage.have ? "" : " is-empty"}">${label}</span>
        </button>`;
    })
    .join("");
}

function kitchenStockEntries() {
  return Object.values(state.kitchenStock || {}).sort((a, b) => a.name.localeCompare(b.name));
}

// The stock entry for a catalog ingredient, keyed the same way the catalog is.
function kitchenStockFor(key) {
  return key ? state.kitchenStock?.[key] : undefined;
}

// Free-text stock entries carry no catalog key, so fall back to matching by name.
function findKitchenStock(name) {
  return state.kitchenStock?.[kitchenStockId("", name)];
}

// The stock entry a recipe ingredient draws from, if you actually have any.
function stockedFor(key, name) {
  const entry = kitchenStockFor(key) || findKitchenStock(name);
  return entry && entry.quantity > 0 ? entry : undefined;
}

// What a recipe line actually consumes, in absolute terms: the same figure the
// grocery list shows, so cooking and shopping never disagree.
function recipeIngredientUsage(item) {
  const parsed = parseRecipeIngredient(item);
  if (!parsed) return null;
  return {
    key: parsed.key,
    name: parsed.name,
    quantity: Number(parsed.quantity || 0) * (Number(parsed.servingAmount) || 1),
    unit: normalizeMeasurementUnit(parsed.servingUnit)
  };
}

// How much of a recipe the kitchen stock actually covers. Lines with no quantity
// ("salt to taste") are not counted - they should never block a recipe from
// reading as makeable. A unit that cannot convert counts as short, never as have.
function recipeStockCoverage(recipe) {
  const statuses = (recipe.ingredients || []).map(ingredientStockStatus).filter(Boolean);
  const coverage = { total: statuses.length, have: 0, short: 0, missing: 0, ready: false };
  statuses.forEach((status) => { coverage[status] += 1; });
  coverage.ready = coverage.total > 0 && coverage.have === coverage.total;
  return coverage;
}

// "have", "short" or "missing" for one recipe line, or null when the line has
// no quantity and so is never counted.
function ingredientStockStatus(item) {
  const usage = recipeIngredientUsage(item);
  if (!usage || !(usage.quantity > 0)) return null;
  const entry = stockedFor(usage.key, usage.name);
  if (!entry) return "missing";

  const needed = usage.unit === entry.unit
    ? usage.quantity
    : convertMeasurement(usage.quantity, usage.unit, entry.unit);
  if (needed === null || !Number.isFinite(needed)) return "short";
  // Tolerance keeps 0.30000000000000004 from reading as short of 0.3.
  return entry.quantity + 1e-6 >= needed ? "have" : "short";
}

function hasKitchenStock() {
  return Object.values(state.kitchenStock || {}).some((entry) => entry.quantity > 0);
}

// Cooking a recipe draws its ingredients down from the kitchen stock. Entries are
// kept at zero rather than deleted, so "we're out of eggs" still shows on the list.
function deductRecipeFromStock(recipe) {
  const snapshot = {};
  const used = [];
  const skipped = [];

  (recipe.ingredients || []).forEach((item) => {
    const usage = recipeIngredientUsage(item);
    if (!usage || usage.quantity <= 0) return;

    const entry = kitchenStockFor(usage.key) || findKitchenStock(usage.name);
    if (!entry) {
      skipped.push({ name: usage.name, reason: "not in stock" });
      return;
    }

    const amount = usage.unit === entry.unit
      ? usage.quantity
      : convertMeasurement(usage.quantity, usage.unit, entry.unit);
    if (amount === null || !Number.isFinite(amount)) {
      skipped.push({ name: usage.name, reason: `cannot convert to ${entry.unit || "its stock unit"}` });
      return;
    }

    snapshot[entry.id] ??= { ...entry };
    const before = entry.quantity;
    entry.quantity = Math.max(0, roundTo(before - amount, 4));
    entry.updatedAt = new Date().toISOString();

    // Reported in the units the recipe calls for - "200 g", not the stock's "0.2 kg".
    const taken = Math.min(amount, before);
    const shown = usage.unit && usage.unit !== entry.unit ? convertMeasurement(taken, entry.unit, usage.unit) : taken;
    used.push({
      name: entry.name,
      taken: roundTo(shown ?? taken, 4),
      unit: shown === null || !usage.unit ? entry.unit : usage.unit,
      left: entry.quantity
    });
  });

  return { snapshot, used, skipped };
}

function describeStockDeduction({ used, skipped }) {
  if (!used.length) {
    return skipped.length
      ? `Nothing was deducted - ${skipped.map((item) => `${item.name} (${item.reason})`).join(", ")}.`
      : "Nothing to deduct from your kitchen stock.";
  }

  const drained = used.filter((item) => item.left === 0).map((item) => item.name);
  const parts = [`Used ${used.map((item) => amountWithName(item.taken, item.unit, item.name)).join(", ")}.`];
  if (drained.length) parts.push(`Out of ${drained.join(", ")}.`);
  if (skipped.length) parts.push(`Skipped ${skipped.map((item) => `${item.name} (${item.reason})`).join(", ")}.`);
  return parts.join(" ");
}

function kitchenStockAmountText(entry) {
  return amountParts(entry.quantity, entry.unit).text || formatQuantity(entry.quantity);
}

function renderKitchenStock() {
  const list = document.getElementById("kitchen-stock-list");
  if (!list) return;

  populateKitchenStockUnits();

  const entries = kitchenStockEntries();
  if (!entries.length) {
    list.innerHTML = '<p class="empty-state">Add what you already have in the kitchen and it will show up on your grocery list.</p>';
    return;
  }

  list.innerHTML = entries.map(kitchenStockTile).join("");

  list.querySelectorAll("[data-edit-stock]").forEach((button) => {
    button.addEventListener("click", () => fillKitchenStockForm(state.kitchenStock[button.dataset.editStock]));
  });

  list.querySelectorAll("[data-delete-stock]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!requireCloudWrite()) return;
      const id = button.dataset.deleteStock;
      delete state.kitchenStock[id];
      resetKitchenStockForm();
      saveState();
      renderAll();
    });
  });
}

function kitchenStockTile(entry) {
  const ingredient = kitchenStockCatalogEntry(entry);
  const image = ingredient ? ingredientImage(ingredient) : "";
  const visual = image
    ? `<span class="ingredient-tile-visual has-image"><img class="ingredient-tile-image" src="${escapeHtml(tileImageUrl(image))}" alt="" width="240" height="240" loading="lazy" decoding="async" data-cloud-image data-image-label="${escapeHtml(entry.name)}" /></span>`
    : `<span class="ingredient-tile-visual">${escapeHtml(entry.name.slice(0, 1).toUpperCase())}</span>`;

  return `
    <article class="ingredient-tile kitchen-stock-tile">
      <span class="ingredient-tile-link is-plain">
        ${visual}
        <span class="ingredient-tile-body">
          <strong>${escapeHtml(entry.name)}</strong>
          <span class="kitchen-stock-amount">${escapeHtml(kitchenStockAmountText(entry))}</span>
          ${entry.note ? `<span class="kitchen-stock-note">${escapeHtml(entry.note)}</span>` : ""}
        </span>
      </span>
      <div class="ingredient-tile-actions">
        <button class="secondary-button" data-edit-stock="${escapeHtml(entry.id)}" type="button">Edit</button>
        <button class="danger-button" data-delete-stock="${escapeHtml(entry.id)}" type="button">Delete</button>
      </div>
    </article>`;
}

function kitchenStockCatalogEntry(entry) {
  return state.ingredients?.[entry.key] || findIngredient(entry.name) || null;
}

function populateKitchenStockUnits() {
  const select = document.getElementById("kitchen-stock-unit");
  if (!select || select.options.length) return;
  select.innerHTML = unitOptionsMarkup({ selected: "piece" });
}

function ingredientTile(ingredient) {
  const image = ingredientImage(ingredient);
  const url = safeLinkUrl(ingredient.url);
  const visual = image
    ? `<span class="ingredient-tile-visual has-image"><img class="ingredient-tile-image" src="${escapeHtml(tileImageUrl(image))}" alt="" width="240" height="240" loading="lazy" decoding="async" data-cloud-image data-image-label="${escapeHtml(ingredient.name)}" /></span>`
    : `<span class="ingredient-tile-visual">${escapeHtml(ingredient.name.slice(0, 1).toUpperCase())}</span>`;
  const macros = nutrients
    .filter((nutrient) => tileNutrientKeys.includes(nutrient.key))
    .map(
      (nutrient) => `
        <span class="ingredient-macro">
          <em>${escapeHtml(nutrient.short)}</em>
          <b>${nutrientText(nutrient, ingredient[nutrient.key])}</b>
        </span>`
    )
    .join("");

  const body = `
    ${visual}
    <span class="ingredient-tile-body">
      <strong>${escapeHtml(ingredient.name)}</strong>
      <span class="ingredient-tile-serving">${escapeHtml(formatAmountsInText(ingredient.serving))} per serving · ${formatQuantity(
        servingsPerContainer(ingredient)
      )} per container</span>
      <span class="ingredient-tile-macros nutrition-only">${macros}</span>
    </span>`;

  const surface = url
    ? `<a class="ingredient-tile-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${body}</a>`
    : `<span class="ingredient-tile-link is-plain">${body}</span>`;

  return `
    <article class="ingredient-tile" data-ingredient-key="${escapeHtml(ingredient.key)}">
      <span class="ingredient-tile-check" aria-hidden="true">${icon("check")}</span>
      ${surface}
      <div class="ingredient-tile-actions">
        <button class="secondary-button" data-edit-ingredient="${escapeHtml(ingredient.key)}" type="button">Edit</button>
        <button class="danger-button" data-delete-ingredient="${escapeHtml(ingredient.key)}" type="button">Delete</button>
      </div>
    </article>`;
}

function safeLinkUrl(value) {
  return /^https?:\/\//i.test(String(value || "")) ? value : "";
}

// ---------------------------------------------------------------------------
// Recipe import: reads schema.org/Recipe data out of a pasted recipe page.
// ---------------------------------------------------------------------------

const importCategoryMap = {
  breakfast: "Breakfast",
  brunch: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  "main course": "Dinner",
  "main dish": "Dinner",
  entree: "Dinner",
  supper: "Dinner",
  dessert: "Dessert",
  desserts: "Dessert",
  baking: "Dessert",
  snack: "Snack",
  snacks: "Snack",
  drink: "Drink",
  drinks: "Drink",
  beverage: "Drink",
  beverages: "Drink",
  cocktail: "Drink",
  cocktails: "Drink",
  smoothie: "Drink",
  smoothies: "Drink",
  appetizer: "Side",
  appetizers: "Side",
  "side dish": "Side",
  side: "Side",
  salad: "Side",
  soup: "Side"
};

const vulgarFractions = {
  "¼": "1/4", "½": "1/2", "¾": "3/4",
  "⅓": "1/3", "⅔": "2/3",
  "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5",
  "⅙": "1/6", "⅚": "5/6",
  "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8"
};

const recipeImportBookmarklet =
  "javascript:(function(){var n=document.querySelectorAll('script[type=\"application/ld+json\"]'),t=[];" +
  "for(var i=0;i<n.length;i++){t.push(n[i].textContent);}" +
  "var s=t.join('\\n<!--SPLIT-->\\n')||document.documentElement.outerHTML;" +
  "if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(function(){alert('Recipe data copied.');}," +
  "function(){window.prompt('Copy this:',s);});}else{window.prompt('Copy this:',s);}})();";

function parsePastedRecipe(source) {
  const text = String(source || "").trim();
  if (!text) throw new Error("Paste a recipe page first.");

  const doc = text.startsWith("{") || text.startsWith("[") ? null : new DOMParser().parseFromString(text, "text/html");
  const node = findRecipeNode(collectJsonLdNodes(text, doc));
  if (node) return recipeFromSchema(node);

  const microdata = doc ? recipeFromMicrodata(doc) : null;
  if (microdata) return microdata;

  throw new Error("No recipe data found. Paste the whole page source, or try the bookmarklet.");
}

function collectJsonLdNodes(text, doc) {
  const chunks = text.split("<!--SPLIT-->");
  if (doc) doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => chunks.push(script.textContent));

  const parsed = [];
  chunks.forEach((chunk) => {
    const clean = String(chunk || "").trim();
    if (!clean.startsWith("{") && !clean.startsWith("[")) return;
    try {
      parsed.push(JSON.parse(clean));
    } catch (error) {
      // A page can carry malformed blocks alongside good ones; keep looking.
    }
  });
  return parsed;
}

function findRecipeNode(values, depth = 0) {
  if (depth > 6) return null;
  for (const value of values) {
    if (Array.isArray(value)) {
      const match = findRecipeNode(value, depth + 1);
      if (match) return match;
      continue;
    }
    if (!value || typeof value !== "object") continue;
    if (schemaTypes(value).includes("recipe")) return value;
    const match = findRecipeNode(Object.values(value), depth + 1);
    if (match) return match;
  }
  return null;
}

function schemaTypes(node) {
  const type = node["@type"] ?? node.type;
  return (Array.isArray(type) ? type : [type]).filter(Boolean).map((value) => String(value).toLowerCase());
}

function recipeFromSchema(node) {
  const name = schemaText(node.name) || schemaText(node.headline);
  const ingredients = arrayify(node.recipeIngredient ?? node.ingredients)
    .map((line) => normalizeIngredientLine(schemaText(line)))
    .filter(Boolean);
  const steps = schemaSteps(node.recipeInstructions);
  const servings = schemaServings(node.recipeYield);

  return {
    name: name || "Imported recipe",
    category: schemaCategory(node),
    servings,
    ingredients,
    steps,
    notes: buildImportNotes(node),
    image: schemaImage(node.image),
    nutrition: schemaNutrition(node.nutrition, servings)
  };
}

function arrayify(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function schemaText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return stripMarkup(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return schemaText(value[0]);
  if (typeof value === "object") return schemaText(value.text ?? value.name ?? value["@value"] ?? "");
  return "";
}

function stripMarkup(value) {
  const raw = String(value);
  if (!raw.includes("<") && !raw.includes("&")) return collapseSpaces(raw);
  const doc = new DOMParser().parseFromString(raw, "text/html");
  const root = doc.documentElement ? doc.body || doc.documentElement : null;
  if (!root) return collapseSpaces(raw);
  root.querySelectorAll("li, p, br, div").forEach((element) => element.after(doc.createTextNode("\n")));
  return collapseSpaces(root.textContent || "");
}

function collapseSpaces(value) {
  return String(value).replace(new RegExp(String.fromCharCode(160), "g"), " ").replace(/[ 	]+/g, " ").trim();
}

function schemaSteps(value, depth = 0) {
  if (!value || depth > 4) return [];
  if (typeof value === "string") return splitSteps(stripMarkup(value));
  if (Array.isArray(value)) return value.flatMap((entry) => schemaSteps(entry, depth + 1));
  if (typeof value === "object") {
    if (Array.isArray(value.itemListElement)) return schemaSteps(value.itemListElement, depth + 1);
    return splitSteps(stripMarkup(value.text ?? value.name ?? ""));
  }
  return [];
}

function splitSteps(text) {
  return String(text)
    .split(/\r?\n+/)
    .map((step) => step.replace(/^\s*(?:step\s*)?\d+[.):]\s*/i, "").trim())
    .filter((step) => step.length > 1);
}

function schemaServings(value) {
  const text = Array.isArray(value) ? value.map(schemaText).join(" ") : schemaText(value);
  const match = text.match(/\d+(?:\.\d+)?/);
  const servings = match ? Number(match[0]) : 0;
  return servings > 0 && servings < 500 ? servings : 4;
}

function schemaImage(value) {
  if (!value) return "";
  if (typeof value === "string") return safeImageUrl(value);
  if (Array.isArray(value)) {
    for (const entry of value) {
      const url = schemaImage(entry);
      if (url) return url;
    }
    return "";
  }
  if (typeof value === "object") return schemaImage(value.url ?? value.contentUrl ?? "");
  return "";
}

function schemaCategory(node) {
  const candidates = [...arrayify(node.recipeCategory), ...arrayify(node.recipeCuisine), ...arrayify(node.keywords)];
  for (const candidate of candidates) {
    const key = schemaText(candidate).toLowerCase().trim();
    if (importCategoryMap[key]) return importCategoryMap[key];
  }
  return "Dinner";
}

function schemaNutrition(nutrition, servings) {
  if (!nutrition || typeof nutrition !== "object") return null;
  const fields = {
    calories: nutrition.calories,
    protein: nutrition.proteinContent,
    carbs: nutrition.carbohydrateContent,
    fat: nutrition.fatContent
  };

  const perRecipe = {};
  let found = false;
  Object.entries(fields).forEach(([key, value]) => {
    const match = schemaText(value).match(/\d+(?:\.\d+)?/);
    if (!match) return;
    found = true;
    // schema.org nutrition is per serving; this app stores whole-recipe totals.
    perRecipe[key] = roundTo(Number(match[0]) * servings, 2);
  });

  return found ? perRecipe : null;
}

function buildImportNotes(node) {
  const parts = [schemaText(node.description)];
  const author = schemaText(node.author);
  const source = schemaText(node.url ?? node["@id"]);
  if (author) parts.push(`Recipe by ${author}`);
  if (/^https?:\/\//i.test(source)) parts.push(source);
  return parts.filter(Boolean).join("\n\n").slice(0, 2000);
}

function normalizeIngredientLine(line) {
  let text = collapseSpaces(line);
  Object.entries(vulgarFractions).forEach(([symbol, fraction]) => {
    text = text.split(symbol).join(` ${fraction}`);
  });
  text = collapseSpaces(text);
  // "1 1/2 cups flour" -> "1.5 cups flour", which the ingredient parser understands.
  text = text.replace(/^(\d+)\s+(\d+)\/(\d+)\b/, (whole, a, b, c) => String(Number(a) + Number(b) / Number(c)));
  return text.replace(/^[\s\-•*]+/, "").trim();
}

function recipeFromMicrodata(doc) {
  const scope = doc.querySelector('[itemtype*="schema.org/Recipe" i]') || doc;
  const pick = (property) => [...scope.querySelectorAll(`[itemprop="${property}" i]`)];
  const ingredients = [...pick("recipeIngredient"), ...pick("ingredients")]
    .map((element) => normalizeIngredientLine(element.textContent))
    .filter(Boolean);
  if (!ingredients.length) return null;

  const steps = pick("recipeInstructions").flatMap((element) => {
    const items = [...element.querySelectorAll("li, p")];
    const source = items.length ? items.map((item) => item.textContent) : [element.textContent];
    return source.flatMap((text) => splitSteps(collapseSpaces(text)));
  });

  return {
    name: collapseSpaces(pick("name")[0]?.textContent || "") || "Imported recipe",
    category: "Dinner",
    servings: schemaServings(pick("recipeYield")[0]?.textContent || ""),
    ingredients,
    steps,
    notes: collapseSpaces(pick("description")[0]?.textContent || ""),
    image: safeImageUrl(pick("image")[0]?.getAttribute("src") || pick("image")[0]?.getAttribute("content") || ""),
    nutrition: null
  };
}

function applyImportedRecipe(parsed) {
  showRecipeEditor();
  document.getElementById("recipe-name").value = parsed.name;
  document.getElementById("recipe-servings").value = parsed.servings;
  document.getElementById("recipe-notes").value = parsed.notes;

  // An imported category the index has not seen yet is added rather than dropped;
  // saving the recipe folds it into recipeCategories() for good.
  const categorySelect = document.getElementById("recipe-category");
  const category = String(parsed.category || "").trim();
  if (category && ![...categorySelect.options].some((option) => option.value === category)) {
    categorySelect.insertAdjacentHTML("beforeend", optionMarkup(category, category));
  }
  categorySelect.value = category || "Dinner";

  const ingredientRows = document.getElementById("recipe-ingredient-rows");
  ingredientRows.replaceChildren();
  (parsed.ingredients.length ? parsed.ingredients : [""]).forEach((line) => addRecipeIngredientRow(line));

  const stepRows = document.getElementById("recipe-step-rows");
  stepRows.replaceChildren();
  (parsed.steps.length ? parsed.steps : [""]).forEach((step) => addRecipeStepRow(step));

  recipeDraftNutrition = parsed.nutrition;
  recipeDraftImage = safeImageUrl(parsed.image);
  setRecipePhotoMessage(recipeDraftImage ? "Photo linked from the source site." : OPTIONAL_PHOTO_MESSAGE);
  renderRecipePhotoPreview();
  document.getElementById("recipe-name").focus({ preventScroll: true });
}

function setupRecipeImport() {
  const panel = document.getElementById("recipe-import");
  const source = document.getElementById("recipe-import-source");
  const message = document.getElementById("recipe-import-message");
  const bookmarklet = document.getElementById("recipe-import-bookmarklet");

  bookmarklet.setAttribute("href", recipeImportBookmarklet);
  bookmarklet.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(recipeImportBookmarklet);
      message.textContent = "Bookmarklet copied. Make a new bookmark and paste it as the address.";
    } catch (error) {
      message.textContent = "Drag this link to your bookmarks bar to install it.";
    }
  });

  document.getElementById("recipe-import-clear").addEventListener("click", () => {
    source.value = "";
    message.textContent = "";
  });

  document.getElementById("recipe-import-run").addEventListener("click", () => {
    try {
      const parsed = parsePastedRecipe(source.value);
      applyImportedRecipe(parsed);
      source.value = "";
      panel.open = false;
      const missing = [];
      if (!parsed.ingredients.length) missing.push("ingredients");
      if (!parsed.steps.length) missing.push("steps");
      message.textContent = missing.length
        ? `Imported "${parsed.name}", but no ${missing.join(" or ")} were found - fill those in below.`
        : `Imported "${parsed.name}". Check it over, then save.`;
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

function macroCard(label, value, className = "") {
  return `<article class="macro-card ${className}"><span>${label}</span><strong>${value}</strong></article>`;
}

function renderWeekLabels() {
  const end = addDays(selectedWeekStart, 6);
  const thisWeek = getWeekStart(new Date());
  const weeksAway = Math.round((selectedWeekStart - thisWeek) / (7 * 24 * 60 * 60 * 1000));
  const relative = weeksAway === 0
    ? "This week"
    : weeksAway === 1
      ? "Next week"
      : weeksAway === -1
        ? "Last week"
        : `Week of ${formatDayDate(selectedWeekStart)}`;
  document.getElementById("planner-title").textContent = relative;
  document.getElementById("week-range").textContent = formatWeekSpan(selectedWeekStart, end);
  document.getElementById("week-sidebar-title").textContent = relative;
  document.getElementById("current-week").disabled = isCurrentWeek();
}

// "Oct 5 – 11", or "Sep 29 – Oct 5" across a month boundary. The year only shows
// when the week is not in the current one.
function formatWeekSpan(start, end) {
  const year = start.getFullYear() !== new Date().getFullYear() ? `, ${end.getFullYear()}` : "";
  const sameMonth = start.getMonth() === end.getMonth();
  return `${formatDayDate(start)} – ${sameMonth ? end.getDate() : formatDayDate(end)}${year}`;
}

function renderPlannedCount() {
  const count = plannedSlotValues().length;
  const total = days.length * meals.length;
  document.getElementById("planned-count").textContent = `${count} meal${count === 1 ? "" : "s"} planned`;
  document.getElementById("planner-view").dataset.plannedCount = String(count);
  document.getElementById("week-progress-label").textContent = `${count} of ${total} meals planned`;
  document.getElementById("week-progress-fill").style.width = `${Math.round((count / total) * 100)}%`;
  document.getElementById("week-progress").dataset.complete = String(count === total);
}

function renderAll() {
  renderWeekLabels();
  renderPlannerControls();
  renderPlanner();
  renderRecipes();
  renderRecipeEditor();
  renderGroceries();
  renderIngredients();
  renderKitchenStock();
  renderMacros();
  renderPlannedCount();
  refreshRecipeIngredientRows();
  updateDataControls();
}

function setupForms() {
  populateNutrientInputs();
  populateIngredientCategorySelect();
  setupIngredientBulkBar();
  setupStepLabelling();
  document.getElementById("ingredient-search").addEventListener("input", renderIngredients);
  populateServingUnits();
  populateKitchenStockUnits();
  bindQuantityInput(document.getElementById("kitchen-stock-quantity"));
  document.getElementById("recipe-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!requireCloudWrite()) return;
    const ingredients = collectRecipeIngredients();
    if (!ingredients?.length) {
      setAuthMessage("Add at least one ingredient.");
      return;
    }

    const editingId = event.target.dataset.editingId;
    const existingRecipe = editingId ? recipeById(editingId) : null;
    const hasManualIngredients = ingredients.some((ingredient) => typeof ingredient === "string");
    let macros = hasManualIngredients && existingRecipe ? nutrientValues(existingRecipe) : macrosForIngredientRows(ingredients);
    if (recipeDraftNutrition && !nutrients.some((nutrient) => macros[nutrient.key])) {
      macros = { ...macros, ...recipeDraftNutrition };
    }
    const steps = collectRecipeSteps();
    if (!steps.length) {
      setAuthMessage("Add at least one instruction step.");
      return;
    }

    const id = existingRecipe?.id || crypto.randomUUID();
    let photo;
    try {
      if (recipeDraftBlob) setRecipePhotoMessage("Uploading photo...");
      photo = await resolvePhoto("recipes", id, recipeDraftBlob, recipeDraftImage, existingRecipe);
    } catch (error) {
      setRecipePhotoMessage("Photo upload failed: " + error.message);
      setAuthMessage("The recipe was not saved because its photo could not be uploaded.");
      return;
    }

    const recipe = {
      id,
      name: document.getElementById("recipe-name").value.trim(),
      category: document.getElementById("recipe-category").value,
      servings: Number(document.getElementById("recipe-servings").value),
      ...macros,
      ingredients,
      steps,
      notes: document.getElementById("recipe-notes").value.trim(),
      ...photo
    };

    if (existingRecipe) {
      state.recipes[state.recipes.findIndex((item) => item.id === existingRecipe.id)] = recipe;
    } else {
      state.recipes.push(recipe);
    }

    openRecipeId = recipe.id;
    resetRecipeForm();
    saveState();
    renderAll();
    showRecipesView();
  });

  document.getElementById("recipe-search").addEventListener("input", () => {
    openRecipeId = null;
    renderRecipes();
  });
  document.getElementById("open-recipe-editor").addEventListener("click", () => {
    openRecipeId = null;
    showRecipeEditor();
  });
  const leaveRecipeEditor = () => {
    resetRecipeForm();
    showRecipesView();
  };
  document.getElementById("close-recipe-editor").addEventListener("click", leaveRecipeEditor);
  document.getElementById("cancel-recipe-edit").addEventListener("click", leaveRecipeEditor);
  document.getElementById("delete-recipe").addEventListener("click", () => {
    if (!requireCloudWrite()) return;
    const id = document.getElementById("recipe-form").dataset.editingId;
    const recipe = id ? recipeById(id) : null;
    if (!recipe || !window.confirm(`Delete ${recipe.name}? It also comes off every planned meal.`)) return;
    resetRecipeForm();
    deleteRecipe(id);
    openRecipeId = null;
    showRecipesView();
  });
  document.querySelectorAll("[data-servings-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById("recipe-servings");
      input.value = Math.max(1, (Number(input.value) || 1) + Number(button.dataset.servingsStep));
      refreshRecipeMacroPreview();
    });
  });
  document.getElementById("recipe-servings").addEventListener("input", refreshRecipeMacroPreview);
  document.getElementById("back-to-recipe-editor").addEventListener("click", () => {
    returnToRecipeEditor = false;
    activateAppView("recipe-editor", "recipes");
  });
  document.getElementById("recipe-photo").addEventListener("change", async (event) => {
    const blob = await readPhotoSelection(event, RECIPE_PHOTO_MAX_WIDTH, setRecipePhotoMessage);
    if (!blob) return;
    clearRecipePhotoDraft();
    recipeDraftBlob = blob;
    recipeDraftPreview = URL.createObjectURL(blob);
    renderRecipePhotoPreview();
  });
  bindPhotoLink({
    kind: "recipe",
    maxWidth: RECIPE_PHOTO_MAX_WIDTH,
    setMessage: setRecipePhotoMessage,
    apply: ({ blob, link }) => {
      clearRecipePhotoDraft();
      if (blob) {
        recipeDraftBlob = blob;
        recipeDraftPreview = URL.createObjectURL(blob);
      } else {
        recipeDraftImage = link;
      }
      renderRecipePhotoPreview();
    }
  });
  document.getElementById("remove-recipe-photo").addEventListener("click", () => {
    clearRecipePhotoDraft();
    recipeDraftImage = "";
    document.getElementById("recipe-photo").value = "";
    setRecipePhotoMessage("Photo removed. Save the recipe to apply.");
    renderRecipePhotoPreview();
  });
  document.getElementById("add-recipe-ingredient").addEventListener("click", () => {
    openRecipeFormSection("recipe-ingredients-body");
    addRecipeIngredientRow();
  });
  // The step being worked on when "Add step" is pressed. Pressing the button moves
  // focus to it, so remember the last step that had focus; focusing anything
  // other than the button forgets it, so an old edit doesn't steer new steps.
  let activeStepRow = null;
  const addStepButton = document.getElementById("add-recipe-step");
  document.getElementById("recipe-form").addEventListener("focusin", (event) => {
    if (event.target === addStepButton) return;
    activeStepRow = event.target.closest?.(".recipe-step-row") || null;
  });

  addStepButton.addEventListener("click", () => {
    openRecipeFormSection("recipe-steps-body");
    const after = activeStepRow?.isConnected ? activeStepRow : null;
    const row = addRecipeStepRow("", { after });
    // The new step can land below the fold or behind the phone action bar, so
    // bring it into view and start typing there.
    // Centered rather than "nearest" so the fixed bar can't cover it.
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.querySelector(".recipe-step-input")?.focus({ preventScroll: true });
  });
  document.querySelectorAll("#recipe-form .section-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const section = toggle.closest(".recipe-form-section");
      setRecipeFormSection(section, section.dataset.open !== "true");
    });
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".ingredient-mention")) return;
    document.querySelectorAll('.ingredient-mention[data-open="true"]').forEach((mention) => delete mention.dataset.open);
  });

  document.getElementById("ingredient-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!requireCloudWrite()) return;
    const name = document.getElementById("ingredient-name").value.trim();
    const key = ingredientKey(name);
    const previousKey = event.target.dataset.editingKey;
    const previousIngredient = previousKey ? state.ingredients[previousKey] : state.ingredients[key];
    let photo;
    try {
      if (ingredientDraftBlob) setIngredientPhotoMessage("Uploading photo...");
      photo = await resolvePhoto("ingredients", key, ingredientDraftBlob, ingredientDraftImage, previousIngredient);
    } catch (error) {
      setIngredientPhotoMessage("Photo upload failed: " + error.message);
      setAuthMessage("The ingredient was not saved because its photo could not be uploaded.");
      return;
    }

    const ingredient = {
      key,
      name,
      category: document.getElementById("ingredient-category").value,
      serving: readServingInputs(),
      ...readNutrientInputs(),
      servingsPerContainer: servingsPerContainer({
        servingsPerContainer: parseFractionInput(document.getElementById("ingredient-servings-per-container").value)
      }),
      url: document.getElementById("ingredient-url").value.trim(),
      ...photo
    };

    if (previousKey && previousKey !== key) {
      delete state.ingredients[previousKey];
      state.recipes.forEach((recipe) => {
        recipe.ingredients?.forEach((item) => {
          if (typeof item === "object" && item.key === previousKey) item.key = key;
        });
      });
      const stocked = state.kitchenStock[previousKey];
      if (stocked) {
        delete state.kitchenStock[previousKey];
        state.kitchenStock[key] = { ...stocked, id: key, key, name };
      }
    }

    state.ingredients[key] = ingredient;
    resetIngredientForm();
    renderAll();
    if (returnToRecipeEditor) {
      returnToRecipeEditor = false;
      activateAppView("recipe-editor", "recipes");
    }

    authEls.syncStatus.textContent = "Saving";
    setAccountStatus("checking", "Signed in", "Saving to Firebase...");
    const saved = await saveCloudState("Ingredient save failed");
    if (saved) {
      setAuthMessage("Ingredient saved to Firebase.");
      showToast(previousIngredient ? `${name} updated` : `${name} added to ingredients`);
    }
  });

  document.getElementById("kitchen-stock-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!requireCloudWrite()) return;
    const name = document.getElementById("kitchen-stock-name").value.trim();
    if (!name) return;

    const quantityInput = document.getElementById("kitchen-stock-quantity");
    if (!isValidQuantityInput(quantityInput.value)) {
      quantityInput.setCustomValidity("Use a whole number or a fraction, like 2 or 1 1/2.");
      quantityInput.reportValidity();
      quantityInput.setCustomValidity("");
      return;
    }

    // Matching the catalog keeps the entry linked to its ingredient, so the
    // grocery list can tell you already have it.
    const catalogIngredient = findIngredient(name);
    const key = catalogIngredient?.key || "";
    const id = kitchenStockId(key, name);
    const previousId = event.target.dataset.editingId;
    if (previousId && previousId !== id) delete state.kitchenStock[previousId];

    state.kitchenStock[id] = {
      id,
      key,
      name: catalogIngredient?.name || name,
      quantity: roundTo(parseFractionInput(quantityInput.value), 4),
      unit: normalizeMeasurementUnit(document.getElementById("kitchen-stock-unit").value),
      note: document.getElementById("kitchen-stock-note").value.trim(),
      updatedAt: new Date().toISOString()
    };

    resetKitchenStockForm();
    renderAll();

    authEls.syncStatus.textContent = "Saving";
    setAccountStatus("checking", "Signed in", "Saving to Firebase...");
    const saved = await saveCloudState("Kitchen stock save failed");
    if (saved) setAuthMessage("Kitchen stock saved to Firebase.");
  });

  document.getElementById("kitchen-stock-cancel").addEventListener("click", resetKitchenStockForm);

  document.getElementById("macro-profile").innerHTML = nutritionProfiles
    .map((entry) => optionMarkup(entry.value, entry.label))
    .join("");

  // Your calorie target and reference intake live on your own account.
  [
    ["macro-calories", "calories"],
    ["macro-profile", "profile"]
  ].forEach(([id, field]) => {
    document.getElementById(id).addEventListener("change", (event) => {
      if (!requireCloudWrite()) return;
      personalNutrition = normalizePersonalNutrition({ ...personalNutrition, [field]: event.target.value });
      renderMacros();
      void savePersonalNutrition();
    });
  });

  document.getElementById("macro-edit-goals").addEventListener("click", () => {
    editingGoals = !editingGoals;
    renderMacros();
  });

  // How many people the plan feeds is a fact about the plan, so it stays shared.
  document.getElementById("macro-people").addEventListener("change", (event) => {
    if (!requireCloudWrite()) return;
    state.nutrition = normalizeNutritionSettings({ people: event.target.value });
    saveState();
    renderMacros();
  });

  // The same ingredient-index picker the recipe rows use, so both search the
  // catalogue the same way and show the same serving and calorie hints.
  bindIngredientPicker({
    input: document.getElementById("kitchen-stock-name"),
    results: document.getElementById("kitchen-stock-results"),
    onChoose: (ingredient) => {
      applyKitchenStockUnitDefault(ingredient);
      document.getElementById("kitchen-stock-quantity").focus();
    }
  });

  document.getElementById("kitchen-stock-name").addEventListener("change", (event) => {
    applyKitchenStockUnitDefault(findIngredient(event.target.value.trim()));
  });

  document.getElementById("ingredient-photo").addEventListener("change", async (event) => {
    const blob = await readPhotoSelection(event, INGREDIENT_PHOTO_MAX_WIDTH, setIngredientPhotoMessage);
    if (!blob) return;
    clearIngredientPhotoDraft();
    ingredientDraftBlob = blob;
    ingredientDraftPreview = URL.createObjectURL(blob);
    renderIngredientPhotoPreview();
  });
  bindPhotoLink({
    kind: "ingredient",
    maxWidth: INGREDIENT_PHOTO_MAX_WIDTH,
    setMessage: setIngredientPhotoMessage,
    apply: ({ blob, link }) => {
      clearIngredientPhotoDraft();
      if (blob) {
        ingredientDraftBlob = blob;
        ingredientDraftPreview = URL.createObjectURL(blob);
      } else {
        ingredientDraftImage = link;
      }
      renderIngredientPhotoPreview();
    }
  });
  document.getElementById("remove-ingredient-photo").addEventListener("click", () => {
    clearIngredientPhotoDraft();
    ingredientDraftImage = "";
    document.getElementById("ingredient-photo").value = "";
    setIngredientPhotoMessage("Photo removed. Save the ingredient to apply.");
    renderIngredientPhotoPreview();
  });

  document.getElementById("clear-week").addEventListener("click", () => {
    if (!requireCloudWrite()) return;
    const planner = activePlanner();
    if (!planner) return;
    planner.plans[dateKey(selectedWeekStart)] = blankPlan();
    saveState();
    renderAll();
  });

  document.getElementById("previous-week").addEventListener("click", () => changeWeek(-7));
  document.getElementById("next-week").addEventListener("click", () => changeWeek(7));
  document.getElementById("current-week").addEventListener("click", () => {
    selectedWeekStart = getWeekStart(new Date());
    resetPlannerDay();
    renderAll();
  });

  document.getElementById("copy-groceries").addEventListener("click", async () => {
    const items = getGroceryTexts();
    if (!items.length) return;
    const text = items.join("\n");
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const field = document.createElement("textarea");
    field.value = text;
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  });

  document.getElementById("open-walmart-list").addEventListener("click", () => {
    const items = getGroceryTexts();
    if (!items.length) return;
    window.open(walmartSearchUrl(items.join(" ")), "_blank", "noopener");
  });

  addRecipeIngredientRow();
  addRecipeStepRow();
}

// Step text is edited as plain words; the labels live beside it as ranges and are
// written back as {{Ingredient|words}} only when the recipe is saved.
const stepEditorTags = new WeakMap();
const stepHighlightRenderers = new Set();

// Ingredient rows changed: names the steps mention automatically may have too.
function refreshStepHighlights() {
  stepHighlightRenderers.forEach((render) => render());
}

// `after`: insert right below that step row instead of at the end.
function addRecipeStepRow(value = "", { after = null } = {}) {
  const container = document.getElementById("recipe-step-rows");
  const row = document.createElement("div");
  row.className = "recipe-step-row";
  const { text, tags } = parseStepTags(value);
  row.innerHTML = `
    <button class="recipe-step-number drag-handle" type="button" aria-label="Reorder step" title="Press and hold to reorder, or use the arrow keys"></button>
    <div class="recipe-step-field">
      <label>
        <span class="recipe-step-label">Step</span>
        <span class="recipe-step-input-wrap">
          <textarea class="recipe-step-input" required placeholder="Describe this step...">${escapeHtml(text)}</textarea>
          <span class="recipe-step-highlights" aria-hidden="true"></span>
        </span>
      </label>
      <!-- Outside the <label>: clicks inside a label can be redirected to its textarea,
           which closed the dropdown before a choice registered. -->
      <span class="recipe-step-tools">
        <select class="recipe-step-tag" aria-label="Label the selected words as an ingredient"></select>
        <span class="recipe-step-tag-hint"></span>
      </span>
    </div>
    <button class="row-remove" type="button" aria-label="Remove step" title="Remove">${icon("x")}</button>`;

  stepEditorTags.set(row.querySelector(".recipe-step-input"), tags);
  bindStepIngredientTagger(row);

  bindConfirmRemove(row.querySelector(".row-remove"), {
    isEmpty: () => !row.querySelector(".recipe-step-input").value.trim(),
    title: "Remove this step?",
    message: () => {
      const text = row.querySelector(".recipe-step-input").value.trim();
      return text.length > 90 ? `“${text.slice(0, 90).trim()}…”` : `“${text}”`;
    },
    onRemove: () => {
      row.remove();
      if (!container.children.length) addRecipeStepRow();
      updateRecipeStepNumbers();
    }
  });
  if (after?.parentElement === container) after.after(row);
  else container.append(row);
  makeRowsSortable(container, { item: ".recipe-step-row", onReorder: updateRecipeStepNumbers });
  updateRecipeStepNumbers();
  return row;
}

const untagStepValue = "__untag__";

// "Add {{Granulated Sugar#1|sugar}}" -> text "Add sugar" plus a label over "sugar".
function parseStepTags(step) {
  const source = String(step ?? "");
  const tags = [];
  let text = "";
  let cursor = 0;
  for (const match of source.matchAll(stepTagPattern)) {
    text += source.slice(cursor, match.index);
    const { name } = parseStepTagTarget(match[1]);
    const label = (match[2] ?? name).trim() || name;
    tags.push({ start: text.length, end: text.length + label.length, target: match[1].trim() });
    text += label;
    cursor = match.index + match[0].length;
  }
  return { text: text + source.slice(cursor), tags };
}

function serializeStepTags(text, tags) {
  let result = "";
  let cursor = 0;
  [...tags].sort((a, b) => a.start - b.start).forEach((tag) => {
    const label = text.slice(tag.start, tag.end);
    if (tag.start < cursor || !label.trim() || /[{}|]/.test(label)) return;
    result += text.slice(cursor, tag.start) + stepTagMarkup(tag.target, label);
    cursor = tag.end;
  });
  return result + text.slice(cursor);
}

// Keeps labels on the same words while the text around them is edited. Typing
// inside a label grows it; an edit that cuts across a label's edge removes it.
function shiftStepTags(tags, before, after) {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) suffix += 1;
  const editEnd = before.length - suffix;
  const delta = after.length - before.length;

  return tags.flatMap((tag) => {
    if (tag.end <= prefix) return [tag];
    if (tag.start >= editEnd) return [{ ...tag, start: tag.start + delta, end: tag.end + delta }];
    if (prefix >= tag.start && editEnd <= tag.end) {
      const end = tag.end + delta;
      return end > tag.start ? [{ ...tag, end }] : [];
    }
    return [];
  });
}

function stepTagsTouching(tags, start, end) {
  return tags.filter((tag) => (start === end ? tag.start <= start && start <= tag.end : tag.start < end && tag.end > start));
}

// Select words in a step, pick the ingredient they refer to, and the saved recipe
// highlights those words with their amount.
function bindStepIngredientTagger(row) {
  const textarea = row.querySelector(".recipe-step-input");
  const layer = row.querySelector(".recipe-step-highlights");
  const select = row.querySelector(".recipe-step-tag");
  const hint = row.querySelector(".recipe-step-tag-hint");
  const tools = row.querySelector(".recipe-step-tools");
  let selection = { start: 0, end: 0 };
  let previousText = textarea.value;
  const tags = () => stepEditorTags.get(textarea) || [];
  const setTags = (next) => stepEditorTags.set(textarea, next);

  // The highlight layer mirrors the textarea's box and text exactly, with the
  // labelled words wrapped in <mark>, so the tint lands behind the right words.
  const renderHighlights = () => {
    const style = getComputedStyle(textarea);
    // Grow the box to fit its text so a step never hides behind a scrollbar.
    // Skipped while hidden (no width to measure); the ResizeObserver below
    // re-runs this once the editor shows.
    if (textarea.offsetWidth) {
      textarea.style.height = "auto";
      const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      textarea.style.height = `${textarea.scrollHeight + borders}px`;
    }
    [
      "boxSizing", "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing",
      "wordSpacing", "textIndent", "textTransform", "tabSize", "paddingTop", "paddingRight",
      "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"
    ].forEach((property) => {
      layer.style[property] = style[property];
    });
    const scrollbar = textarea.offsetWidth - textarea.clientWidth - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
    if (scrollbar > 0) layer.style.paddingRight = `${parseFloat(style.paddingRight) + scrollbar}px`;
    layer.style.width = `${textarea.offsetWidth}px`;
    layer.style.height = `${textarea.offsetHeight}px`;

    const text = textarea.value;
    // Words the recipe page would pick up on its own (an ingredient's name, with an
    // amount) are tinted too, so the editor shows exactly what will turn pink.
    const autoPattern = ingredientMentionPattern(recipeFormLabelChoices().filter((choice) => choice.amount).map((choice) => choice.name));
    const plain = (part) => {
      if (!autoPattern) return escapeHtml(part);
      let out = "";
      let at = 0;
      for (const match of part.matchAll(autoPattern)) {
        out += escapeHtml(part.slice(at, match.index)) + `<mark class="is-auto">${escapeHtml(match[0])}</mark>`;
        at = match.index + match[0].length;
      }
      return out + escapeHtml(part.slice(at));
    };
    let html = "";
    let cursor = 0;
    [...tags()].sort((a, b) => a.start - b.start).forEach((tag) => {
      if (tag.start < cursor) return;
      html += plain(text.slice(cursor, tag.start));
      html += `<mark>${escapeHtml(text.slice(tag.start, tag.end))}</mark>`;
      cursor = tag.end;
    });
    // A trailing newline needs a character after it to take up its line.
    layer.innerHTML = `${html}${plain(text.slice(cursor))} `;
    layer.scrollTop = textarea.scrollTop;
  };

  const choiceFor = (target) => recipeFormLabelChoices().find((choice) => choice.value.toLowerCase() === target.toLowerCase());

  const setHint = (message) => {
    hint.textContent = message;
    delete hint.dataset.selection;
  };

  const repopulate = () => {
    const choices = recipeFormLabelChoices();
    const touching = stepTagsTouching(tags(), selection.start, selection.end).length;
    // Ingredients that match the highlighted words come first ("brown sugar" ->
    // Light Brown Sugar, then Granulated Sugar); the rest keep alphabetical order.
    const picked = textarea.value.slice(selection.start, selection.end);
    const ranked = choices
      .map((choice, index) => ({ choice, index, score: labelMatchScore(picked, choice.name) }))
      .sort((a, b) => b.score - a.score || a.index - b.index);
    const matches = ranked.filter((entry) => entry.score > 0).map((entry) => entry.choice);
    const others = ranked.filter((entry) => entry.score <= 0).map((entry) => entry.choice);
    const options = (list) => list.map((choice) => optionMarkup(choice.value, choice.label)).join("");
    const groups = matches.length
      ? `<optgroup label="Best matches">${options(matches)}</optgroup>${others.length ? `<optgroup label="Other ingredients">${options(others)}</optgroup>` : ""}`
      : options(others);
    select.innerHTML = [
      optionMarkup("", choices.length ? "Label selection as..." : "Add an ingredient first"),
      groups,
      touching ? optionMarkup(untagStepValue, `Remove label${touching > 1 ? "s" : ""}`) : ""
    ].join("");
    select.value = "";
    select.disabled = !choices.length && !touching;
  };

  // The options are rebuilt while the words are being selected, never as the
  // dropdown itself opens: rewriting a <select> mid-click swallows the choice.
  let lastRepopulate = "";
  const refreshChoices = () => {
    const key = JSON.stringify([selection, textarea.value.length, tags(), recipeFormLabelChoices()]);
    if (key === lastRepopulate) return;
    lastRepopulate = key;
    repopulate();
  };

  // The textarea's own highlight disappears once focus moves to the dropdown, so
  // the remembered words are echoed under the step until they are labelled.
  const remember = () => {
    selection = { start: textarea.selectionStart, end: textarea.selectionEnd };
    const picked = textarea.value.slice(selection.start, selection.end).trim();
    const [current] = stepTagsTouching(tags(), selection.start, selection.end);
    if (picked) {
      hint.innerHTML = `Labelling <mark class="recipe-step-selection">${escapeHtml(picked)}</mark> - choose an ingredient`;
      hint.dataset.selection = "true";
    } else if (current) {
      const choice = choiceFor(current.target);
      const words = textarea.value.slice(current.start, current.end);
      hint.innerHTML = `<mark class="recipe-step-selection">${escapeHtml(words)}</mark> is labelled ${escapeHtml(choice?.label || parseStepTagTarget(current.target).name)}`;
      hint.dataset.selection = "true";
    } else if (hint.dataset.selection) {
      setHint("");
    }
    // The picker only shows while there are words to label (or a label under the caret).
    tools.classList.toggle("is-active", Boolean(picked || current));
    refreshChoices();
  };

  ["keyup", "mouseup", "touchend", "select", "selectionchange", "blur"].forEach((event) => textarea.addEventListener(event, remember));
  // Mobile browsers adjust selections with drag handles, which fire no key or mouse events.
  document.addEventListener("selectionchange", () => {
    if (document.activeElement === textarea) remember();
  });
  textarea.addEventListener("focus", refreshChoices);
  textarea.addEventListener("input", () => {
    setTags(shiftStepTags(tags(), previousText, textarea.value));
    previousText = textarea.value;
    renderHighlights();
  });
  textarea.addEventListener("scroll", () => {
    layer.scrollTop = textarea.scrollTop;
  });
  // Covers the resize handle, a narrower window and the row first being attached.
  if (typeof ResizeObserver === "function") new ResizeObserver(renderHighlights).observe(textarea);

  select.addEventListener("change", () => {
    const choice = select.value;
    select.value = "";
    if (!choice) return;

    let { start, end } = selection;
    if (choice === untagStepValue) {
      const touching = stepTagsTouching(tags(), start, end);
      setTags(tags().filter((tag) => !touching.includes(tag)));
      setHint(touching.length > 1 ? "Labels removed." : "Label removed.");
    } else {
      // Trim stray spaces so the label covers just the words.
      const text = textarea.value;
      while (start < end && /\s/.test(text[start])) start += 1;
      while (end > start && /\s/.test(text[end - 1])) end -= 1;
      if (start === end) {
        setHint("Select the words in the step first.");
        return;
      }
      if (/[{}|]/.test(text.slice(start, end))) {
        setHint("That selection cannot be labelled - avoid { } and | characters.");
        return;
      }
      const kept = tags().filter((tag) => !(tag.start < end && tag.end > start));
      setTags([...kept, { start, end, target: choice }].sort((a, b) => a.start - b.start));
      setHint(`Labelled as ${choiceFor(choice)?.label || parseStepTagTarget(choice).name}.`);
    }

    renderHighlights();
    textarea.focus();
    textarea.setSelectionRange(end, end);
    selection = { start: end, end };
    refreshChoices();
  });

  // Rows that leave the page stop listening for ingredient changes.
  const renderIfAttached = () => {
    if (!row.isConnected && row.dataset.attached) stepHighlightRenderers.delete(renderIfAttached);
    else if (row.isConnected) {
      row.dataset.attached = "true";
      renderHighlights();
    }
  };
  stepHighlightRenderers.add(renderIfAttached);

  renderHighlights();
  refreshChoices();
}

// One label choice per ingredient row in the editor: "Granulated Sugar - ½ cup".
// A name listed on several rows gets a choice per row, pinned with "#n" (in list
// order, matching how the saved recipe numbers its uses) so each use keeps its amount.
function recipeFormLabelChoices() {
  const rows = [...document.querySelectorAll(".recipe-ingredient-row")].map((row) => {
    const name = row.querySelector(".recipe-ingredient-search").value.trim();
    const quantity = parseFractionInput(row.querySelector(".recipe-ingredient-quantity").value);
    const measure = row.querySelector(".recipe-ingredient-measure").value || "serving";
    const ingredient = state.ingredients[ingredientKey(name)];
    const amount = !(quantity > 0) ? "" : ingredient
      ? recipeIngredientAmount({ quantity, measure }, ingredient)
      : amountParts(quantity, measure === "serving" ? "" : measure).text;
    return { name, amount, complete: Boolean(name) && quantity > 0 };
  }).filter((row) => row.name);

  const totals = new Map();
  rows.forEach((row) => {
    if (row.complete) totals.set(row.name.toLowerCase(), (totals.get(row.name.toLowerCase()) || 0) + 1);
  });
  const seen = new Map();
  const choices = rows.map((row) => {
    const key = row.name.toLowerCase();
    if (!row.complete) return totals.has(key) ? null : { value: row.name, name: row.name, label: row.name };
    const use = (seen.get(key) || 0) + 1;
    seen.set(key, use);
    const repeated = totals.get(key) > 1;
    return {
      value: repeated ? `${row.name}#${use}` : row.name,
      name: row.name,
      amount: row.amount,
      label: row.amount ? `${row.name} - ${row.amount}` : row.name
    };
  }).filter(Boolean);

  const unique = [...new Map(choices.map((choice) => [choice.value.toLowerCase(), choice])).values()];
  return unique.sort((a, b) => a.name.localeCompare(b.name));
}

// The same label choices as recipeFormLabelChoices, built from a saved recipe.
function recipeLabelChoices(recipe) {
  const rows = (recipe.ingredients || []).map(recipeIngredientMention).filter((row) => row?.name);
  const totals = new Map();
  rows.forEach((row) => {
    if (row.amount) totals.set(row.name.toLowerCase(), (totals.get(row.name.toLowerCase()) || 0) + 1);
  });
  const seen = new Map();
  const choices = rows.map((row) => {
    const key = row.name.toLowerCase();
    if (!row.amount) return totals.has(key) ? null : { value: row.name, name: row.name, label: row.name };
    const use = (seen.get(key) || 0) + 1;
    seen.set(key, use);
    return {
      value: totals.get(key) > 1 ? `${row.name}#${use}` : row.name,
      name: row.name,
      label: `${row.name} - ${row.amount}`
    };
  }).filter(Boolean);
  return [...new Map(choices.map((choice) => [choice.value.toLowerCase(), choice])).values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ---- Labelling step words on the recipe page --------------------------------
// Select words in a step and a small picker appears beside them; choosing an
// ingredient saves the label straight onto the recipe, no editor needed.
let stepLabelTarget = null;
let stepLabelInteracting = false;

// Characters from the start of the step to (node, offset), not counting the
// "(12 oz)" asides, which are not part of the step's own text.
function stepTextOffset(paragraph, node, offset) {
  const range = document.createRange();
  range.setStart(paragraph, 0);
  range.setEnd(node, offset);
  const fragment = range.cloneContents();
  fragment.querySelectorAll(".ingredient-mention-amount").forEach((aside) => aside.remove());
  return fragment.textContent.length;
}

function stepLabelPopover() {
  let popover = document.getElementById("step-label-popover");
  if (popover) return popover;
  popover = document.createElement("div");
  popover.id = "step-label-popover";
  popover.className = "step-label-popover";
  popover.hidden = true;
  popover.innerHTML = '<select aria-label="Label the selected words as an ingredient"></select>';
  document.body.appendChild(popover);
  // Pressing the picker collapses the page selection; remember that it was us.
  popover.addEventListener("pointerdown", () => {
    stepLabelInteracting = true;
  });
  const select = popover.querySelector("select");
  select.addEventListener("change", () => {
    const choice = select.value;
    if (choice) applyStepLabel(choice);
    hideStepLabelPopover();
  });
  select.addEventListener("blur", () => {
    stepLabelInteracting = false;
    if (!document.getSelection()?.toString().trim()) hideStepLabelPopover();
  });
  return popover;
}

function hideStepLabelPopover() {
  const popover = document.getElementById("step-label-popover");
  if (popover) popover.hidden = true;
  stepLabelTarget = null;
  stepLabelInteracting = false;
}

function positionStepLabelPopover() {
  const popover = document.getElementById("step-label-popover");
  if (!popover || popover.hidden || !stepLabelTarget?.rect) return;
  const rect = stepLabelTarget.rect;
  const width = popover.offsetWidth;
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
  popover.style.left = `${left}px`;
  popover.style.top = `${rect.bottom + 10}px`;
}

function updateStepLabelPopover() {
  if (stepLabelInteracting) return;
  const selection = document.getSelection();
  const recipe = openRecipeId ? recipeById(openRecipeId) : null;
  if (!selection || selection.isCollapsed || !selection.rangeCount || !recipe) {
    hideStepLabelPopover();
    return;
  }
  const range = selection.getRangeAt(0);
  const start = range.startContainer.parentElement?.closest("#recipe-detail .method-steps p[data-step-index]")
    || (range.startContainer.nodeType === 1 && range.startContainer.closest("#recipe-detail .method-steps p[data-step-index]"));
  const end = range.endContainer.parentElement?.closest("#recipe-detail .method-steps p[data-step-index]")
    || (range.endContainer.nodeType === 1 && range.endContainer.closest("#recipe-detail .method-steps p[data-step-index]"));
  if (!start || start !== end) {
    hideStepLabelPopover();
    return;
  }

  const index = Number(start.dataset.stepIndex);
  const { text, tags } = parseStepTags(recipeSteps(recipe)[index]);
  let from = stepTextOffset(start, range.startContainer, range.startOffset);
  let to = stepTextOffset(start, range.endContainer, range.endOffset);
  while (from < to && /\s/.test(text[from])) from += 1;
  while (to > from && /\s/.test(text[to - 1])) to -= 1;
  const choices = recipeLabelChoices(recipe);
  const touching = stepTagsTouching(tags, from, to);
  if (from === to || (!choices.length && !touching.length)) {
    hideStepLabelPopover();
    return;
  }

  const picked = text.slice(from, to);
  stepLabelTarget = { recipeId: recipe.id, index, from, to, rect: range.getBoundingClientRect() };
  const ranked = choices
    .map((choice, order) => ({ choice, order, score: labelMatchScore(picked, choice.name) }))
    .sort((a, b) => b.score - a.score || a.order - b.order);
  const options = (list) => list.map(({ choice }) => optionMarkup(choice.value, choice.label)).join("");
  const matches = ranked.filter((entry) => entry.score > 0);
  const others = ranked.filter((entry) => entry.score <= 0);
  const popover = stepLabelPopover();
  const select = popover.querySelector("select");
  select.innerHTML = [
    optionMarkup("", `Label "${picked.length > 24 ? `${picked.slice(0, 23)}…` : picked}" as...`),
    matches.length ? `<optgroup label="Best matches">${options(matches)}</optgroup>` : "",
    others.length ? (matches.length ? `<optgroup label="Other ingredients">${options(others)}</optgroup>` : options(others)) : "",
    touching.length ? optionMarkup(untagStepValue, `Remove label${touching.length > 1 ? "s" : ""}`) : ""
  ].join("");
  select.value = "";
  popover.hidden = false;
  positionStepLabelPopover();
}

function applyStepLabel(choice) {
  const target = stepLabelTarget;
  const recipe = target ? recipeById(target.recipeId) : null;
  if (!recipe || !requireCloudWrite()) return;
  const steps = recipeSteps(recipe);
  const { text, tags } = parseStepTags(steps[target.index]);
  const { from, to } = target;
  if (/[{}|]/.test(text.slice(from, to))) {
    showToast("Those words can't be labelled");
    return;
  }

  let next;
  let message;
  if (choice === untagStepValue) {
    const touching = stepTagsTouching(tags, from, to);
    next = tags.filter((tag) => !touching.includes(tag));
    message = touching.length > 1 ? "Labels removed" : "Label removed";
  } else {
    next = [...tags.filter((tag) => !(tag.start < to && tag.end > from)), { start: from, end: to, target: choice }]
      .sort((a, b) => a.start - b.start);
    message = `Labelled as ${parseStepTagTarget(choice).name}`;
  }

  steps[target.index] = serializeStepTags(text, next);
  recipe.steps = steps;
  document.getSelection()?.removeAllRanges();
  const top = window.scrollY;
  saveState();
  renderAll();
  window.scrollTo({ top });
  showToast(message);
}

function setupStepLabelling() {
  document.addEventListener("selectionchange", () => {
    // Let the drag handles settle before the picker jumps around.
    clearTimeout(setupStepLabelling.timer);
    setupStepLabelling.timer = setTimeout(updateStepLabelPopover, 120);
  });
  window.addEventListener("scroll", () => {
    const selection = document.getSelection();
    if (stepLabelTarget && selection?.rangeCount && !selection.isCollapsed) {
      stepLabelTarget.rect = selection.getRangeAt(0).getBoundingClientRect();
      positionStepLabelPopover();
    }
  }, { passive: true });
}

// How well highlighted step words fit an ingredient name: 0 for no shared words,
// higher when the name contains the whole phrase or most of its words.
function labelMatchScore(selected, name) {
  const words = (text) => String(text || "").toLowerCase().match(/[a-z0-9]+/g)?.map((word) => word.replace(/(?:es|s)$/, "")).filter(Boolean) || [];
  const picked = words(selected);
  const target = words(name);
  if (!picked.length || !target.length) return 0;
  const shared = picked.filter((word) => target.includes(word)).length;
  if (!shared) return 0;
  const phrase = picked.join(" ");
  const full = target.join(" ");
  let score = (shared / picked.length) * 50 + (shared / target.length) * 10;
  if (full === phrase) score += 100;
  else if (` ${full} `.includes(` ${phrase} `)) score += 40;
  return score;
}

function updateRecipeStepNumbers() {
  document.querySelectorAll(".recipe-step-row").forEach((row, index) => {
    row.querySelector(".recipe-step-number").textContent = index + 1;
    row.querySelector(".recipe-step-label").textContent = `Step ${index + 1}`;
  });
}

function collectRecipeSteps() {
  return [...document.querySelectorAll(".recipe-step-input")]
    .map((input) => serializeStepTags(input.value, stepEditorTags.get(input) || []).trim())
    .filter(Boolean);
}

function fillRecipeForm(recipe) {
  const form = document.getElementById("recipe-form");
  form.dataset.editingId = recipe.id;
  document.getElementById("recipe-name").value = recipe.name || "";
  document.getElementById("recipe-category").value = recipe.category || "Dinner";
  document.getElementById("recipe-servings").value = Number(recipe.servings || 1);
  document.getElementById("recipe-notes").value = recipe.notes || "";
  clearRecipePhotoDraft();
  recipeDraftNutrition = null;
  recipeDraftImage = safeImageUrl(recipe.image);
  document.getElementById("recipe-photo").value = "";
  setRecipePhotoMessage("");
  renderRecipePhotoPreview();

  const ingredientRows = document.getElementById("recipe-ingredient-rows");
  ingredientRows.replaceChildren();
  (recipe.ingredients?.length ? recipe.ingredients : [{}]).forEach((ingredient) => addRecipeIngredientRow(ingredient));

  const stepRows = document.getElementById("recipe-step-rows");
  stepRows.replaceChildren();
  const steps = recipeSteps(recipe);
  (steps.length ? steps : [""]).forEach((step) => addRecipeStepRow(step));

  document.getElementById("save-recipe").textContent = "Save changes";
  document.getElementById("recipe-editor-title").textContent = "Edit recipe";
  document.getElementById("recipe-editor-back-label").textContent = recipe.name || "Recipe";
  document.getElementById("delete-recipe").hidden = false;
  refreshRecipeMacroPreview();
  window.scrollTo({ top: 0 });
  // Focusing the name pops the keyboard open on a phone before the cook has
  // even seen the recipe, so only wider layouts get the head start.
  if (!isNarrowLayout()) document.getElementById("recipe-name").focus({ preventScroll: true });
}

function resetRecipeForm() {
  const form = document.getElementById("recipe-form");
  form.reset();
  delete form.dataset.editingId;
  document.getElementById("recipe-servings").value = 4;
  document.getElementById("recipe-ingredient-rows").replaceChildren();
  document.getElementById("recipe-step-rows").replaceChildren();
  addRecipeIngredientRow();
  addRecipeStepRow();
  document.getElementById("save-recipe").textContent = "Add recipe";
  document.getElementById("recipe-editor-title").textContent = "New recipe";
  document.getElementById("recipe-editor-back-label").textContent = "All recipes";
  document.getElementById("delete-recipe").hidden = true;
  clearRecipePhotoDraft();
  recipeDraftNutrition = null;
  recipeDraftImage = "";
  document.getElementById("recipe-photo").value = "";
  setRecipePhotoMessage("");
  renderRecipePhotoPreview();
}

function recipeIngredientFormValue(item) {
  if (typeof item === "string") {
    const parsed = parseIngredient(item);
    if (!parsed) return { name: item, quantity: 1, measure: "serving" };
    const catalogIngredient = findIngredient(parsed.name);
    return {
      name: catalogIngredient?.name || parsed.name,
      quantity: parsed.quantity || 1,
      measure: parsed.unit ? normalizeMeasurementUnit(parsed.unit) : "serving"
    };
  }

  const ingredient = state.ingredients[item.key] || item;
  return {
    name: ingredient.name || "",
    quantity: Number(item.quantity || 1),
    // Normalized so legacy measures ("eggs") still match an option in the dropdown.
    measure: normalizeMeasurementUnit(item.measure) || "serving"
  };
}

function recipeMeasurementOptions(ingredient, selectedMeasure) {
  const serving = ingredient ? parseServing(ingredient.serving) : null;
  const selected = selectedMeasure || "serving";
  const lead =
    optionMarkup("serving", `Serving${serving ? ` (${ingredient.serving})` : "(s)"}`, selected) +
    optionMarkup(
      "container",
      ingredient
        ? `Whole container (${formatQuantity(servingsPerContainer(ingredient))} servings)`
        : "Whole container(s)",
      selected
    );

  return unitOptionsMarkup({
    selected,
    lead,
    extraUnit: serving?.unit
  });
}

// Pointer-based row reordering: works with mouse and touch, and with the
// keyboard through the handle's arrow keys.
// Centered alert dialog (shadcn's Alert Dialog pattern). Resolves true only when
// the user picks the confirm button; Escape and Cancel resolve false. Cancel gets
// focus first so a stray Enter never destroys anything.
function confirmAction({ title = "Remove?", message = "", confirmLabel = "Remove" } = {}) {
  const dialog = document.querySelector("#confirm-dialog");
  if (!dialog?.showModal) return Promise.resolve(window.confirm(message || title));
  dialog.querySelector("#confirm-dialog-title").textContent = title;
  const messageEl = dialog.querySelector("#confirm-dialog-message");
  messageEl.textContent = message;
  messageEl.hidden = !message;
  dialog.querySelector("#confirm-dialog-ok").textContent = confirmLabel;
  const opener = document.activeElement;
  return new Promise((resolve) => {
    dialog.returnValue = "";
    dialog.addEventListener("close", () => {
      if (opener?.isConnected) opener.focus();
      resolve(dialog.returnValue === "confirm");
    }, { once: true });
    dialog.showModal();
    dialog.querySelector("#confirm-dialog-cancel").focus();
  });
}

// × on an editor row asks first in a centered dialog. Blank rows go straight
// away - nothing to lose.
function bindConfirmRemove(button, { isEmpty = () => false, onRemove, title, message = () => "" }) {
  button.addEventListener("click", async () => {
    if (isEmpty() || await confirmAction({ title, message: message() })) onRemove();
  });
}

function makeRowsSortable(container, { handle = ".drag-handle", item, onReorder = () => {} }) {
  if (!container || container.dataset.sortable === "true") return;
  container.dataset.sortable = "true";

  let row = null;
  let pointerId = null;
  let basePointerY = 0;
  let pointerY = 0;
  let scrollFrame = null;
  // Every drag (touch or mouse) starts only after a long press on the handle,
  // so a scroll, a stray tap or a quick swipe never reorders anything.
  let pending = null;
  const holdMs = 500;
  const cancelPending = () => {
    if (!pending) return;
    clearTimeout(pending.timer);
    delete pending.target.dataset.armed;
    pending = null;
  };
  const begin = (target, id, y) => {
    row = target;
    pointerId = id;
    basePointerY = y;
    row.dataset.dragging = "true";
    container.dataset.dragging = "true";
    pointerY = y;
    scrollFrame = requestAnimationFrame(autoScroll);
  };

  // Follow the pointer and swap past any neighbour whose middle it crosses.
  const updateDrag = (clientY) => {
    row.style.transform = `translateY(${clientY - basePointerY}px)`;

    const rect = row.getBoundingClientRect();
    const centre = rect.top + rect.height / 2;
    const reference = [...container.children].find(
      (child) => child !== row && child.matches(item) && centre < child.getBoundingClientRect().top + child.getBoundingClientRect().height / 2
    ) || null;
    if (reference === row.nextElementSibling) return;

    // Re-anchor the drag so the row stays under the pointer after it moves.
    const visualTop = rect.top;
    if (reference) container.insertBefore(row, reference);
    else container.append(row);
    row.style.transform = "";
    const offset = visualTop - row.getBoundingClientRect().top;
    basePointerY = clientY - offset;
    row.style.transform = `translateY(${offset}px)`;
  };

  // Holding a row near the top or bottom of the screen scrolls the page, faster
  // the closer to the edge, so step 7 can be carried all the way up to step 1.
  // The bottom zone is taller on phones, where a fixed action bar covers the edge.
  const autoScroll = () => {
    if (!row) return;
    const edge = 90;
    const bottomInset = window.matchMedia("(max-width: 680px)").matches ? 96 : 0;
    const top = pointerY - edge;
    const bottom = window.innerHeight - bottomInset - edge - pointerY;
    let speed = 0;
    if (top < 0) speed = -Math.min(18, Math.ceil(-top / 5));
    else if (bottom < 0) speed = Math.min(18, Math.ceil(-bottom / 5));
    if (speed) {
      const before = window.scrollY;
      window.scrollBy(0, speed);
      const moved = window.scrollY - before;
      if (moved) {
        // The row scrolled with the page; shift its anchor so it stays under
        // the pointer, then let it swap past whatever it now overlaps.
        basePointerY -= moved;
        updateDrag(pointerY);
      }
    }
    scrollFrame = requestAnimationFrame(autoScroll);
  };

  const stop = () => {
    cancelPending();
    cancelAnimationFrame(scrollFrame);
    scrollFrame = null;
    if (!row) return;
    row.style.transform = "";
    delete row.dataset.dragging;
    delete container.dataset.dragging;
    row = null;
    pointerId = null;
    onReorder();
  };

  container.addEventListener("pointerdown", (event) => {
    const grip = event.target.closest(handle);
    if (!grip || event.button > 0) return;
    const target = grip.closest(item);
    if (!target) return;
    grip.setPointerCapture(event.pointerId);
    event.preventDefault();
    cancelPending();
    target.dataset.armed = "true";
    pending = {
      target,
      pointerId: event.pointerId,
      y: event.clientY,
      lastY: event.clientY,
      timer: setTimeout(() => {
        const ready = pending;
        cancelPending();
        begin(ready.target, ready.pointerId, ready.lastY);
        navigator.vibrate?.(12);
      }, holdMs)
    };
  });

  container.addEventListener("pointermove", (event) => {
    if (pending && event.pointerId === pending.pointerId) {
      pending.lastY = event.clientY;
      // Moving before the hold completes means it wasn't meant as a drag.
      if (Math.abs(event.clientY - pending.y) > 8) cancelPending();
      return;
    }
    if (!row || event.pointerId !== pointerId) return;
    event.preventDefault();
    pointerY = event.clientY;
    updateDrag(event.clientY);
  });

  container.addEventListener("pointerup", stop);
  container.addEventListener("pointercancel", stop);

  container.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const grip = event.target.closest(handle);
    const current = grip?.closest(item);
    const sibling = event.key === "ArrowUp" ? current?.previousElementSibling : current?.nextElementSibling;
    if (!sibling) return;
    event.preventDefault();
    if (event.key === "ArrowUp") container.insertBefore(current, sibling);
    else container.insertBefore(sibling, current);
    grip.focus();
    onReorder();
  });
}

function dragHandleMarkup(label, className = "drag-handle") {
  return `<button class="${className}" type="button" aria-label="${escapeHtml(label)}" title="Press and hold to reorder, or use the arrow keys">
      ${icon("grip-vertical")}
    </button>`;
}

function addRecipeIngredientRow(item = {}) {
  const container = document.getElementById("recipe-ingredient-rows");
  const row = document.createElement("div");
  row.className = "recipe-ingredient-row";
  const formValue = recipeIngredientFormValue(item);
  row.innerHTML = `
    ${dragHandleMarkup("Reorder ingredient")}
    <label class="recipe-ingredient-field recipe-ingredient-quantity-field">
      <span class="visually-hidden">Amount</span>
      <input class="recipe-ingredient-quantity" required type="text" inputmode="text" autocomplete="off" placeholder="1 1/2" value="${escapeHtml(formatQuantity(formValue.quantity))}" />
    </label>
    <label class="recipe-ingredient-field recipe-ingredient-unit-field">
      <span class="visually-hidden">Unit</span>
      <select class="recipe-ingredient-measure" data-initial-measure="${escapeHtml(formValue.measure)}"></select>
    </label>
    <div class="ingredient-picker">
      <label>
        <span class="visually-hidden">Ingredient</span>
        <input class="recipe-ingredient-search" required placeholder="Search ingredients" autocomplete="off"
          role="combobox" aria-expanded="false" aria-autocomplete="list" value="${escapeHtml(formValue.name)}" />
      </label>
      <span class="ingredient-flag" title="Not in your ingredient index" aria-hidden="true">!</span>
      <div class="ingredient-picker-results" role="listbox" hidden></div>
    </div>
    <button class="row-remove" type="button" aria-label="Remove ingredient" title="Remove">${icon("x")}</button>
    <p class="recipe-ingredient-serving"></p>`;

  const search = row.querySelector(".recipe-ingredient-search");
  const quantity = row.querySelector(".recipe-ingredient-quantity");
  bindQuantityInput(quantity);
  bindIngredientPicker({
    input: search,
    results: row.querySelector(".ingredient-picker-results"),
    onChoose: () => {
      updateRecipeIngredientRow(row);
      refreshRecipeMacroPreview();
      quantity.focus();
    }
  });
  const measure = row.querySelector(".recipe-ingredient-measure");
  search.addEventListener("input", () => {
    updateRecipeIngredientRow(row);
    refreshRecipeMacroPreview();
  });
  quantity.addEventListener("input", () => {
    updateRecipeIngredientRow(row);
    refreshRecipeMacroPreview();
  });
  measure.addEventListener("change", () => {
    if (measure.value === "container") quantity.value = "1";
    updateRecipeIngredientRow(row);
    refreshRecipeMacroPreview();
  });
  bindConfirmRemove(row.querySelector(".row-remove"), {
    isEmpty: () => !search.value.trim(),
    title: "Remove ingredient?",
    message: () => `${search.value.trim()} will be taken out of this recipe.`,
    onRemove: () => {
      row.remove();
      if (!container.children.length) addRecipeIngredientRow();
      refreshRecipeMacroPreview();
    }
  });
  row.querySelector(".recipe-ingredient-serving").addEventListener("click", (event) => {
    if (!event.target.closest("[data-add-to-index]")) return;
    openIngredientIndexFor(search.value.trim());
  });
  container.append(row);
  makeRowsSortable(container, { item: ".recipe-ingredient-row", onReorder: refreshRecipeMacroPreview });
  updateRecipeIngredientRow(row);
  refreshRecipeMacroPreview();
}

const maxIngredientSuggestions = 8;

function ingredientSuggestions(query) {
  const all = Object.values(state.ingredients || {}).sort((a, b) => a.name.localeCompare(b.name));
  const text = String(query || "").trim().toLowerCase();
  if (!text) return all.slice(0, maxIngredientSuggestions);

  const rank = (ingredient) => (ingredient.name.toLowerCase().startsWith(text) ? 0 : 1);
  return all
    .filter((ingredient) => ingredient.name.toLowerCase().includes(text))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, maxIngredientSuggestions);
}

// A typed search box backed by the saved ingredients, replacing the native datalist
// so suggestions are tappable, keyboard navigable and show serving and calories.
function bindIngredientPicker({ input, results, onChoose }) {
  if (!input || !results) return;
  let matches = [];
  let activeIndex = -1;

  const close = () => {
    results.hidden = true;
    input.setAttribute("aria-expanded", "false");
    activeIndex = -1;
  };

  const paint = () => {
    if (!matches.length) {
      results.innerHTML = `<p class="ingredient-picker-empty">${
        Object.keys(state.ingredients || {}).length
          ? "No saved ingredient matches. It will be saved as plain text without nutrition."
          : "No saved ingredients yet. Add one on the Ingredients page."
      }</p>`;
      return;
    }

    results.innerHTML = matches
      .map(
        (ingredient, index) => `
        <button class="ingredient-option" type="button" role="option" data-index="${index}"
          aria-selected="${index === activeIndex}" ${index === activeIndex ? 'data-active="true"' : ""}>
          <span class="ingredient-option-name">${escapeHtml(ingredient.name)}</span>
          <span class="ingredient-option-meta">${escapeHtml(ingredient.serving || "serving")}<span class="nutrition-only"> \u00b7 ${formatMacro(
          ingredient.calories
        )} cal</span></span>
        </button>`
      )
      .join("");
  };

  const open = () => {
    matches = ingredientSuggestions(input.value);
    activeIndex = -1;
    paint();
    results.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  const move = (step) => {
    if (results.hidden) {
      open();
      if (!matches.length) return;
    }
    if (!matches.length) return;
    activeIndex = (activeIndex + step + matches.length) % matches.length;
    paint();
    const active = results.querySelector('[data-active="true"]');
    if (active?.scrollIntoView) active.scrollIntoView({ block: "nearest" });
  };

  const choose = (index) => {
    const ingredient = matches[index];
    if (!ingredient) return;
    input.value = ingredient.name;
    close();
    onChoose?.(ingredient);
  };

  input.addEventListener("input", open);
  input.addEventListener("focus", open);
  input.addEventListener("blur", close);
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter" && !results.hidden) {
      // Never let the dropdown's Enter reach the form and submit the recipe.
      event.preventDefault();
      if (activeIndex >= 0) choose(activeIndex);
      else close();
    } else if (event.key === "Escape" && !results.hidden) {
      event.preventDefault();
      close();
    }
  });

  // Keep focus on the input so blur does not close the list before the click lands.
  results.addEventListener("mousedown", (event) => event.preventDefault());
  results.addEventListener("click", (event) => {
    const option = event.target.closest("[data-index]");
    if (option) choose(Number(option.dataset.index));
  });
}

function updateRecipeIngredientRow(row) {
  const name = row.querySelector(".recipe-ingredient-search").value;
  const ingredient = state.ingredients[ingredientKey(name)];
  const select = row.querySelector(".recipe-ingredient-measure");
  const requestedMeasure = select.dataset.initialMeasure || select.value || "serving";
  delete select.dataset.initialMeasure;
  const serving = ingredient ? parseServing(ingredient.serving) : null;
  const measure = requestedMeasure;
  // Every cloud sync re-renders the app, which lands here for every row. Rebuilding
  // a <select> while its native picker is open (mobile) or mid-edit throws away the
  // choice, so the options are only rewritten when the ingredient behind them changed.
  const optionsKey = ingredient ? `${ingredient.key}|${ingredient.serving}|container|${servingsPerContainer(ingredient)}` : "";
  const busy = document.activeElement === select;
  if (select.dataset.optionsKey !== optionsKey || !select.options.length) {
    if (!busy || !select.options.length) {
      select.innerHTML = recipeMeasurementOptions(ingredient, measure);
      select.dataset.optionsKey = optionsKey;
    }
  }
  if (select.value !== measure && [...select.options].some((option) => option.value === measure)) select.value = measure;
  const quantity = parseFractionInput(row.querySelector(".recipe-ingredient-quantity").value);
  const servingCount = ingredient ? recipeItemServingCount({ quantity, measure }, ingredient) : 0;
  const unlinked = !ingredient && Boolean(name.trim());
  row.dataset.unlinked = String(unlinked);
  const hint = row.querySelector(".recipe-ingredient-serving");
  if (unlinked) {
    hint.innerHTML = `${escapeHtml(name.trim())} isn't in your ingredient index yet. <button class="inline-link" type="button" data-add-to-index>Add it</button>`;
    return;
  }
  hint.textContent = ingredient
    ? measure === "container"
      ? `${formatQuantity(servingsPerContainer(ingredient))} servings per container`
      : measure === "serving"
        ? `${ingredient.serving} per serving`
        : serving?.unit && !measurementIsCompatible(measure, serving.unit)
          // No conversion between e.g. "piece" and "g", so each one counts as a serving.
          ? `${formatQuantity(quantity)} ${measure} counted as ${formatQuantity(roundTo(servingCount, 3))} servings (can't convert to ${serving.unit})`
          : `${formatQuantity(quantity)} ${measure} = ${formatQuantity(roundTo(servingCount, 3))} servings`
    : name.trim()
      ? "Manual ingredient - nutrition unavailable"
      : "Choose an ingredient";
}

function collectRecipeIngredients(allowIncomplete = false) {
  const rows = [...document.querySelectorAll(".recipe-ingredient-row")];
  const ingredients = [];

  for (const row of rows) {
    const name = row.querySelector(".recipe-ingredient-search").value.trim();
    const ingredient = state.ingredients[ingredientKey(name)];
    const quantityInput = row.querySelector(".recipe-ingredient-quantity");
    if (!allowIncomplete && quantityInput.value.trim() && !isValidQuantityInput(quantityInput.value)) {
      quantityInput.setCustomValidity("Use a whole number or a fraction, like 2 or 1 1/2.");
      quantityInput.reportValidity();
      quantityInput.setCustomValidity("");
      return null;
    }
    const quantity = parseFractionInput(quantityInput.value);
    const measure = row.querySelector(".recipe-ingredient-measure").value || "serving";
    if (!name || quantity <= 0) {
      if (allowIncomplete) continue;
      return null;
    }
    if (ingredient) {
      ingredients.push({ key: ingredient.key, quantity, measure });
    } else {
      const unit = measure === "serving" ? "" : measure;
      // Stored with the unit spelled out (even "piece") so the row reopens with the
      // same unit selected; the display drops it.
      const label = unitNamesIngredient(unit, name) ? "" : name;
      ingredients.push(`${formatUnitQuantity(quantity, unit)} ${pluralizeUnit(unit, quantity)} ${label}`.replace(/\s+/g, " ").trim());
    }
  }

  return ingredients;
}

function macrosForIngredientRows(items) {
  return items.reduce((totals, item) => {
    const ingredient = state.ingredients[item.key];
    if (!ingredient) return totals;
    return addNutrients(totals, ingredient, recipeItemServingCount(item, ingredient));
  }, emptyNutrients());
}

function containersForIngredientRows(items) {
  return items.reduce((total, item) => {
    const ingredient = state.ingredients[item.key];
    if (!ingredient) return total;
    return total + recipeItemContainerCount(item, ingredient);
  }, 0);
}

function refreshRecipeMacroPreview() {
  refreshStepHighlights();
  const items = collectRecipeIngredients(true) || [];
  const macros = macrosForIngredientRows(items);
  const servings = Math.max(1, Number(document.getElementById("recipe-servings").value) || 1);
  const tile = (value, label) => `<div class="nutrition-tile"><strong>${value}</strong><span>${label}</span></div>`;
  document.getElementById("recipe-macro-preview").innerHTML = [
    tile(formatMacro(Math.round(macros.calories / servings)), "kcal"),
    tile(`${formatMacro(Math.round(macros.protein / servings))} g`, "protein"),
    tile(`${formatMacro(Math.round(macros.carbs / servings))} g`, "carbs"),
    tile(`${formatMacro(Math.round(macros.fat / servings))} g`, "fat")
  ].join("");
}

// "Add it" on an unknown ingredient: jump to the index with the name filled in,
// and come back to the recipe once it is saved.
function openIngredientIndexFor(name) {
  returnToRecipeEditor = true;
  activateAppView("ingredients", "ingredients");
  document.getElementById("back-to-recipe-editor").hidden = false;
  const input = document.getElementById("ingredient-name");
  input.value = name;
  syncIngredientSaveButton();
  window.scrollTo({ top: 0 });
  input.focus({ preventScroll: true });
}

function refreshRecipeIngredientRows() {
  document.querySelectorAll(".recipe-ingredient-row").forEach(updateRecipeIngredientRow);
  refreshRecipeMacroPreview();
}

function populateServingUnits() {
  const select = document.getElementById("ingredient-serving-unit");
  if (!select || select.options.length) return;
  select.innerHTML = unitOptionsMarkup({ selected: "g", includeOther: true });
  select.addEventListener("change", syncServingUnitCustom);
  bindQuantityInput(document.getElementById("ingredient-serving-amount"));
  bindQuantityInput(document.getElementById("ingredient-servings-per-container"));
  syncServingUnitCustom();
}

function knownServingUnit(unit) {
  return servingUnits.some((section) => section.units.includes(unit));
}

function syncServingUnitCustom() {
  const select = document.getElementById("ingredient-serving-unit");
  const custom = document.getElementById("ingredient-serving-unit-other");
  if (!select || !custom) return;
  const isCustom = select.value === customServingUnit;
  custom.hidden = !isCustom;
  custom.required = isCustom;
  if (!isCustom) custom.value = "";
}

function parseServing(serving) {
  const text = String(serving || "").trim();
  const match = text.match(/^([0-9./\s¼-¾⅐-⅞]+?)\s*([^0-9./\s].*)?$/);
  if (!match) return { amount: 1, unit: text || "serving" };
  const amount = parseFractionInput(match[1]);
  return { amount: roundTo(amount, 4), unit: (match[2] || "").trim() || "serving" };
}

function readServingInputs() {
  const amount = parseFractionInput(document.getElementById("ingredient-serving-amount").value);
  const select = document.getElementById("ingredient-serving-unit");
  const unit =
    select.value === customServingUnit
      ? document.getElementById("ingredient-serving-unit-other").value.trim()
      : select.value;
  return `${formatQuantity(amount)} ${unit}`.trim();
}

function setServingInputs(serving) {
  const { amount, unit: rawUnit } = parseServing(serving);
  // Normalized first so a serving saved as "1 eggs" selects the "egg" option
  // instead of falling back to the free-text box.
  const unit = normalizeMeasurementUnit(rawUnit);
  document.getElementById("ingredient-serving-amount").value = formatQuantity(amount);
  const select = document.getElementById("ingredient-serving-unit");
  const custom = document.getElementById("ingredient-serving-unit-other");
  if (knownServingUnit(unit)) {
    select.value = unit;
  } else {
    select.value = customServingUnit;
    custom.value = rawUnit;
  }
  syncServingUnitCustom();
}

function fillIngredientForm(ingredient) {
  if (!ingredient) return;
  const form = document.getElementById("ingredient-form");
  form.dataset.editingKey = ingredient.key;
  document.getElementById("ingredient-name").value = ingredient.name;
  document.getElementById("ingredient-category").value = ingredientCategories.includes(ingredient.category) ? ingredient.category : "";
  setServingInputs(ingredient.serving);
  nutrients.forEach((nutrient) => {
    document.getElementById(nutrientInputId(nutrient)).value = roundTo(Number(ingredient[nutrient.key] || 0), 2);
  });
  document.getElementById("ingredient-servings-per-container").value = formatQuantity(servingsPerContainer(ingredient));
  document.getElementById("ingredient-url").value = ingredient.url;
  clearIngredientPhotoDraft();
  ingredientDraftImage = ingredientImage(ingredient);
  document.getElementById("ingredient-photo").value = "";
  setIngredientPhotoMessage(ingredientDraftImage ? "Photo attached." : OPTIONAL_PHOTO_MESSAGE);
  renderIngredientPhotoPreview();
  syncIngredientSaveButton();
  document.getElementById("ingredient-name").focus();
}

function fillKitchenStockForm(entry) {
  if (!entry) return;
  const form = document.getElementById("kitchen-stock-form");
  form.dataset.editingId = entry.id;
  document.getElementById("kitchen-stock-name").value = entry.name;
  document.getElementById("kitchen-stock-quantity").value = formatQuantity(entry.quantity);
  const select = document.getElementById("kitchen-stock-unit");
  if (knownServingUnit(entry.unit)) select.value = entry.unit;
  document.getElementById("kitchen-stock-note").value = entry.note || "";
  document.getElementById("kitchen-stock-cancel").hidden = false;
  document.getElementById("kitchen-stock-name").focus();
}

// Picking a catalogue ingredient defaults the unit to that ingredient's own serving unit.
function applyKitchenStockUnitDefault(ingredient) {
  if (!ingredient) return;
  const unit = normalizeMeasurementUnit(parseServing(ingredient.serving).unit);
  if (knownServingUnit(unit)) document.getElementById("kitchen-stock-unit").value = unit;
}

function resetKitchenStockForm() {
  const form = document.getElementById("kitchen-stock-form");
  if (!form) return;
  form.reset();
  delete form.dataset.editingId;
  document.getElementById("kitchen-stock-quantity").value = "1";
  document.getElementById("kitchen-stock-unit").value = "piece";
  document.getElementById("kitchen-stock-cancel").hidden = true;
}

// Save ingredient floats over the page, so it only appears once the form holds
// something: any field changed from a blank form, a photo, or an ingredient being edited.
let blankIngredientFormSnapshot = null;

function ingredientFormSnapshot() {
  const form = document.getElementById("ingredient-form");
  return JSON.stringify([...form.querySelectorAll('input:not([type="file"]), select, textarea')].map((field) => field.value));
}

function syncIngredientSaveButton() {
  const form = document.getElementById("ingredient-form");
  const button = document.getElementById("save-ingredient");
  if (!form || !button) return;
  const hasContent = Boolean(form.dataset.editingKey)
    || Boolean(ingredientDraftBlob || ingredientDraftImage)
    || (blankIngredientFormSnapshot !== null && ingredientFormSnapshot() !== blankIngredientFormSnapshot);
  button.hidden = !hasContent;
}

// Back to a blank "new ingredient" form, dropping any ingredient being edited.
function resetIngredientForm() {
  const form = document.getElementById("ingredient-form");
  if (!form) return;
  form.reset();
  delete form.dataset.editingKey;
  resetIngredientMacroInputs();
  clearIngredientPhotoDraft();
  ingredientDraftImage = "";
  document.getElementById("ingredient-photo-url").value = "";
  setIngredientPhotoMessage(OPTIONAL_PHOTO_MESSAGE);
  renderIngredientPhotoPreview();
  blankIngredientFormSnapshot = ingredientFormSnapshot();
  syncIngredientSaveButton();
}

function resetIngredientMacroInputs() {
  nutrients.forEach((nutrient) => {
    document.getElementById(nutrientInputId(nutrient)).value = 0;
  });
  ["ingredient-nutrition", "ingredient-nutrients-more"].forEach((id) => {
    const section = document.getElementById(id);
    if (section) section.open = false;
  });
  document.getElementById("ingredient-servings-per-container").value = "1";
  setServingInputs("1 g");
}

function nutrientInputId(nutrient) {
  return `ingredient-${nutrient.key}`;
}

// Built from the nutrient index so adding a vitamin never means hand-writing a
// field, and the form can never drift from what the totals actually track.
function populateNutrientInputs() {
  const container = document.getElementById("ingredient-nutrients");
  if (!container || container.children.length) return;

  const groupMarkup = (group) => {
      const fields = nutrients
        .filter((nutrient) => nutrient.group === group)
        .map(
          (nutrient) => `
          <label class="macro-field">
            <span class="macro-field-label">${escapeHtml(nutrient.label)}</span>
            <span class="macro-input"${nutrient.unit ? ` data-unit="${escapeHtml(nutrient.unit)}"` : ""}>
              <input id="${escapeHtml(nutrientInputId(nutrient))}" min="0" step="any" type="number" inputmode="decimal" value="0" />
            </span>
          </label>`
        )
        .join("");
      return `
        <div class="macro-field-group">
          <span class="macro-field-group-label">${escapeHtml(group)}</span>
          <div class="macro-field-grid">${fields}</div>
        </div>`;
  };

  // Macros stay in view; the long tail of vitamins and minerals folds away.
  const [primary, ...extra] = nutrientGroups;
  container.innerHTML = `${groupMarkup(primary)}${extra.length
    ? `<details class="macro-field-more" id="ingredient-nutrients-more">
        <summary>${escapeHtml(extra.join(" and "))}</summary>
        <div class="macro-field-groups">${extra.map(groupMarkup).join("")}</div>
      </details>`
    : ""}`;
}

function readNutrientInputs() {
  return Object.fromEntries(
    nutrients.map((nutrient) => [nutrient.key, roundTo(Number(document.getElementById(nutrientInputId(nutrient)).value) || 0, 2)])
  );
}

function getGroceryTexts() {
  return [...document.querySelectorAll('#grocery-list [data-grocery-text]:not([data-checked="true"])')].map((item) => item.dataset.groceryText);
}

function setupAuth() {
  document.getElementById("sign-in-github").addEventListener("click", authenticateWithGitHub);
  document.getElementById("create-household").addEventListener("click", createHousehold);
  document.getElementById("join-household-form").addEventListener("submit", joinHousehold);
  // Typing a short code: upper-case it and add the dash after four characters.
  // Long legacy codes (they contain a ".") are left exactly as pasted.
  document.getElementById("household-invite").addEventListener("input", (event) => {
    const input = event.target;
    if (input.value.includes(".")) return;
    const compact = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (compact.length > 8) return;
    const formatted = compact.length > 4 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact;
    if (formatted !== input.value) input.value = formatted;
  });
  document.getElementById("copy-household-code").addEventListener("click", async () => {
    if (!currentInviteCode) return;
    await copyText(currentInviteCode);
    authEls.settingsHouseholdMessage.textContent = "Invite code copied.";
  });
  document.getElementById("leave-household").addEventListener("click", leaveHousehold);
  document.getElementById("manage-planners").addEventListener("click", () => {
    renderPlannerDirectory();
    authEls.plannerDialog.showModal();
  });
  document.getElementById("close-planner-dialog").addEventListener("click", () => authEls.plannerDialog.close());
  document.getElementById("active-planner").addEventListener("change", (event) => selectPlanner(event.target.value));
  document.getElementById("create-planner-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("planner-name");
    const name = input.value.trim();
    if (!name) return;
    createPlanner(name);
    event.target.reset();
  });
  document.getElementById("open-profile").addEventListener("click", openProfileDialog);
  document.getElementById("mobile-open-settings").addEventListener("click", openProfileDialog);
  document.getElementById("sidebar-open-settings").addEventListener("click", openProfileDialog);
  document.getElementById("cancel-profile").addEventListener("click", closeSettings);
  document.getElementById("close-profile-dialog").addEventListener("click", closeSettings);
  setupSettingsPage();
  document.getElementById("save-profile").addEventListener("click", saveProfile);
  document.getElementById("remove-profile-photo").addEventListener("click", () => {
    profileDraftPhoto = "";
    renderProfilePreview();
    setProfileMessage("Photo removed. Save your profile to apply it.");
  });
  authEls.profilePhoto.addEventListener("change", handleProfilePhotoChange);
  authEls.profileName.addEventListener("input", renderProfilePreview);
  document.getElementById("profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void saveProfile();
  });
  document.getElementById("sign-out").addEventListener("click", async () => {
    if (!cloud) return;
    await cloud.signOut(cloud.auth);
  });
  document.getElementById("settings-sign-out").addEventListener("click", async () => {
    if (!cloud) return;
    closeSettings();
    await cloud.signOut(cloud.auth);
  });
  document.getElementById("setup-sign-out").addEventListener("click", async () => {
    if (!cloud) return;
    await cloud.signOut(cloud.auth);
  });
  document.getElementById("pending-sign-out").addEventListener("click", async () => {
    if (!cloud) return;
    await cloud.signOut(cloud.auth);
  });
}

async function leaveHousehold() {
  const user = cloud?.auth.currentUser;
  if (!user || !currentHouseholdId) return;

  const confirmed = window.confirm("Leave this household? You will need its invite code to join it again.");
  if (!confirmed) return;

  const householdId = currentHouseholdId;
  const memberRef = cloud.doc(cloud.db, "households", householdId, "members", user.uid);
  const userRef = cloud.doc(cloud.db, "users", user.uid);
  authEls.syncStatus.textContent = "Leaving household";
  setAccountStatus("checking", "Leaving household", "Updating Firebase...");

  try {
    const batch = cloud.writeBatch(cloud.db);
    Object.values(state.planners || {}).forEach((planner) => {
      if (!planner.allHouseholdMembers) {
        planner.memberUids = (planner.memberUids || []).filter((memberUid) => memberUid !== user.uid);
      }
    });
    const householdRef = cloud.doc(cloud.db, "households", householdId);
    batch.set(householdRef, { planners: state.planners }, { merge: true });
    batch.set(userRef, { householdId: null }, { merge: true });
    batch.delete(memberRef);
    await batch.commit();

    unsubscribeCloudState?.();
    unsubscribeCloudState = null;
    clearHouseholdMembers();
    currentHouseholdId = null;
    currentInviteCode = null;
    activePlannerId = null;
    cloudDataLoaded = false;
    state = createSignedOutState();
    authEls.householdCode.textContent = "Loading...";
    closeSettings();
    showHouseholdSetup(user);
    setHouseholdMessage("You left the household. Create another household or paste an invite code to join one.");
    renderAll();
  } catch (error) {
    handleSyncError("Could not leave household", error);
  }
}

// ---- Invite codes ----------------------------------------------------------
// XXXX-XXXX from an alphabet without look-alikes (no 0/O, 1/I), easy to read out
// or type: 32^8, about a trillion codes. invites/{code} maps a code to its household.
const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const shortInviteCodePattern = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

function isShortInviteCode(value) {
  return shortInviteCodePattern.test(String(value || ""));
}

function generateInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map((byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

// "abcd efgh", "ABCDEFGH" and "abcd-efgh" all read as ABCD-EFGH.
function normalizeInviteCodeInput(value) {
  const compact = String(value || "").toUpperCase().replace(/[s-]/g, "");
  return /^[A-Z0-9]{8}$/.test(compact) ? `${compact.slice(0, 4)}-${compact.slice(4)}` : null;
}

// The owner's app gives a household with an old UUID token a short code: claim
// an unused invites/{code} first, then point the household at it. If the rules
// aren't deployed yet, the claim is refused and nothing changes.
const shortCodeAttempts = new Set();
async function ensureShortInviteCode(householdId) {
  if (shortCodeAttempts.has(householdId)) return;
  shortCodeAttempts.add(householdId);
  const user = cloud?.auth.currentUser;
  if (!user) return;
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateInviteCode();
      const inviteRef = cloud.doc(cloud.db, "invites", code);
      if ((await cloud.getDoc(inviteRef)).exists()) continue;
      await cloud.setDoc(inviteRef, { householdId, createdBy: user.uid });
      await cloud.updateDoc(cloud.doc(cloud.db, "households", householdId), { inviteToken: code });
      return;
    }
  } catch (error) {
    console.warn("Could not switch to a short invite code:", error);
  }
}

async function createHousehold() {
  const user = cloud?.auth.currentUser;
  if (!user) return;

  setHouseholdControlsDisabled(true);
  setHouseholdMessage("Creating your shared household...");
  const householdId = crypto.randomUUID();
  const inviteToken = crypto.randomUUID();

  try {
    const userRef = cloud.doc(cloud.db, "users", user.uid);
    const userSnapshot = await cloud.getDoc(userRef);
    const existingState = normalizeState(userSnapshot.data());
    const householdRef = cloud.doc(cloud.db, "households", householdId);
    const memberRef = cloud.doc(cloud.db, "households", householdId, "members", user.uid);
    const profile = userSnapshot.data()?.profile || {};

    await cloud.setDoc(householdRef, {
      ...existingState,
      ownerUid: user.uid,
      inviteToken
    });
    await cloud.setDoc(memberRef, memberRecord(user, inviteToken, profile));
    await cloud.setDoc(userRef, { householdId }, { merge: true });
    subscribeToHousehold(householdId);
  } catch (error) {
    setHouseholdControlsDisabled(false);
    setHouseholdMessage(`Could not create household: ${error.message}`);
  }
}

async function joinHousehold(event) {
  event.preventDefault();
  const user = cloud?.auth.currentUser;
  if (!user) return;

  const inviteCode = document.getElementById("household-invite").value.trim();
  const invalid = () => setHouseholdMessage("That invite code is not valid. Check it with the household owner - it looks like ABCD-1234.");
  const shortCode = normalizeInviteCodeInput(inviteCode);
  let householdId;
  let inviteToken;

  if (shortCode) {
    if (!isShortInviteCode(shortCode)) {
      invalid();
      return;
    }
    inviteToken = shortCode;
  } else {
    // Older long codes: <household id>.<token>, both UUIDs.
    const separatorIndex = inviteCode.indexOf(".");
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    householdId = inviteCode.slice(0, Math.max(separatorIndex, 0));
    inviteToken = inviteCode.slice(separatorIndex + 1);
    if (separatorIndex < 1 || !uuidPattern.test(householdId) || !uuidPattern.test(inviteToken)) {
      invalid();
      return;
    }
  }

  setHouseholdControlsDisabled(true);
  setHouseholdMessage("Joining the shared household...");

  try {
    if (shortCode) {
      const invite = await cloud.getDoc(cloud.doc(cloud.db, "invites", shortCode));
      if (!invite.exists()) {
        setHouseholdControlsDisabled(false);
        invalid();
        return;
      }
      householdId = invite.data().householdId;
    }
    const memberRef = cloud.doc(cloud.db, "households", householdId, "members", user.uid);
    const userRef = cloud.doc(cloud.db, "users", user.uid);
    const profile = await loadStoredProfile(user);
    await cloud.setDoc(memberRef, memberRecord(user, inviteToken, profile));
    await cloud.setDoc(userRef, { householdId }, { merge: true });
    event.target.reset();
    subscribeToHousehold(householdId);
  } catch (error) {
    setHouseholdControlsDisabled(false);
    setHouseholdMessage(error.code === "permission-denied" ? "That invite code was rejected. Ask the household owner to copy it again." : `Could not join household: ${error.message}`);
  }
}

function subscribeToMembers(householdId) {
  unsubscribeMembers?.();
  householdMembers = [];
  setMembersPlaceholder("Loading members...");

  const membersRef = cloud.collection(cloud.db, "households", householdId, "members");
  unsubscribeMembers = cloud.onSnapshot(membersRef, (snapshot) => {
    householdMembers = snapshot.docs.map((memberDoc) => ({ uid: memberDoc.id, ...memberDoc.data() }));
    renderHouseholdMembers();
    renderPlannerDirectory();
  }, () => {
    householdMembers = [];
    setMembersPlaceholder("Could not load the member list.");
  });
}

function clearHouseholdMembers() {
  unsubscribeMembers?.();
  unsubscribeMembers = null;
  householdMembers = [];
  householdOwnerUid = null;
  clearAccessManagement();
  setMembersPlaceholder("Loading members...");
}

function subscribeToAccessManagement() {
  const uid = cloud?.auth.currentUser?.uid;
  const canManage = uid === ACCESS_ADMIN_UID && uid === householdOwnerUid;
  authEls.accessManagement.hidden = !canManage;
  document.getElementById("access-management-link").hidden = !canManage;
  if (!canManage || unsubscribeAccessRequests || unsubscribeApprovedUsers) return;

  unsubscribeAccessRequests = cloud.onSnapshot(cloud.collection(cloud.db, "accessRequests"), (snapshot) => {
    accessRequests = snapshot.docs.map((requestDoc) => ({ uid: requestDoc.id, ...requestDoc.data() }));
    renderAccessManagement();
  }, (error) => {
    authEls.accessManagementMessage.textContent = "Could not load access requests: " + error.message;
  });

  unsubscribeApprovedUsers = cloud.onSnapshot(cloud.collection(cloud.db, "approvedUsers"), (snapshot) => {
    approvedUsers = snapshot.docs.map((userDoc) => ({ uid: userDoc.id, ...userDoc.data() }));
    renderAccessManagement();
  }, (error) => {
    authEls.accessManagementMessage.textContent = "Could not load approved users: " + error.message;
  });
}

function clearAccessManagement() {
  unsubscribeAccessRequests?.();
  unsubscribeApprovedUsers?.();
  unsubscribeAccessRequests = null;
  unsubscribeApprovedUsers = null;
  accessRequests = [];
  approvedUsers = [];
  if (authEls.accessManagement) authEls.accessManagement.hidden = true;
  document.getElementById("access-management-link").hidden = true;
}

function renderAccessManagement() {
  if (!authEls.accessManagement || authEls.accessManagement.hidden) return;
  const approvedIds = new Set(approvedUsers.map((user) => user.uid));
  const pending = accessRequests.filter((request) => !approvedIds.has(request.uid));

  authEls.accessRequestList.innerHTML = pending.length
    ? pending.map((request) => accessUserMarkup(request, "approve")).join("")
    : '<p class="profile-hint">No pending requests.</p>';
  authEls.approvedUserList.innerHTML = approvedUsers.length
    ? [...approvedUsers]
        .sort((a, b) => accessUserLabel(a).localeCompare(accessUserLabel(b)))
        .map((user) => accessUserMarkup(user, user.uid === ACCESS_ADMIN_UID ? "owner" : "revoke"))
        .join("")
    : '<p class="profile-hint">No approved users found.</p>';

  authEls.accessRequestList.querySelectorAll("[data-approve-user]").forEach((button) => {
    button.addEventListener("click", () => approveAccessRequest(button.dataset.approveUser));
  });
  authEls.approvedUserList.querySelectorAll("[data-revoke-user]").forEach((button) => {
    button.addEventListener("click", () => revokeUserAccess(button.dataset.revokeUser));
  });
}

function accessUserLabel(user) {
  return user.displayName || user.email || user.uid || "Firebase user";
}

function accessUserMarkup(user, action) {
  const detail = user.email || user.uid;
  const button = action === "approve"
    ? `<button class="primary-button" data-approve-user="${escapeHtml(user.uid)}" type="button">Approve</button>`
    : action === "revoke"
      ? `<button class="danger-button" data-revoke-user="${escapeHtml(user.uid)}" type="button">Revoke</button>`
      : '<span class="owner-badge">Owner</span>';
  return `
    <div class="access-user-row">
      <span><strong>${escapeHtml(accessUserLabel(user))}</strong><small>${escapeHtml(detail)}</small></span>
      ${button}
    </div>`;
}

async function approveAccessRequest(uid) {
  const request = accessRequests.find((item) => item.uid === uid);
  if (!request || cloud?.auth.currentUser?.uid !== ACCESS_ADMIN_UID) return;
  authEls.accessManagementMessage.textContent = "Approving access...";
  try {
    const batch = cloud.writeBatch(cloud.db);
    batch.set(cloud.doc(cloud.db, "approvedUsers", uid), {
      uid,
      email: request.email || "",
      displayName: request.displayName || "GitHub account",
      approvedAt: new Date().toISOString(),
      approvedBy: ACCESS_ADMIN_UID
    });
    batch.delete(cloud.doc(cloud.db, "accessRequests", uid));
    await batch.commit();
    authEls.accessManagementMessage.textContent = `${accessUserLabel(request)} can now access the database.`;
  } catch (error) {
    authEls.accessManagementMessage.textContent = "Could not approve access: " + error.message;
  }
}

async function revokeUserAccess(uid) {
  const user = approvedUsers.find((item) => item.uid === uid);
  if (!user || uid === ACCESS_ADMIN_UID || cloud?.auth.currentUser?.uid !== ACCESS_ADMIN_UID) return;
  if (!window.confirm(`Revoke database access for ${accessUserLabel(user)}?`)) return;
  authEls.accessManagementMessage.textContent = "Revoking access...";
  try {
    const batch = cloud.writeBatch(cloud.db);
    batch.delete(cloud.doc(cloud.db, "approvedUsers", uid));
    await batch.commit();
    authEls.accessManagementMessage.textContent = `${accessUserLabel(user)} can no longer access the database.`;
  } catch (error) {
    authEls.accessManagementMessage.textContent = "Could not revoke access: " + error.message;
  }
}

function setMembersPlaceholder(text) {
  if (!authEls.householdMembersList) return;
  authEls.householdMemberCount.textContent = "";
  authEls.householdMembersList.replaceChildren(createMemberPlaceholder(text));
}

function createMemberPlaceholder(text) {
  const item = document.createElement("li");
  item.className = "member-empty";
  item.textContent = text;
  return item;
}

// The avatar in the app header doubles as the settings button.
function renderCurrentMemberAvatars() {
  const user = cloud?.auth.currentUser;
  const member = currentMember() || { displayName: user?.displayName || "", photoUrl: "" };
  document.querySelectorAll("[data-current-member-avatar]").forEach((element) => applyAvatar(element, member));
}

function renderHouseholdMembers() {
  renderCurrentMemberAvatars();
  if (!authEls.householdMembersList) return;

  if (!householdMembers.length) {
    setMembersPlaceholder("No members yet.");
    return;
  }

  const currentUid = cloud?.auth.currentUser?.uid;
  const sorted = [...householdMembers].sort((a, b) => {
    const ownerDiff = Number(b.uid === householdOwnerUid) - Number(a.uid === householdOwnerUid);
    if (ownerDiff) return ownerDiff;
    return memberName(a).localeCompare(memberName(b));
  });

  authEls.householdMemberCount.textContent = `(${sorted.length})`;
  authEls.householdMembersList.replaceChildren(
    ...sorted.map((member) => {
      const item = document.createElement("li");
      item.className = "member-row";

      const avatar = document.createElement("span");
      avatar.className = "member-avatar";
      avatar.setAttribute("aria-hidden", "true");
      applyAvatar(avatar, member);
      item.append(avatar);

      const name = document.createElement("button");
      name.className = "member-name";
      name.type = "button";
      name.textContent = memberName(member) + (member.uid === currentUid ? " (you)" : "");
      name.addEventListener("click", () => openMemberProfile(member));
      item.append(name);

      if (member.uid === householdOwnerUid) {
        const badge = document.createElement("span");
        badge.className = "member-badge";
        badge.textContent = "Owner";
        item.append(badge);
      }

      return item;
    })
  );
}

function memberName(member) {
  return member.displayName || "Household member";
}

function openMemberProfile(member) {
  if (!authEls.memberProfileDialog) return;

  const currentUid = cloud?.auth.currentUser?.uid;
  applyAvatar(authEls.memberProfileAvatar, member);
  authEls.memberProfileName.textContent = memberName(member) + (member.uid === currentUid ? " (you)" : "");
  authEls.memberProfileEmail.textContent = member.email || "Not available";
  authEls.memberProfileRole.textContent = member.uid === householdOwnerUid ? "Household owner" : "Member";
  authEls.memberProfileDialog.showModal();
}

function memberRecord(user, inviteToken, profile = {}) {
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: profile.displayName || user.displayName || "GitHub account",
    photoUrl: profile.photoUrl || "",
    inviteToken
  };
}

function currentMember() {
  const uid = cloud?.auth.currentUser?.uid;
  return householdMembers.find((member) => member.uid === uid) || null;
}

function openProfileDialog() {
  const user = cloud?.auth.currentUser;
  if (!user || !authEls.profileDialog) return;

  const member = currentMember();
  profileDraftPhoto = member?.photoUrl || "";
  authEls.profileName.value = member?.displayName || user.displayName || "";
  authEls.profilePhoto.value = "";
  authEls.hideNutrition.checked = hideNutritionPreference;
  setProfileMessage("");
  authEls.settingsHouseholdMessage.textContent = "";
  renderProfilePreview();
  syncAppearanceControls();
  if (!authEls.profileDialog.classList.contains("active")) settingsReturnView = currentAppView();
  activateAppView("settings", "settings");
  window.scrollTo({ top: 0 });
}

function closeSettings() {
  if (!authEls.profileDialog?.classList.contains("active")) return;
  const back = settingsReturnView || { view: "planner", tab: "planner" };
  settingsReturnView = null;
  activateAppView(back.view, back.tab);
}

function setupSettingsPage() {
  document.querySelectorAll('input[name="theme-mode"]').forEach((input) => {
    input.addEventListener("change", () => applyAppearance({ mode: input.value }));
  });
  document.querySelectorAll('input[name="color-theme"]').forEach((input) => {
    input.addEventListener("change", () => applyAppearance({ theme: input.value }));
  });

  // On a phone the profile collapses to a summary row; Edit opens the name and photo fields.
  const editProfile = document.getElementById("edit-profile-details");
  editProfile.addEventListener("click", () => {
    const section = document.getElementById("profile-settings");
    const editing = section.dataset.editing !== "true";
    section.dataset.editing = String(editing);
    editProfile.setAttribute("aria-expanded", String(editing));
    editProfile.textContent = editing ? "Done" : "Edit";
    if (editing) authEls.profileName.focus();
  });

  const links = [...document.querySelectorAll("[data-settings-link]")];
  const setActive = (id) => links.forEach((link) => link.classList.toggle("active", link.dataset.settingsLink === id));
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setActive(link.dataset.settingsLink);
      document.getElementById(link.dataset.settingsLink)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -55% 0px" }
    );
    document.querySelectorAll("#settings-view .settings-section").forEach((section) => observer.observe(section));
  }
}

// Light, dark or follow the system, plus a colour theme. Per device, applied
// before first paint by the inline script in index.html.
function applyAppearance({ mode, theme }) {
  const root = document.documentElement;
  if (mode) root.dataset.themeMode = mode;
  if (theme) root.dataset.colorTheme = theme;
  try {
    if (mode) localStorage.setItem("recipe-theme-mode", mode);
    if (theme) localStorage.setItem("recipe-color-theme", theme);
  } catch (error) {
    // The choice still applies for this visit.
  }
  syncAppearanceControls();
}

function syncAppearanceControls() {
  const root = document.documentElement;
  const mode = root.dataset.themeMode || "light";
  const theme = root.dataset.colorTheme || "petal";
  document.querySelectorAll('input[name="theme-mode"]').forEach((input) => (input.checked = input.value === mode));
  document.querySelectorAll('input[name="color-theme"]').forEach((input) => (input.checked = input.value === theme));
}

function renderProfilePreview() {
  const name = authEls.profileName.value.trim() || cloud?.auth.currentUser?.displayName || "Household member";
  applyAvatar(authEls.profileAvatar, { displayName: name, photoUrl: profileDraftPhoto });
  applyAvatar(document.getElementById("profile-summary-avatar"), { displayName: name, photoUrl: profileDraftPhoto });
  document.getElementById("profile-summary-name").textContent = name;
}

async function handleProfilePhotoChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!isImageFile(file)) {
    setProfileMessage("Choose an image file.");
    event.target.value = "";
    return;
  }
  if (file.size >= PHOTO_UPLOAD_MAX_BYTES) {
    setProfileMessage("");
    showToast(PHOTO_TOO_BIG_MESSAGE, { tone: "error" });
    event.target.value = "";
    return;
  }

  setProfileMessage("Preparing your photo...");
  try {
    profileDraftPhoto = await resizeImageToDataUrl(file, 160);
    renderProfilePreview();
    setProfileMessage("Photo ready. Save your profile to share it.");
  } catch (error) {
    setProfileMessage("Could not read that image: " + error.message);
  } finally {
    event.target.value = "";
  }
}

async function saveProfile() {
  const user = cloud?.auth.currentUser;
  if (!user) return;

  const displayName = authEls.profileName.value.trim();
  if (!displayName) {
    setProfileMessage("Add a display name.");
    return;
  }

  const profile = {
    displayName,
    photoUrl: profileDraftPhoto || "",
    hideNutrition: authEls.hideNutrition.checked,
    nutrition: personalNutrition
  };
  setProfileMessage("Saving your profile...");

  try {
    const userRef = cloud.doc(cloud.db, "users", user.uid);
    await cloud.setDoc(userRef, { profile }, { merge: true });

    if (currentHouseholdId) {
      const memberRef = cloud.doc(cloud.db, "households", currentHouseholdId, "members", user.uid);
      await cloud.setDoc(memberRef, { displayName: profile.displayName, photoUrl: profile.photoUrl }, { merge: true });
    }

    authEls.accountEmail.textContent = displayName;
    hideNutritionPreference = profile.hideNutrition;
    applyNutritionVisibility();
    closeSettings();
  } catch (error) {
    setProfileMessage("Could not save your profile: " + error.message);
  }
}

async function loadStoredProfile(user) {
  try {
    const snapshot = await cloud.getDoc(cloud.doc(cloud.db, "users", user.uid));
    const profile = snapshot.data()?.profile;
    return profile && typeof profile === "object" ? profile : {};
  } catch (error) {
    return {};
  }
}

// Windows does not always register a useful MIME type for .webp (and some other
// formats), so a picked file can arrive untyped or as application/octet-stream.
// Fall back to the extension in either case.
const imageFileExtensions = /\.(webp|avif|jpe?g|png|gif|bmp|heics?|heif)$/i;

function isImageFile(file) {
  if (!file) return false;
  return String(file.type || "").startsWith("image/") || imageFileExtensions.test(file.name || "");
}

function isWebpFile(file) {
  return String(file?.type || "").toLowerCase() === "image/webp" || /\.webp$/i.test(file?.name || "");
}

function resizeImageToDataUrl(file, size) {
  return withImageSource(file, (image) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const scale = Math.max(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  });
}

function resizeImageToBlob(file, maxWidth) {
  return withImageSource(file, (image) => {
    const scale = Math.min(1, maxWidth / image.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    // JPEG has no transparency, so a cut-out product shot would turn black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("the image could not be encoded"))),
        "image/jpeg",
        0.8
      );
    });
  });
}

// Small WebPs keep their bytes. Big ones (store photos are often 2000px+) make the
// ingredient grid slow to scroll, so they're shrunk like other formats. Some
// browsers stall decoding particular WebP variants, so a resize that hangs or
// fails falls back to the original bytes rather than losing the photo.
const WEBP_KEEP_AS_IS_BYTES = 200 * 1024;

async function prepareWebpBlob(blob, maxWidth) {
  const original = blob.type === "image/webp" ? blob : blob.slice(0, blob.size, "image/webp");
  if (blob.size <= WEBP_KEEP_AS_IS_BYTES) return original;
  try {
    return await withTimeout(resizeImageToBlob(blob, maxWidth), 5000, "resize timed out");
  } catch (error) {
    return original;
  }
}

async function withImageSource(file, draw) {
  const image = await decodeImageFile(file);
  try {
    return await draw(image);
  } finally {
    image.close?.();
  }
}

// createImageBitmap decodes the file's own bytes, so it copes with a .webp that
// Windows handed over without a MIME type. The <img> fallback uses an object URL
// rather than a data URL for the same reason: data URLs are decoded strictly by
// their declared type, and an untyped file declares application/octet-stream.
async function decodeImageFile(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await withTimeout(createImageBitmap(file), PHOTO_DECODE_TIMEOUT, "the image took too long to open");
    } catch (error) {
      console.warn("createImageBitmap could not read the photo, falling back to an <img>", error);
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await loadImageElement(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => reject(new Error("the image took too long to open")), PHOTO_DECODE_TIMEOUT);
    const finish = (callback) => () => {
      clearTimeout(timer);
      callback();
    };
    image.onload = finish(() => resolve(image));
    image.onerror = finish(() => reject(new Error("the file is not a readable image")));
    image.src = src;
  });
}

function safeImageUrl(value) {
  const url = String(value || "").trim();
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(url)) return url;
  // Storage download URLs plus images linked from an imported recipe page. Quotes,
  // parens and whitespace are rejected so the value is safe inside a CSS url().
  return /^https:\/\/[^\s'"()\<>]+$/.test(url) ? url : "";
}

function recipeImage(recipe) {
  const uploaded = safeImageUrl(recipe?.image);
  if (uploaded) return uploaded;
  const name = String(recipe?.name || "").trim().toLowerCase().replace(/&/g, " and ").replace(/\s+/g, " ");
  const fallback = recipeFallbackPhotos.get(name);
  return fallback ? `assets/recipe-photos/${fallback}.jpg` : "";
}

function ingredientImage(ingredient) {
  return safeImageUrl(ingredient?.image);
}

// Linked Walmart photos point at the full-size original (often 2000px+), which
// is slow to download and decode on a phone. Walmart's image CDN resizes on
// request, so tiles ask for a small copy instead.
function tileImageUrl(url, size = 480) {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)walmartimages\.com$/i.test(parsed.hostname)) return url;
    parsed.searchParams.set("odnHeight", String(size));
    parsed.searchParams.set("odnWidth", String(size));
    parsed.searchParams.set("odnBg", "FFFFFF");
    return parsed.href;
  } catch (error) {
    return url;
  }
}

function setupCloudImageDiagnostics(container) {
  container?.querySelectorAll("img[data-cloud-image]").forEach((image) => {
    const wrapper = image.parentElement;
    const markLoaded = () => {
      if (wrapper) wrapper.dataset.imageLoaded = "true";
    };
    const markFailed = () => {
      if (wrapper) wrapper.dataset.imageError = "true";
      image.hidden = true;
      let source = "invalid URL";
      try {
        const url = new URL(image.currentSrc || image.src);
        source = url.origin + url.pathname;
      } catch (error) {
        // Keep download tokens out of diagnostics if the URL cannot be parsed.
      }
      console.error("Cloud image failed to display", { label: image.dataset.imageLabel || "Image", source });
    };

    image.addEventListener("load", markLoaded, { once: true });
    image.addEventListener("error", markFailed, { once: true });
    if (image.complete) {
      if (image.naturalWidth > 0) markLoaded();
      else markFailed();
    }
  });
}

function storagePathFor(kind, id, contentType = "image/jpeg") {
  const extension = contentType === "image/webp" ? "webp" : "jpg";
  return `households/${currentHouseholdId}/${kind}/${id}.${extension}`;
}

async function uploadImageBlob(blob, path) {
  const ref = cloud.storageRef(cloud.storage, path);
  await withTimeout(
    cloud.uploadBytes(ref, blob, { contentType: blob.type || "image/jpeg" }),
    PHOTO_UPLOAD_TIMEOUT,
    "the upload timed out - check your connection and try again"
  );
  return withTimeout(cloud.getDownloadURL(ref), PHOTO_UPLOAD_TIMEOUT, "the photo link timed out");
}

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function resolvePhoto(kind, id, blob, keptUrl, previous) {
  const previousPath = previous?.imagePath || "";
  if (blob) {
    const path = storagePathFor(kind, id, blob.type);
    const image = await uploadImageBlob(blob, path);
    if (previousPath && previousPath !== path) await deleteStoredImage(previousPath);
    return { image, imagePath: path };
  }

  const image = safeImageUrl(keptUrl);
  if (!image) {
    if (previousPath) await deleteStoredImage(previousPath);
    return { image: "", imagePath: "" };
  }

  return { image, imagePath: previousPath };
}

async function deleteStoredImage(path) {
  if (!cloud || !currentHouseholdId) return;
  try {
    await cloud.deleteObject(cloud.storageRef(cloud.storage, path));
  } catch (error) {
    if (error?.code !== "storage/object-not-found") console.warn("Could not delete image", error);
  }
}

function setRecipePhotoMessage(message) {
  const element = document.getElementById("recipe-photo-message");
  if (element) element.textContent = message;
}

function renderRecipePhotoPreview() {
  const preview = document.getElementById("recipe-photo-preview");
  if (!preview) return;
  const image = recipeDraftPreview || safeImageUrl(recipeDraftImage);
  preview.style.backgroundImage = image ? `url("${image}")` : "";
  preview.dataset.empty = image ? "false" : "true";
  document.getElementById("remove-recipe-photo").hidden = !image;
}

function clearRecipePhotoDraft() {
  if (recipeDraftPreview) URL.revokeObjectURL(recipeDraftPreview);
  recipeDraftPreview = "";
  recipeDraftBlob = null;
}

function setIngredientPhotoMessage(message) {
  const element = document.getElementById("ingredient-photo-message");
  if (element) element.textContent = message;
}

function renderIngredientPhotoPreview() {
  const preview = document.getElementById("ingredient-photo-preview");
  if (!preview) return;
  const image = ingredientDraftPreview || safeImageUrl(ingredientDraftImage);
  preview.style.backgroundImage = image ? `url("${image}")` : "";
  preview.dataset.empty = image ? "false" : "true";
  document.getElementById("remove-ingredient-photo").hidden = !image;
  syncIngredientSaveButton();
}

function clearIngredientPhotoDraft() {
  if (ingredientDraftPreview) URL.revokeObjectURL(ingredientDraftPreview);
  ingredientDraftPreview = "";
  ingredientDraftBlob = null;
}

// A pasted image address (e.g. a Walmart product photo) is downloaded and run through
// the same resize as a picked file, so it uploads to Storage on save like any photo.
const PHOTO_LINK_MAX_BYTES = 15 * 1024 * 1024;

function bindPhotoLink({ kind, maxWidth, setMessage, apply }) {
  const input = document.getElementById(`${kind}-photo-url`);
  const button = document.getElementById(`${kind}-photo-url-button`);
  if (!input || !button) return;

  const use = async () => {
    const url = input.value.trim();
    if (!url) {
      setMessage("Paste an image link first.");
      return;
    }
    button.disabled = true;
    try {
      const result = await readPhotoLink(url, maxWidth, setMessage);
      if (!result) return;
      apply(result);
      input.value = "";
    } finally {
      button.disabled = false;
    }
  };

  button.addEventListener("click", use);
  // Enter would otherwise submit the whole recipe or ingredient form.
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    use();
  });
}

function looksLikeImageAddress(url) {
  return /\.(jpe?g|png|webp|gif|avif)(?:$|[?#])/i.test(url.pathname + url.search) || /(^|\.)walmartimages\.com$/i.test(url.hostname);
}

async function readPhotoLink(value, maxWidth, setMessage) {
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    setMessage("That doesn't look like a link. Copy the image address and paste it here.");
    return null;
  }
  if (url.protocol !== "https:" || !safeImageUrl(url.href)) {
    setMessage("Use an https:// image link.");
    return null;
  }

  setMessage("Downloading the image...");
  try {
    const response = await withTimeout(
      fetch(url.href, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer" }),
      15000,
      "The download timed out."
    );
    if (!response.ok) throw new Error(`The site answered ${response.status}.`);
    const blob = await response.blob();
    if (!String(blob.type).startsWith("image/")) {
      setMessage("That link is a web page, not an image. Right-click the product photo and choose \"Copy image address\".");
      return null;
    }
    if (blob.size > PHOTO_LINK_MAX_BYTES) {
      setMessage("");
      showToast("That image is too large to use - try a different link.", { tone: "error" });
      return null;
    }
    // Small WebPs keep their bytes (see prepareWebpBlob); everything else is resized to JPEG.
    const ready = isWebpFile(blob) ? await prepareWebpBlob(blob, maxWidth) : await resizeImageToBlob(blob, maxWidth);
    if (ready.size >= PHOTO_UPLOAD_MAX_BYTES) {
      setMessage("");
      showToast(PHOTO_TOO_BIG_MESSAGE, { tone: "error" });
      return null;
    }
    setMessage("Photo ready - it uploads when you save.");
    return { blob: ready };
  } catch (error) {
    // Many stores don't allow other sites to download their images. Linking to the
    // store's copy still shows the photo; it just isn't stored in the household.
    if (looksLikeImageAddress(url)) {
      setMessage("That site blocked the download, so the photo links to its copy instead. Save to keep it.");
      return { link: url.href };
    }
    setMessage("Couldn't download that image. Right-click the product photo, choose \"Copy image address\", and paste that.");
    return null;
  }
}

async function readPhotoSelection(event, maxWidth, setMessage) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return null;
  if (!isImageFile(file)) {
    setMessage("Choose an image file.");
    return null;
  }
  if (file.size >= PHOTO_UPLOAD_MAX_BYTES) {
    setMessage("");
    showToast(PHOTO_TOO_BIG_MESSAGE, { tone: "error" });
    return null;
  }

  setMessage("Preparing your photo...");
  try {
    // WebPs go through prepareWebpBlob, which keeps small ones byte-for-byte and
    // falls back to the original if a browser stalls decoding one.
    if (isWebpFile(file)) {
      const blob = await prepareWebpBlob(file, maxWidth);
      setMessage("Photo ready - it uploads when you save.");
      return blob;
    }
    const blob = await resizeImageToBlob(file, maxWidth);
    setMessage("Photo ready - it uploads when you save.");
    return blob;
  } catch (error) {
    setMessage("Could not read that image: " + error.message);
    return null;
  }
}

function setProfileMessage(message) {
  if (authEls.profileMessage) authEls.profileMessage.textContent = message;
}

function applyAvatar(element, member) {
  const photoUrl = member.photoUrl || "";
  element.replaceChildren();
  element.style.backgroundImage = photoUrl ? 'url("' + photoUrl + '")' : "";
  element.classList.toggle("has-photo", Boolean(photoUrl));
  if (!photoUrl) element.textContent = memberInitials(memberName(member));
}

function memberInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

function setHouseholdControlsDisabled(disabled) {
  document.querySelectorAll("#household-panel button, #household-panel input").forEach((element) => {
    element.disabled = disabled;
  });
}

async function copyText(text) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  document.body.append(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

async function authenticateWithGitHub() {
  if (!cloud) {
    setAuthMessage("Add Firebase config before using GitHub sign-in.");
    return;
  }

  if (window.location.protocol === "file:") {
    setAuthMessage("GitHub sign-in needs http://localhost or your deployed site, not a file opened directly.");
    return;
  }

  try {
    authEls.githubButton.disabled = true;
    setAccountStatus("checking", "Signing in", "Complete GitHub sign-in in the popup");
    setAuthMessage("Waiting for GitHub...");
    const provider = new cloud.GithubAuthProvider();
    provider.setCustomParameters({ allow_signup: "true" });
    const result = await cloud.signInWithPopup(cloud.auth, provider);
    if (result.user) {
      setAuthMessage("GitHub sign-in complete. Loading your Firebase data...");
    }
  } catch (error) {
    authEls.githubButton.disabled = false;
    if (!cloud.auth.currentUser) {
      setAccountStatus("signed-out", "Not signed in", "Cloud sync is off");
    }
    setAuthMessage(authErrorMessage(error));
  }
}

async function checkGitHubRedirectResult() {
  try {
    const result = await cloud.getRedirectResult(cloud.auth);
    if (result?.user) {
      setAuthMessage("Signed in with GitHub.");
    }
  } catch (error) {
    setAuthMessage(authErrorMessage(error));
  }
}

function authErrorMessage(error) {
  if (error.code === "auth/unauthorized-domain") {
    return `Firebase rejected this domain: ${window.location.hostname}. Add it in Firebase Authentication > Settings > Authorized domains.`;
  }

  if (error.code === "auth/operation-not-allowed") {
    return "Enable GitHub in Firebase Authentication > Sign-in method.";
  }

  if (error.code === "auth/popup-closed-by-user") {
    return "GitHub sign-in was not completed. Allow popups for this site, then try again.";
  }

  if (error.code === "auth/popup-blocked") {
    return "Your browser blocked the GitHub sign-in window. Allow popups for this site, then try again.";
  }

  if (error.code === "auth/account-exists-with-different-credential") {
    return "This email already has an account using another sign-in method. Sign in with that method first.";
  }

  return error.message;
}

function changeWeek(daysToMove) {
  selectedWeekStart = addDays(selectedWeekStart, daysToMove);
  resetPlannerDay();
  getCurrentPlan();
  renderAll();
}

function getWeekStart(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const distanceFromMonday = day === 0 ? -6 : 1 - day;
  return addDays(copy, distanceFromMonday);
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isCurrentWeek() {
  return dateKey(selectedWeekStart) === dateKey(getWeekStart(new Date()));
}

function formatDayDate(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

// "Sep 1 - 7, 2026" when the week stays inside one month, so the label fits a
// phone-width week bar without wrapping.
function formatWeekRange(start, end) {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) return `${formatDayDate(start)} - ${end.getDate()}, ${end.getFullYear()}`;
  const sameYear = start.getFullYear() === end.getFullYear();
  const from = sameYear ? formatDayDate(start) : formatShortDate(start);
  return `${from} - ${formatShortDate(end)}`;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function setAuthMessage(message) {
  authEls.message.textContent = message;
  authEls.accountMessage.textContent = message;
}

// A brief confirmation that floats above the page (and above the phone tab bar).
let toastTimer = null;
function showToast(message, { tone = "success" } = {}) {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.dataset.tone = tone;
  toast.innerHTML = `<span class="app-toast-icon" aria-hidden="true">${icon(tone === "error" ? "circle-alert" : "check")}</span><span>${escapeHtml(message)}</span>`;
  // Restart the entrance even when a toast is already showing.
  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function setHouseholdMessage(message) {
  authEls.householdMessage.textContent = message;
}

function setAccountStatus(stateName, title, detail) {
  authEls.accountStatus.dataset.state = stateName;
  authEls.stateTitle.textContent = title;
  authEls.stateDetail.textContent = detail;
  authEls.gateStatus.textContent = `${title}. ${detail}`;
}

function requireCloudWrite() {
  if (canWriteCloudData()) return true;
  setAuthMessage(authResolved ? "Sign in and wait for Firebase to finish loading before making changes." : "Checking your Firebase sign-in...");
  return false;
}

function updateDataControls() {
  const disabled = !canWriteCloudData();
  const selectors = [
    "#week-grid select",
    "#week-grid .meal-slot-open",
    "#week-grid input",
    "#clear-week",
    "#recipe-form input",
    "#recipe-form select",
    "#recipe-form textarea",
    "#recipe-form button",
    "#recipe-import-source",
    "#recipe-import-run",
    "#ingredient-form input",
    "#ingredient-form button",
    "#kitchen-stock-form input",
    "#kitchen-stock-form select",
    "#kitchen-stock-form button",
    "#stock-receipt-import input",
    "#stock-receipt-import textarea",
    "#stock-receipt-import select",
    "#stock-receipt-import button",
    "#macro-people",
    "#macro-calories",
    "#macro-profile",
    "#macro-edit-goals",
    "[data-goal-key]",
    "[data-goal-reset]",
    "#create-planner-form input",
    "#create-planner-form button",
    "[data-join-planner]",
    "[data-leave-planner]",
    "[data-delete]",
    "[data-edit-recipe]",
    "[data-edit-open-recipe]",
    "[data-cook-recipe]",
    "[data-undo-cook]",
    "#log-cooked",
    "[data-add-to-plan]",
    "#delete-recipe",
    "[data-delete-ingredient]",
    "[data-edit-ingredient]",
    "[data-delete-stock]",
    "[data-edit-stock]"
  ];

  document.querySelectorAll(selectors.join(",")).forEach((element) => {
    const needsPlanner = element.matches("#week-grid select, #week-grid .meal-slot-open, #clear-week");
    const receiptBusy = element.closest("#stock-receipt-import")?.getAttribute("aria-busy") === "true";
    element.disabled = disabled || receiptBusy || (needsPlanner && !activePlanner());
  });
}

function findIngredient(ingredientName) {
  return state.ingredients?.[ingredientKey(ingredientName)];
}

function ingredientKey(value) {
  return String(value).trim().toLowerCase();
}

function walmartSearchUrl(query) {
  return `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadRecipeFilters();
renderTabs();
setupRouting();
setupCookDialog();
setupAddToPlan();
setupPlannerLayout();
setupForms();
// Start from a true blank form so the floating Save knows what "empty" looks like.
resetIngredientForm();
document.getElementById("ingredient-form").addEventListener("input", syncIngredientSaveButton);
document.getElementById("ingredient-form").addEventListener("change", syncIngredientSaveButton);
setupRecipeImport();
setupStockReceiptImport();
setupAuth();
renderAll();
initializeCloud();
