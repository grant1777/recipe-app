const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const meals = ["Breakfast", "Lunch", "Dinner"];
const TAKEOUT_PREFIX = "takeout:";
const categoryOrder = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snack", "Side"];
const RECIPE_PHOTO_MAX_WIDTH = 720;
const INGREDIENT_PHOTO_MAX_WIDTH = 480;
const PHOTO_DECODE_TIMEOUT = 20000;
const PHOTO_UPLOAD_TIMEOUT = 60000;
const PHOTO_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
const OPTIONAL_PHOTO_MESSAGE = "Optional. Maximum file size: 2 MB.";
const ACCESS_ADMIN_UID = "7OaNUgKTq6UVOc5pikdPiFTou0t2";
const FIRESTORE_DOC_LIMIT = 1000000;
const FIRESTORE_DOC_WARNING = 800000;
const firebaseConfig = window.firebaseConfig;

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

const defaultRecipeCategories = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snack", "Side"];

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
  profileDialog: document.getElementById("profile-dialog"),
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
    nutrition: defaultNutritionSettings(),
    planners: {}
  };
}

function createSignedOutState() {
  return {
    recipes: [],
    ingredients: {},
    kitchenStock: {},
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
          serving: item.serving || "1 serving",
          ...nutrientValues(item),
          servingsPerContainer: servingsPerContainer(item),
          url: item.url || walmartSearchUrl(name),
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
  applyNutritionVisibility();
  renderMacros();
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
    currentInviteCode = `${householdId}.${household.inviteToken}`;
    authEls.householdCode.textContent = currentInviteCode;
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

function renderTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      activateAppView(button.dataset.tab, button.dataset.tab);
    });
  });
}

function activateAppView(viewName, activeTab = viewName) {
  document.querySelectorAll(".tab-button").forEach((button) => button.classList.toggle("active", button.dataset.tab === activeTab));
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
}

function showRecipeEditor(recipe = null) {
  activateAppView("recipe-editor", "recipes");
  if (recipe) fillRecipeForm(recipe);
  else resetRecipeForm();
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

function slotSummary(value) {
  if (isTakeoutValue(value)) {
    const name = takeoutName(value);
    return { kind: "takeout", label: name || "Takeout", image: "", note: name ? "Takeout" : "" };
  }
  const recipe = value ? recipeById(value) : null;
  if (!recipe) return { kind: "empty", label: "", image: "", note: "" };
  return { kind: "recipe", label: recipe.name, image: recipeImage(recipe), note: recipe.category || "" };
}

function mealSlotMarkup(day, meal, value) {
  const takeout = isTakeoutValue(value);
  const summary = slotSummary(value);
  const filled = summary.kind !== "empty";
  const thumb = summary.image
    ? `<span class="meal-slot-thumb has-photo" style="background-image:url('${summary.image}')"></span>`
    : `<span class="meal-slot-thumb" aria-hidden="true">${summary.kind === "takeout" ? "🥡" : mealIcons[meal] || "🍽️"}</span>`;

  return `
    <div class="meal-slot" data-filled="${filled}" data-kind="${summary.kind}" data-takeout="${takeout}">
      <div class="meal-slot-main">
        ${thumb}
        <span class="meal-slot-text" aria-hidden="true">
          <span class="meal-slot-label">${meal}</span>
          <span class="meal-slot-value">${filled ? escapeHtml(summary.label) : "Add a recipe"}</span>
        </span>
        <span class="meal-slot-chevron" aria-hidden="true">▾</span>
        <select class="meal-slot-select" id="${day}-${meal}" aria-label="${day} ${meal}" data-day="${day}" data-meal="${meal}">
          ${recipeOptions(value)}
        </select>
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

  grid.innerHTML = days
    .map((day, index) => {
      const date = addDays(selectedWeekStart, index);
      const filled = filledCounts[index];
      const slots = meals.map((meal) => mealSlotMarkup(day, meal, plan[day]?.[meal] || "")).join("");

      return `
        <article
          class="day-column"
          data-day="${day}"
          data-today="${dateKey(date) === todayKey}"
          data-selected="${index === dayIndex}"
        >
          <header class="day-column-header">
            <div class="day-column-title">
              <h3>${day}</h3>
              <span class="day-date">${formatDayDate(date)}</span>
            </div>
            <span class="day-badge" data-complete="${filled === meals.length}">${filled}/${meals.length}</span>
          </header>
          <div class="day-column-slots">${slots}</div>
        </article>`;
    })
    .join("");

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
      getCurrentPlan()[select.dataset.day][select.dataset.meal] = value;
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

// Every dropdown in the app is built from one of the shared indexes — saved
// recipes, their categories, the ingredient catalogue, or the unit list — through
// these helpers, so no two lists can drift apart.
function optionMarkup(value, label, selected = "", extra = "") {
  return `<option value="${escapeHtml(value)}"${String(selected) === String(value) ? " selected" : ""}${extra}>${escapeHtml(label)}</option>`;
}

function unitOptionsMarkup({ selected = "", lead = "", compatibleWith = "", extraUnit = "", includeOther = false } = {}) {
  const groups = servingUnits
    .map((section) => {
      const options = section.units
        .map((unit) => {
          const usable = !compatibleWith || measurementIsCompatible(unit, compatibleWith);
          return optionMarkup(unit, unit, selected, usable ? "" : " disabled");
        })
        .join("");
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

// The six built-in categories plus any others the saved recipes actually use, so
// an imported "Brunch" survives instead of being coerced to Dinner.
function recipeCategories() {
  const used = state.recipes.map((recipe) => recipe.category).filter(Boolean);
  return [...new Set([...defaultRecipeCategories, ...used])].sort((a, b) => a.localeCompare(b));
}

function recipeOptions(selectedId = "") {
  return [
    '<option value="">Choose a recipe</option>',
    `<option value="${TAKEOUT_PREFIX}" ${isTakeoutValue(selectedId) ? "selected" : ""}>Takeout</option>`,
    ...state.recipes
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((recipe) => `<option value="${recipe.id}" ${recipe.id === selectedId ? "selected" : ""}>${escapeHtml(recipe.name)}</option>`)
  ].join("");
}

function renderCategories() {
  const categories = recipeCategories();

  // The filter only lists categories that would return something.
  const filter = document.getElementById("category-filter");
  const current = filter.value || "all";
  const inUse = categories.filter((category) => state.recipes.some((recipe) => recipe.category === category));
  filter.innerHTML = optionMarkup("all", "All recipes", current) + inUse.map((category) => optionMarkup(category, category, current)).join("");
  filter.value = inUse.includes(current) ? current : "all";

  // The editor offers every assignable category, and keeps whatever is selected.
  const editor = document.getElementById("recipe-category");
  const chosen = editor.value || "Dinner";
  const assignable = categories.includes(chosen) ? categories : [...categories, chosen].sort((a, b) => a.localeCompare(b));
  editor.innerHTML = assignable.map((category) => optionMarkup(category, category, chosen)).join("");
  editor.value = chosen;
}

function renderRecipeEditor() {
  renderCategories();
  const list = document.getElementById("recipe-list");
  const filter = document.getElementById("category-filter").value;
  const recipes = state.recipes
    .filter((recipe) => filter === "all" || recipe.category === filter)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  if (!recipes.length) {
    list.innerHTML = '<p class="empty-state">No recipes in this category yet.</p>';
    return;
  }

  list.innerHTML = recipes
    .map((recipe) => `
      <article class="recipe-editor-row">
        <div>
          <span class="category-pill">${escapeHtml(recipe.category)}</span>
          <h3>${escapeHtml(recipe.name)}</h3>
          <span class="recipe-editor-meta">${recipe.ingredients?.length || 0} ingredients · ${recipeSteps(recipe).length} steps · Serves ${formatQuantity(Number(recipe.servings || 1))}</span>
        </div>
        <div class="recipe-card-actions">
          <button class="secondary-button" data-edit-recipe="${escapeHtml(recipe.id)}" type="button">Edit</button>
          <button class="danger-button" data-delete="${escapeHtml(recipe.id)}" type="button">Delete</button>
        </div>
      </article>`)
    .join("");

  list.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!requireCloudWrite()) return;
      const id = button.dataset.delete;
      if (document.getElementById("recipe-form").dataset.editingId === id) resetRecipeForm();
      deleteRecipe(id);
    });
  });

  list.querySelectorAll("[data-edit-recipe]").forEach((button) => {
    button.addEventListener("click", () => {
      const recipe = recipeById(button.dataset.editRecipe);
      if (recipe) showRecipeEditor(recipe);
    });
  });

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
  const search = document.getElementById("recipe-search").value.trim().toLowerCase();
  const selectedRecipe = openRecipeId ? recipeById(openRecipeId) : null;

  // Reading mode drops the page header on small screens so the recipe starts at the top.
  view.classList.toggle("is-reading", Boolean(selectedRecipe));

  if (selectedRecipe) {
    catalogue.hidden = true;
    detail.hidden = false;
    detail.innerHTML = recipeDetailMarkup(selectedRecipe);
    setupCloudImageDiagnostics(detail);
    detail.querySelector("[data-back-to-recipes]").addEventListener("click", () => {
      openRecipeId = null;
      renderRecipes();
    });
    detail.querySelector("[data-edit-open-recipe]").addEventListener("click", () => {
      showRecipeEditor(selectedRecipe);
    });
    detail.querySelector("[data-cook-recipe]").addEventListener("click", () => cookRecipe(selectedRecipe));
    detail.querySelector("[data-undo-cook]")?.addEventListener("click", undoStockDeduction);
    setupIngredientMentions(detail);
    return;
  }

  detail.hidden = true;
  catalogue.hidden = false;
  const recipes = state.recipes
    .filter((recipe) => !search || `${recipe.name} ${recipe.category}`.toLowerCase().includes(search))
    .sort((a, b) => a.name.localeCompare(b.name));
  catalogue.innerHTML = recipes.length
    ? groupRecipesByCategory(recipes).map(recipeCategorySection).join("")
    : '<p class="empty-state">No recipes match your search.</p>';
  setupCloudImageDiagnostics(catalogue);
  catalogue.querySelectorAll("[data-open-recipe]").forEach((button) => {
    button.addEventListener("click", () => {
      openRecipeId = button.dataset.openRecipe;
      renderRecipes();
    });
  });
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
  const steps = recipeSteps(recipe).length;
  const coverage = recipeStockCoverage(recipe);
  return `
    <button class="recipe-catalogue-card${coverage.ready ? " is-ready" : ""}" data-open-recipe="${escapeHtml(recipe.id)}" type="button">
      ${recipeCatalogueVisual(recipe)}
      <span class="recipe-catalogue-body">
        <span class="recipe-catalogue-tags">
          <span class="category-pill">${escapeHtml(recipe.category)}</span>
          ${stockCoverageBadge(coverage)}
        </span>
        <strong>${escapeHtml(recipe.name)}</strong>
        <span>${recipe.ingredients?.length || 0} ingredients · ${steps} steps · Serves ${formatQuantity(Number(recipe.servings || 1))}</span>
      </span>
      <span class="recipe-catalogue-open">View recipe →</span>
    </button>`;
}

// Silent until there is stock to compare against, so an empty kitchen does not
// stamp "0 of 5" on every recipe you own.
function stockCoverageBadge(coverage) {
  if (!coverage.total || !hasKitchenStock()) return "";
  if (coverage.ready) return '<span class="stock-pill is-ready">✓ Can make now</span>';
  if (!coverage.have) return "";
  return `<span class="stock-pill">${coverage.have} of ${coverage.total} in stock</span>`;
}

function recipeCatalogueVisual(recipe) {
  const image = recipeImage(recipe);
  if (image) {
    return `<span class="recipe-catalogue-visual has-image" aria-hidden="true"><img class="recipe-catalogue-image" src="${escapeHtml(image)}" alt="" loading="lazy" data-cloud-image data-image-label="${escapeHtml(recipe.name)}" /></span>`;
  }
  return `<span class="recipe-catalogue-visual" aria-hidden="true">${escapeHtml(recipe.name.slice(0, 1).toUpperCase())}</span>`;
}

function recipeDetailMarkup(recipe) {
  const macros = recipeMacros(recipe);
  const containers = recipeContainers(recipe);
  const steps = recipeSteps(recipe);
  return `
    <div class="recipe-detail-actions">
      <button class="text-button" data-back-to-recipes type="button">← All recipes</button>
      <button class="secondary-button" data-cook-recipe type="button" title="Subtract these ingredients from your kitchen stock">I made this</button>
      ${lastStockDeduction?.recipeId === recipe.id ? '<button class="text-button" data-undo-cook type="button">Undo</button>' : ""}
      <button class="secondary-button" data-edit-open-recipe type="button">Edit recipe</button>
    </div>
    ${recipeImage(recipe) ? `<img class="recipe-detail-image" src="${escapeHtml(recipeImage(recipe))}" alt="${escapeHtml(recipe.name)}" data-cloud-image data-image-label="${escapeHtml(recipe.name)}" />` : ""}
    <header class="recipe-detail-header">
      <span class="category-pill">${escapeHtml(recipe.category)}</span>
      <h2>${escapeHtml(recipe.name)}</h2>
      <p>Serves ${formatQuantity(Number(recipe.servings || 1))}</p>
    </header>
    <div class="recipe-detail-layout">
      <aside class="recipe-detail-ingredients">
        <h3>Ingredients</h3>
        <ul class="ingredients">${recipe.ingredients.map((ingredient) => `<li>${recipeIngredientMarkup(ingredient)}</li>`).join("")}</ul>
      </aside>
      <div class="recipe-detail-method">
        <section class="recipe-card-section recipe-instruction-block">
          <h3>Instructions</h3>
          ${steps.length ? `<ol class="recipe-instructions">${steps.map((step) => `<li>${highlightIngredientMentions(step, recipe)}</li>`).join("")}</ol>` : '<p class="empty-state">No instructions added yet.</p>'}
        </section>
        ${recipe.notes ? `<section class="recipe-card-section recipe-notes"><h3>Notes</h3><p>${escapeHtml(recipe.notes)}</p></section>` : ""}
      </div>
    </div>
    <details class="recipe-totals">
      <summary>Recipe totals</summary>
      <div class="macro-row">${nutrientChips(macros)}${catalogItems(recipe).length ? macroChip("Containers", formatQuantity(roundTo(containers, 2))) : ""}</div>
    </details>`;
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
      const membership = planner.allHouseholdMembers ? "All household members" : `${memberCount} member${memberCount === 1 ? "" : "s"}`;
      const owner = householdMembers.find((member) => member.uid === planner.ownerUid);
      const ownerText = owner ? ` - Created by ${memberName(owner)}` : "";
      return `
        <div class="planner-directory-row">
          <div>
            <strong>${escapeHtml(planner.name)}</strong>
            <span class="planner-directory-meta">${escapeHtml(membership + ownerText)}</span>
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
// {{Ingredient Name|the words as they read in the step}}. Anything untagged still
// falls back to matching ingredient names automatically.
const stepTagPattern = /\{\{([^{}|]+?)(?:\|([^{}]*?))?\}\}/g;

function stepTagMarkup(name, text) {
  const label = String(text ?? "").trim() || name;
  return label.toLowerCase() === name.toLowerCase() ? `{{${name}}}` : `{{${name}|${label}}}`;
}

// The step as a reader sees it, with every label reduced to its visible words.
function stripStepTags(step) {
  return String(step ?? "").replace(stepTagPattern, (match, name, text) => (text ?? name).trim() || name.trim());
}

function recipeIngredientAmounts(recipe) {
  const amounts = new Map();
  recipe.ingredients?.forEach((item) => {
    const detail = recipeIngredientMention(item);
    if (detail?.name) amounts.set(detail.name.toLowerCase(), detail.amount);
  });
  return amounts;
}

function mentionMarkup(text, amount) {
  if (!amount) return escapeHtml(text);
  return `<span class="ingredient-mention" role="button" tabindex="0" aria-label="${escapeHtml(text)}: ${escapeHtml(amount)}">${escapeHtml(
    text
  )}<span class="ingredient-amount" role="tooltip">${escapeHtml(amount)}</span></span>`;
}

function highlightIngredientMentions(step, recipe) {
  const amounts = recipeIngredientAmounts(recipe);
  const names = [...amounts.keys()].sort((a, b) => b.length - a.length);
  const autoPattern = names.length ? new RegExp(`\\b(${names.map(escapeRegExp).join("|")})\\b`, "gi") : null;

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
    const name = match[1].trim();
    const label = (match[2] ?? name).trim() || name;
    // A label pointing at an ingredient the recipe no longer has degrades to plain words.
    html += mentionMarkup(label, amounts.get(name.toLowerCase()) || "");
    cursor = match.index + match[0].length;
  }
  return html + autoHighlight(step.slice(cursor));
}

function recipeIngredientMention(item) {
  if (typeof item === "string") {
    const parsed = parseIngredient(item);
    if (!parsed) return null;
    const amount = parsed.quantity ? `${formatQuantity(parsed.quantity)}${parsed.unit ? ` ${parsed.unit}` : ""}` : formatAmountsInText(item);
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
const pluralizableUnits = new Set(["piece", "slice", "serving", "can", "package", "scoop", "clove", "egg", "cup", "container"]);

function pluralizeUnit(unit, quantity) {
  const normalized = normalizeMeasurementUnit(unit);
  if (!normalized || !pluralizableUnits.has(normalized)) return normalized;
  return roundTo(Number(quantity || 0), 2) === 1 ? normalized : `${normalized}s`;
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
  return {
    text: `${formatUnitQuantity(quantity, unit)} ${pluralizeUnit(unit, quantity)}`.replace(/\s+/g, " ").trim(),
    unit: normalizeMeasurementUnit(unit)
  };
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

function formatContainers(containers) {
  return amountParts(roundTo(containers, 2), "container").text;
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
  // An "egg" unit already names the ingredient, so "2 eggs Egg" becomes "2 eggs".
  return { amount: amount.text, name: unitNamesIngredient(amount.unit, name) ? "" : name };
}

// Pulls "2 tbsp" off the front of "2 tbsp Olive oil". The trailing word only
// joins the amount when it is a unit, so "3 Chicken breasts" keeps its name whole.
function splitLeadingAmount(text) {
  const match = String(text ?? "").trim().match(/^((?:\d+\s+)?[\d./¼-¾⅐-⅞]+)\s*(.*)$/);
  if (!match) return { amount: "", name: String(text ?? "").trim() };

  const [, quantity, rest] = match;
  const unitMatch = rest.match(/^([a-zA-Z]+)\s+(\S.*)$/);
  const unit = unitMatch ? normalizeMeasurementUnit(unitMatch[1]) : "";
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
  plannedRecipes().forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const parsed = parseRecipeIngredient(ingredient);
      if (!parsed) return;

      const existing = groceries.get(parsed.key);
      if (existing && existing.unit === parsed.unit && parsed.quantity) {
        existing.quantity += parsed.quantity;
        return;
      }

      if (existing) {
        existing.count += 1;
        return;
      }

      groceries.set(parsed.key, parsed);
    });
  });

  const groceryList = document.getElementById("grocery-list");
  if (!groceries.size) {
    groceryList.innerHTML = '<p class="empty-state">Plan meals for this week and your grocery list will appear here.</p>';
    return;
  }

  groceryList.innerHTML = `
    <ul class="grocery-grid">
      ${[...groceries.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => {
          const text = formatGroceryItem(item);
          const ingredient = state.ingredients[item.key] || findIngredient(item.name);
          const link = safeLinkUrl(ingredient?.url) || walmartSearchUrl(item.name);
          const saved = Boolean(safeLinkUrl(ingredient?.url));
          const image = ingredient ? ingredientImage(ingredient) : "";
          const perContainer = item.servingsPerContainer || ingredient?.servingsPerContainer;
          const containers = perContainer && item.quantity ? containersForServings(item.quantity, perContainer) : 0;
          const initial = escapeHtml(item.name.slice(0, 1).toUpperCase());
          const visual = image
            ? `<span class="grocery-card-visual has-image"><span class="grocery-card-initial">${initial}</span><img class="grocery-card-image" src="${escapeHtml(image)}" alt="" loading="lazy" data-cloud-image data-image-label="${escapeHtml(item.name)}" /></span>`
            : `<span class="grocery-card-visual"><span class="grocery-card-initial">${initial}</span></span>`;
          // Shown, never subtracted: stock can be out of date, and a wrong
          // grocery amount is worse than a redundant one.
          const stocked = stockedFor(item.key, item.name);
          return `
            <li class="grocery-card${stocked ? " is-stocked" : ""}" data-grocery-text="${escapeHtml(text)}">
              ${visual}
              <div class="grocery-card-body">
                <strong class="grocery-card-name">${escapeHtml(item.name)}</strong>
                <span class="grocery-card-amount">${escapeHtml(groceryAmountText(item))}</span>
                ${stocked ? `<span class="grocery-card-stock">In kitchen: ${escapeHtml(kitchenStockAmountText(stocked))}</span>` : ""}
                ${containers
                  ? `<span class="grocery-card-buy"><b>Buy ${Math.ceil(containers)}</b> · needs ${escapeHtml(formatContainers(containers))}</span>`
                  : ""}
              </div>
              <a class="grocery-card-link ${saved ? "is-product" : "is-search"}" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
                <span class="grocery-card-link-label">${saved ? "Open product" : "Search Walmart"}</span>
                <span class="grocery-card-link-url">${escapeHtml(linkDisplayUrl(link))}</span>
              </a>
            </li>`;
        })
        .join("")}
    </ul>`;
  setupCloudImageDiagnostics(groceryList);
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
  const totals = planned.reduce((sum, recipe) => addNutrients(sum, recipeMacros(recipe)), emptyNutrients());
  const containers = planned.reduce((sum, recipe) => sum + recipeContainers(recipe), 0);
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
      <span>${planned.length} meal${planned.length === 1 ? "" : "s"} planned</span>
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

function renderIngredients() {
  const ingredients = Object.values(state.ingredients || {}).sort((a, b) => a.name.localeCompare(b.name));
  const list = document.getElementById("ingredient-list");
  if (!ingredients.length) {
    list.innerHTML = '<p class="empty-state">Add an ingredient with its serving macros before building a recipe.</p>';
    return;
  }

  list.innerHTML = ingredients.map(ingredientTile).join("");
  setupCloudImageDiagnostics(list);

  list.querySelectorAll("[data-edit-ingredient]").forEach((button) => {
    button.addEventListener("click", () => fillIngredientForm(state.ingredients[button.dataset.editIngredient]));
  });

  list.querySelectorAll("[data-delete-ingredient]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!requireCloudWrite()) return;
      const key = button.dataset.deleteIngredient;
      const inUse = state.recipes.some((recipe) => recipe.ingredients?.some((item) => typeof item === "object" && item.key === key));
      if (inUse) {
        setAuthMessage("This ingredient is used by a recipe and cannot be deleted.");
        return;
      }

      if (state.ingredients[key]?.imagePath) void deleteStoredImage(state.ingredients[key].imagePath);
      delete state.ingredients[key];
      saveState();
      renderAll();
      refreshRecipeMacroPreview();
    });
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
      const label = coverage.total ? (coverage.ready ? "✓ Can make now" : `${coverage.have} of ${coverage.total} in stock`) : "No amounts set";
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
  const lines = (recipe.ingredients || []).map(recipeIngredientUsage).filter((usage) => usage && usage.quantity > 0);
  const coverage = { total: lines.length, have: 0, short: 0, missing: 0, ready: false };

  lines.forEach((usage) => {
    const entry = stockedFor(usage.key, usage.name);
    if (!entry) {
      coverage.missing += 1;
      return;
    }

    const needed = usage.unit === entry.unit
      ? usage.quantity
      : convertMeasurement(usage.quantity, usage.unit, entry.unit);
    if (needed === null || !Number.isFinite(needed)) coverage.short += 1;
    // Tolerance keeps 0.30000000000000004 from reading as short of 0.3.
    else if (entry.quantity + 1e-6 >= needed) coverage.have += 1;
    else coverage.short += 1;
  });

  coverage.ready = coverage.total > 0 && coverage.have === coverage.total;
  return coverage;
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
    ? `<span class="ingredient-tile-visual has-image"><img class="ingredient-tile-image" src="${escapeHtml(image)}" alt="" loading="lazy" data-cloud-image data-image-label="${escapeHtml(entry.name)}" /></span>`
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
    ? `<span class="ingredient-tile-visual has-image"><img class="ingredient-tile-image" src="${escapeHtml(image)}" alt="" loading="lazy" data-cloud-image data-image-label="${escapeHtml(ingredient.name)}" /></span>`
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
    <article class="ingredient-tile">
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
  const range = formatWeekRange(selectedWeekStart, end);
  const relative = isCurrentWeek() ? "This week" : "Selected week";
  document.getElementById("week-range").textContent = range;
  document.getElementById("week-relative").textContent = relative;
  document.getElementById("week-sidebar-title").textContent = relative;
  document.getElementById("current-week").disabled = isCurrentWeek();
}

function renderPlannedCount() {
  const count = plannedSlotValues().length;
  const total = days.length * meals.length;
  document.getElementById("planned-count").textContent = `${count} meal${count === 1 ? "" : "s"} planned`;
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

  document.getElementById("category-filter").addEventListener("change", renderRecipeEditor);
  document.getElementById("recipe-search").addEventListener("input", () => {
    openRecipeId = null;
    renderRecipes();
  });
  document.getElementById("open-recipe-editor").addEventListener("click", () => {
    openRecipeId = null;
    showRecipeEditor();
  });
  document.getElementById("close-recipe-editor").addEventListener("click", () => {
    resetRecipeForm();
    showRecipesView();
  });
  document.getElementById("recipe-photo").addEventListener("change", async (event) => {
    const blob = await readPhotoSelection(event, RECIPE_PHOTO_MAX_WIDTH, setRecipePhotoMessage);
    if (!blob) return;
    clearRecipePhotoDraft();
    recipeDraftBlob = blob;
    recipeDraftPreview = URL.createObjectURL(blob);
    renderRecipePhotoPreview();
  });
  document.getElementById("remove-recipe-photo").addEventListener("click", () => {
    clearRecipePhotoDraft();
    recipeDraftImage = "";
    document.getElementById("recipe-photo").value = "";
    setRecipePhotoMessage("Photo removed. Save the recipe to apply.");
    renderRecipePhotoPreview();
  });
  document.getElementById("add-recipe-ingredient").addEventListener("click", () => addRecipeIngredientRow());
  document.getElementById("add-recipe-step").addEventListener("click", () => addRecipeStepRow());
  document.getElementById("cancel-recipe-edit").addEventListener("click", resetRecipeForm);
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
    event.target.reset();
    delete event.target.dataset.editingKey;
    resetIngredientMacroInputs();
    clearIngredientPhotoDraft();
    ingredientDraftImage = "";
    setIngredientPhotoMessage(OPTIONAL_PHOTO_MESSAGE);
    renderIngredientPhotoPreview();
    renderAll();

    authEls.syncStatus.textContent = "Saving";
    setAccountStatus("checking", "Signed in", "Saving to Firebase...");
    const saved = await saveCloudState("Ingredient save failed");
    if (saved) setAuthMessage("Ingredient saved to Firebase.");
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

function addRecipeStepRow(value = "") {
  const container = document.getElementById("recipe-step-rows");
  const row = document.createElement("div");
  row.className = "recipe-step-row";
  row.innerHTML = `
    <button class="recipe-step-number drag-handle" type="button" aria-label="Reorder step" title="Drag to reorder, or use the arrow keys"></button>
    <label>
      <span class="recipe-step-label">Step</span>
      <textarea class="recipe-step-input" required placeholder="Describe this step...">${escapeHtml(value)}</textarea>
      <span class="recipe-step-tools">
        <select class="recipe-step-tag" aria-label="Label the selected words as an ingredient"></select>
        <span class="recipe-step-tag-hint"></span>
      </span>
    </label>
    <button class="danger-button" type="button">Remove</button>`;

  bindStepIngredientTagger(row);

  row.querySelector(".danger-button").addEventListener("click", () => {
    row.remove();
    if (!container.children.length) addRecipeStepRow();
    updateRecipeStepNumbers();
  });
  container.append(row);
  makeRowsSortable(container, { item: ".recipe-step-row", onReorder: updateRecipeStepNumbers });
  updateRecipeStepNumbers();
}

const untagStepValue = "__untag__";

// The names currently typed into this recipe's ingredient rows — the same index the
// step labels have to resolve against when the recipe is rendered.
function recipeFormIngredientNames() {
  const names = [...document.querySelectorAll(".recipe-ingredient-search")]
    .map((input) => input.value.trim())
    .filter(Boolean);
  return [...new Map(names.map((name) => [name.toLowerCase(), name])).values()].sort((a, b) => a.localeCompare(b));
}

// Select words in a step, pick the ingredient they refer to, and the step stores
// a {{label}} so the saved recipe highlights those words with their amount.
function bindStepIngredientTagger(row) {
  const textarea = row.querySelector(".recipe-step-input");
  const select = row.querySelector(".recipe-step-tag");
  const hint = row.querySelector(".recipe-step-tag-hint");
  let selection = { start: 0, end: 0 };

  const remember = () => {
    selection = { start: textarea.selectionStart, end: textarea.selectionEnd };
  };
  ["keyup", "mouseup", "select", "blur"].forEach((event) => textarea.addEventListener(event, remember));

  const setHint = (message) => {
    hint.textContent = message;
  };

  const repopulate = () => {
    const names = recipeFormIngredientNames();
    const tagged = countStepTags(textarea.value);
    select.innerHTML = [
      optionMarkup("", names.length ? "Label selection as..." : "Add an ingredient first"),
      ...names.map((name) => optionMarkup(name, name)),
      tagged ? optionMarkup(untagStepValue, `Remove label${tagged > 1 ? "s" : ""} in selection`) : ""
    ].join("");
    select.value = "";
    select.disabled = !names.length && !tagged;
  };

  select.addEventListener("mousedown", repopulate);
  select.addEventListener("focus", repopulate);
  select.addEventListener("change", () => {
    const choice = select.value;
    select.value = "";
    if (!choice) return;

    const { start, end } = selection;
    if (start === end) {
      setHint("Select the words in the step first.");
      return;
    }

    const result = choice === untagStepValue
      ? removeStepTagsInSelection(textarea.value, start, end)
      : addStepTag(textarea.value, start, end, choice);

    if (!result) {
      setHint("That selection cannot be labelled - avoid { } and | characters.");
      return;
    }

    textarea.value = result.value;
    textarea.focus();
    textarea.setSelectionRange(result.start, result.end);
    remember();
    setHint(choice === untagStepValue ? "Label removed." : `Labelled as ${choice}.`);
  });

  repopulate();
}

function countStepTags(value) {
  return [...String(value ?? "").matchAll(stepTagPattern)].length;
}

function addStepTag(value, start, end, name) {
  const selected = value.slice(start, end).trim();
  if (!selected || /[{}|]/.test(selected)) return null;

  const leading = value.slice(start).indexOf(selected) + start;
  const tag = stepTagMarkup(name, selected);
  const next = value.slice(0, leading) + tag + value.slice(leading + selected.length);
  return { value: next, start: leading, end: leading + tag.length };
}

function removeStepTagsInSelection(value, start, end) {
  let result = "";
  let cursor = 0;
  let removed = 0;
  for (const match of String(value).matchAll(stepTagPattern)) {
    const tagEnd = match.index + match[0].length;
    result += value.slice(cursor, match.index);
    // Any label the selection touches is unwrapped back to its visible words.
    const overlaps = match.index < end && tagEnd > start;
    result += overlaps ? stripStepTags(match[0]) : match[0];
    if (overlaps) removed += 1;
    cursor = tagEnd;
  }
  if (!removed) return null;
  result += value.slice(cursor);
  return { value: result, start: Math.min(start, result.length), end: Math.min(end, result.length) };
}

function updateRecipeStepNumbers() {
  document.querySelectorAll(".recipe-step-row").forEach((row, index) => {
    row.querySelector(".recipe-step-number").textContent = index + 1;
    row.querySelector(".recipe-step-label").textContent = `Step ${index + 1}`;
  });
}

function collectRecipeSteps() {
  return [...document.querySelectorAll(".recipe-step-input")].map((input) => input.value.trim()).filter(Boolean);
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
  recipeDraftImage = recipeImage(recipe);
  document.getElementById("recipe-photo").value = "";
  setRecipePhotoMessage(recipeDraftImage ? "Photo attached." : OPTIONAL_PHOTO_MESSAGE);
  renderRecipePhotoPreview();

  const ingredientRows = document.getElementById("recipe-ingredient-rows");
  ingredientRows.replaceChildren();
  (recipe.ingredients?.length ? recipe.ingredients : [{}]).forEach((ingredient) => addRecipeIngredientRow(ingredient));

  const stepRows = document.getElementById("recipe-step-rows");
  stepRows.replaceChildren();
  const steps = recipeSteps(recipe);
  (steps.length ? steps : [""]).forEach((step) => addRecipeStepRow(step));

  document.getElementById("save-recipe").textContent = "Save changes";
  document.getElementById("cancel-recipe-edit").hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("recipe-name").focus({ preventScroll: true });
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
  document.getElementById("cancel-recipe-edit").hidden = true;
  clearRecipePhotoDraft();
  recipeDraftNutrition = null;
  recipeDraftImage = "";
  document.getElementById("recipe-photo").value = "";
  setRecipePhotoMessage(OPTIONAL_PHOTO_MESSAGE);
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
    optionMarkup("container", `Whole container${ingredient ? ` (${formatQuantity(servingsPerContainer(ingredient))} servings)` : "(s)"}`, selected);

  return unitOptionsMarkup({
    selected,
    lead,
    // Units that cannot convert to this ingredient's serving stay visible but unpickable.
    compatibleWith: serving?.unit,
    extraUnit: serving?.unit
  });
}

// Pointer-based row reordering: works with mouse and touch, and with the
// keyboard through the handle's arrow keys.
function makeRowsSortable(container, { handle = ".drag-handle", item, onReorder = () => {} }) {
  if (!container || container.dataset.sortable === "true") return;
  container.dataset.sortable = "true";

  let row = null;
  let pointerId = null;
  let basePointerY = 0;

  const stop = () => {
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
    row = target;
    pointerId = event.pointerId;
    basePointerY = event.clientY;
    row.dataset.dragging = "true";
    container.dataset.dragging = "true";
    grip.setPointerCapture(pointerId);
    event.preventDefault();
  });

  container.addEventListener("pointermove", (event) => {
    if (!row || event.pointerId !== pointerId) return;
    event.preventDefault();
    row.style.transform = `translateY(${event.clientY - basePointerY}px)`;

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
    basePointerY = event.clientY - offset;
    row.style.transform = `translateY(${offset}px)`;
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
  return `<button class="${className}" type="button" aria-label="${escapeHtml(label)}" title="Drag to reorder, or use the arrow keys">
      <svg viewBox="0 0 10 16" aria-hidden="true" focusable="false"><circle cx="3" cy="3" r="1.4"/><circle cx="7" cy="3" r="1.4"/><circle cx="3" cy="8" r="1.4"/><circle cx="7" cy="8" r="1.4"/><circle cx="3" cy="13" r="1.4"/><circle cx="7" cy="13" r="1.4"/></svg>
    </button>`;
}

function addRecipeIngredientRow(item = {}) {
  const container = document.getElementById("recipe-ingredient-rows");
  const row = document.createElement("div");
  row.className = "recipe-ingredient-row";
  const formValue = recipeIngredientFormValue(item);
  row.innerHTML = `
    ${dragHandleMarkup("Reorder ingredient")}
    <div class="ingredient-picker">
      <label>
        Ingredient
        <input class="recipe-ingredient-search" required placeholder="Search ingredients" autocomplete="off"
          role="combobox" aria-expanded="false" aria-autocomplete="list" value="${escapeHtml(formValue.name)}" />
      </label>
      <div class="ingredient-picker-results" role="listbox" hidden></div>
    </div>
    <label>
      Quantity
      <input class="recipe-ingredient-quantity" required type="text" inputmode="text" autocomplete="off" placeholder="1 1/2" value="${escapeHtml(formatQuantity(formValue.quantity))}" />
    </label>
    <label>
      Unit
      <select class="recipe-ingredient-measure" data-initial-measure="${escapeHtml(formValue.measure)}"></select>
    </label>
    <span class="recipe-ingredient-serving">Choose an ingredient</span>
    <button class="danger-button" type="button">Remove</button>`;

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
  row.querySelector(".danger-button").addEventListener("click", () => {
    row.remove();
    refreshRecipeMacroPreview();
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
  const measure = requestedMeasure === "serving" || requestedMeasure === "container" || !serving || measurementIsCompatible(requestedMeasure, serving.unit)
    ? requestedMeasure
    : "serving";
  select.innerHTML = recipeMeasurementOptions(ingredient, measure);
  select.value = measure;
  const quantity = parseFractionInput(row.querySelector(".recipe-ingredient-quantity").value);
  const servingCount = ingredient ? recipeItemServingCount({ quantity, measure }, ingredient) : 0;
  row.querySelector(".recipe-ingredient-serving").textContent = ingredient
    ? measure === "container"
      ? `${formatQuantity(servingsPerContainer(ingredient))} servings per container`
      : measure === "serving"
        ? `${ingredient.serving} per serving`
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
      const unit = measure === "serving" ? "" : measure === "container" ? "container" : measure;
      const amount = amountParts(quantity, unit);
      const label = unitNamesIngredient(amount.unit, name) ? "" : name;
      ingredients.push(`${amount.text} ${label}`.replace(/\s+/g, " ").trim());
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
  const items = collectRecipeIngredients(true) || [];
  const macros = macrosForIngredientRows(items);
  const containers = containersForIngredientRows(items);
  document.getElementById("recipe-macro-preview").innerHTML =
    nutrientChips(macros, "label") + macroChip("Containers", formatQuantity(roundTo(containers, 2)));
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

function resetIngredientMacroInputs() {
  nutrients.forEach((nutrient) => {
    document.getElementById(nutrientInputId(nutrient)).value = 0;
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

  container.innerHTML = nutrientGroups
    .map((group) => {
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
    })
    .join("");
}

function readNutrientInputs() {
  return Object.fromEntries(
    nutrients.map((nutrient) => [nutrient.key, roundTo(Number(document.getElementById(nutrientInputId(nutrient)).value) || 0, 2)])
  );
}

function getGroceryTexts() {
  return [...document.querySelectorAll("#grocery-list [data-grocery-text]")].map((item) => item.dataset.groceryText);
}

function setupAuth() {
  document.getElementById("sign-in-github").addEventListener("click", authenticateWithGitHub);
  document.getElementById("create-household").addEventListener("click", createHousehold);
  document.getElementById("join-household-form").addEventListener("submit", joinHousehold);
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
  document.getElementById("cancel-profile").addEventListener("click", () => authEls.profileDialog.close());
  document.getElementById("close-profile-dialog").addEventListener("click", () => authEls.profileDialog.close());
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
    authEls.profileDialog.close();
    showHouseholdSetup(user);
    setHouseholdMessage("You left the household. Create another household or paste an invite code to join one.");
    renderAll();
  } catch (error) {
    handleSyncError("Could not leave household", error);
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
  const separatorIndex = inviteCode.indexOf(".");
  if (separatorIndex < 1) {
    setHouseholdMessage("That invite code is not valid. Copy the complete code from the household owner.");
    return;
  }

  const householdId = inviteCode.slice(0, separatorIndex);
  const inviteToken = inviteCode.slice(separatorIndex + 1);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(householdId) || !uuidPattern.test(inviteToken)) {
    setHouseholdMessage("That invite code is not valid. Copy the complete code from the household owner.");
    return;
  }

  setHouseholdControlsDisabled(true);
  setHouseholdMessage("Joining the shared household...");

  try {
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
      : '<span class="member-badge">Owner</span>';
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

function renderHouseholdMembers() {
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
  authEls.profileDialog.showModal();
}

function renderProfilePreview() {
  const name = authEls.profileName.value.trim() || cloud?.auth.currentUser?.displayName || "Household member";
  applyAvatar(authEls.profileAvatar, { displayName: name, photoUrl: profileDraftPhoto });
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
    setProfileMessage("Images must be smaller than 2 MB.");
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
    authEls.profileDialog.close();
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
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("the image could not be encoded"))),
        "image/jpeg",
        0.8
      );
    });
  });
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
  return safeImageUrl(recipe?.image);
}

function ingredientImage(ingredient) {
  return safeImageUrl(ingredient?.image);
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
}

function clearIngredientPhotoDraft() {
  if (ingredientDraftPreview) URL.revokeObjectURL(ingredientDraftPreview);
  ingredientDraftPreview = "";
  ingredientDraftBlob = null;
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
    setMessage("Images must be smaller than 2 MB.");
    return null;
  }

  setMessage("Preparing your photo...");
  try {
    // Some browsers stall while decoding particular WebP variants. Firebase can
    // store WebP directly, so preserve its bytes and MIME type instead of routing
    // it through canvas. Other formats are still resized and encoded as JPEG.
    if (isWebpFile(file)) {
      const blob = file.slice(0, file.size, "image/webp");
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
    "[data-delete-ingredient]",
    "[data-edit-ingredient]",
    "[data-delete-stock]",
    "[data-edit-stock]"
  ];

  document.querySelectorAll(selectors.join(",")).forEach((element) => {
    const needsPlanner = element.matches("#week-grid select, #clear-week");
    element.disabled = disabled || (needsPlanner && !activePlanner());
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

renderTabs();
setupCookDialog();
setupPlannerLayout();
setupForms();
setupRecipeImport();
setupAuth();
renderAll();
initializeCloud();
