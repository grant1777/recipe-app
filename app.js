const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const meals = ["Breakfast", "Lunch", "Dinner"];
const TAKEOUT_PREFIX = "takeout:";
const categoryOrder = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snack", "Side"];
const RECIPE_PHOTO_MAX_WIDTH = 720;
const INGREDIENT_PHOTO_MAX_WIDTH = 480;
const PHOTO_DECODE_TIMEOUT = 20000;
const PHOTO_UPLOAD_TIMEOUT = 60000;
const PHOTO_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
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

const nutrients = [
  { key: "calories", label: "Calories", short: "Cal", unit: "" },
  { key: "protein", label: "Protein", short: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", short: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", short: "Fat", unit: "g" },
  { key: "iron", label: "Iron", short: "Iron", unit: "mg" },
  { key: "calcium", label: "Calcium", short: "Calcium", unit: "mg" },
  { key: "potassium", label: "Potassium", short: "Potassium", unit: "mg" }
];

const servingUnits = [
  { group: "Weight", units: ["mg", "g", "kg", "oz", "lb"] },
  { group: "Volume", units: ["ml", "cl", "dl", "l", "tsp", "tbsp", "fl oz", "cup", "pt", "qt", "gal"] },
  { group: "Count", units: ["piece", "slice", "serving", "can", "package", "scoop", "clove"] }
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
  clove: { dimension: "count", factor: 1 }
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
  packages: "package", scoops: "scoop", cloves: "clove"
};

const customServingUnit = "__other__";

const authEls = {
  appShell: document.getElementById("app-shell"),
  signedOut: document.getElementById("signed-out-panel"),
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
let householdMembers = [];
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
let activePlannerId = null;
let openRecipeId = null;

function blankPlan() {
  return Object.fromEntries(days.map((day) => [day, Object.fromEntries(meals.map((meal) => [meal, ""]))]));
}

function createInitialState() {
  return {
    recipes: starterRecipes,
    ingredients: {},
    planners: {}
  };
}

function createSignedOutState() {
  return {
    recipes: [],
    ingredients: {},
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
    ingredients: normalizeIngredientCatalog(ingredientSource)
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
  applyNutritionVisibility();
  unsubscribeCloudState?.();
  unsubscribeCloudState = null;
  clearHouseholdMembers();

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

async function applyStoredProfileLabel(user) {
  const profile = await loadStoredProfile(user);
  if (cloud?.auth.currentUser?.uid !== user.uid) return;
  if (profile.displayName) authEls.accountEmail.textContent = profile.displayName;
  hideNutritionPreference = Boolean(profile.hideNutrition);
  applyNutritionVisibility();
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

function renderPlanner() {
  const planner = ensureActivePlanner();
  const plan = getCurrentPlan();
  const grid = document.getElementById("week-grid");
  grid.innerHTML = days
    .map((day, index) => {
      const date = addDays(selectedWeekStart, index);
      const slots = meals
        .map((meal) => {
          const value = plan[day]?.[meal] || "";
          const takeout = isTakeoutValue(value);
          return `
            <div class="meal-slot">
              <label for="${day}-${meal}">${meal}</label>
              <div class="meal-slot-controls" data-takeout="${takeout}">
                <select id="${day}-${meal}" data-day="${day}" data-meal="${meal}">
                  ${recipeOptions(value)}
                </select>
                <input
                  class="takeout-name"
                  type="text"
                  aria-label="${day} ${meal} restaurant"
                  placeholder="Restaurant"
                  data-day="${day}"
                  data-meal="${meal}"
                  value="${escapeHtml(takeoutName(value))}"
                  ${takeout ? "" : "hidden"}
                />
              </div>
            </div>`;
        })
        .join("");

      return `
        <article class="day-column">
          <h3>${day}</h3>
          <span class="day-date">${formatDayDate(date)}</span>
          ${slots}
        </article>`;
    })
    .join("");

  grid.querySelectorAll("select").forEach((select) => {
    select.disabled = !planner;
    select.addEventListener("change", () => {
      if (!planner || !requireCloudWrite()) {
        renderAll();
        return;
      }
      const nameInput = select.parentElement.querySelector(".takeout-name");
      const value = select.value === TAKEOUT_PREFIX ? takeoutValue(nameInput?.value || "") : select.value;
      getCurrentPlan()[select.dataset.day][select.dataset.meal] = value;
      saveState();
      renderAll();
      if (isTakeoutValue(value)) {
        document.getElementById(`${select.dataset.day}-${select.dataset.meal}`)?.parentElement?.querySelector(".takeout-name")?.focus();
      }
    });
  });

  grid.querySelectorAll(".takeout-name").forEach((input) => {
    input.disabled = !planner;
    input.addEventListener("change", () => {
      if (!planner || !requireCloudWrite()) {
        renderAll();
        return;
      }
      getCurrentPlan()[input.dataset.day][input.dataset.meal] = takeoutValue(input.value);
      saveState();
      renderAll();
    });
  });
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
  const filter = document.getElementById("category-filter");
  const current = filter.value || "all";
  const categories = [...new Set(state.recipes.map((recipe) => recipe.category))].sort();
  filter.innerHTML = [
    '<option value="all">All recipes</option>',
    ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
  ].join("");
  filter.value = categories.includes(current) ? current : "all";
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
  return `
    <button class="recipe-catalogue-card" data-open-recipe="${escapeHtml(recipe.id)}" type="button">
      ${recipeCatalogueVisual(recipe)}
      <span class="recipe-catalogue-body">
        <span class="category-pill">${escapeHtml(recipe.category)}</span>
        <strong>${escapeHtml(recipe.name)}</strong>
        <span>${recipe.ingredients?.length || 0} ingredients · ${steps} steps · Serves ${formatQuantity(Number(recipe.servings || 1))}</span>
      </span>
      <span class="recipe-catalogue-open">View recipe →</span>
    </button>`;
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
        <ul class="ingredients">${recipe.ingredients.map((ingredient) => `<li>${escapeHtml(recipeIngredientText(ingredient))}</li>`).join("")}</ul>
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

function highlightIngredientMentions(step, recipe) {
  const amounts = new Map();
  recipe.ingredients?.forEach((item) => {
    const detail = recipeIngredientMention(item);
    if (detail?.name) amounts.set(detail.name.toLowerCase(), detail.amount);
  });

  const names = [...amounts.keys()].sort((a, b) => b.length - a.length);
  if (!names.length) return escapeHtml(step);

  const pattern = new RegExp(`\\b(${names.map(escapeRegExp).join("|")})\\b`, "gi");
  let cursor = 0;
  let html = "";
  for (const match of step.matchAll(pattern)) {
    html += escapeHtml(step.slice(cursor, match.index));
    const amount = amounts.get(match[0].toLowerCase());
    html += `<span class="ingredient-mention" role="button" tabindex="0" aria-label="${escapeHtml(match[0])}: ${escapeHtml(amount)}">${escapeHtml(match[0])}<span class="ingredient-amount" role="tooltip">${escapeHtml(amount)}</span></span>`;
    cursor = match.index + match[0].length;
  }
  return html + escapeHtml(step.slice(cursor));
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
  return `${formatQuantity(roundTo(containers, 2))} container${roundTo(containers, 2) === 1 ? "" : "s"}`;
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
  if (typeof item === "string") return formatAmountsInText(item);
  const ingredient = state.ingredients[item.key] || item;
  const name = ingredient.name || "Ingredient";
  return `${recipeIngredientAmount(item, ingredient)} ${name}`.replace(/\s+/g, " ").trim();
}

// Just the amount: "1 tbsp", "2 egg", "1 container". Serving counts and container
// maths stay in the recipe totals instead of padding out every line.
function recipeIngredientAmount(item, ingredient) {
  const quantity = Number(item.quantity || 0);
  if (item.measure === "container") {
    return `${formatQuantity(quantity)} container${quantity === 1 ? "" : "s"}`;
  }
  if (item.measure && item.measure !== "serving") {
    return `${formatQuantity(quantity)} ${item.measure}`;
  }

  // "Serving" rows count the ingredient's own serving size, so fold the two
  // numbers together: 2 x "1 egg" reads as "2 egg", not "2 x 1 egg".
  const serving = parseServing(ingredient?.serving);
  if (serving.amount > 0) {
    return `${formatQuantity(quantity * serving.amount)} ${serving.unit === "serving" ? "" : serving.unit}`.trim();
  }
  return `${formatQuantity(quantity)} x ${ingredient?.serving || "serving"}`;
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
          const ingredient = findIngredient(item.name);
          const link = safeLinkUrl(ingredient?.url) || walmartSearchUrl(item.name);
          const saved = Boolean(safeLinkUrl(ingredient?.url));
          const image = ingredient ? ingredientImage(ingredient) : "";
          const perContainer = item.servingsPerContainer || ingredient?.servingsPerContainer;
          const containers = perContainer && item.quantity ? containersForServings(item.quantity, perContainer) : 0;
          const visual = image
            ? `<span class="grocery-card-visual has-image"><img class="grocery-card-image" src="${escapeHtml(image)}" alt="" loading="lazy" data-cloud-image data-image-label="${escapeHtml(item.name)}" /></span>`
            : `<span class="grocery-card-visual">${escapeHtml(item.name.slice(0, 1).toUpperCase())}</span>`;
          return `
            <li class="grocery-card" data-grocery-text="${escapeHtml(text)}">
              <div class="grocery-card-head">
                ${visual}
                <span class="grocery-card-title">
                  <strong>${escapeHtml(item.name)}</strong>
                  <span class="grocery-card-amount">${escapeHtml(groceryAmountText(item))}</span>
                </span>
              </div>
              ${containers
                ? `<span class="grocery-card-buy"><b>Buy ${Math.ceil(containers)}</b> · needs ${escapeHtml(formatContainers(containers))}</span>`
                : ""}
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

// "2 cup" for measured items, "x3" when the same item shows up in several recipes.
function groceryAmountText(item) {
  if (item.quantity) return `${formatQuantity(item.quantity)} ${item.unit}`.replace(/\s+/g, " ").trim();
  return item.count > 1 ? `x${item.count}` : "As needed";
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

  return {
    key: ingredient.key || ingredientKey(ingredient.name),
    name: ingredient.name,
    unit: ingredient.serving || "serving",
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
        quantity: parseQuantity(quantityText),
        count: 1
      };
    }

    return {
      key: clean.toLowerCase(),
      name: clean,
      unit: "",
      quantity: 0,
      count: 1
    };
  }

  const [, quantityText, unit, name] = match;
  return {
    key: `${unit.toLowerCase()}|${name.trim().toLowerCase()}`,
    name: name.trim(),
    unit,
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
    return `${formatQuantity(item.quantity)} ${item.unit} ${item.name}`.replace(/\s+/g, " ").trim();
  }

  return `${item.name}${item.count > 1 ? ` x${item.count}` : ""}`;
}

function renderMacros() {
  const planned = plannedRecipes();
  const totals = planned.reduce((sum, recipe) => addNutrients(sum, recipeMacros(recipe)), emptyNutrients());
  const containers = planned.reduce((sum, recipe) => sum + recipeContainers(recipe), 0);

  document.getElementById("macro-dashboard").innerHTML = [
    ...nutrients.map((nutrient) => macroCard(nutrient.label, nutrientText(nutrient, totals[nutrient.key]), "nutrition-only")),
    macroCard("Containers", formatQuantity(roundTo(containers, 2)))
  ].join("");
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

const tileNutrients = ["calories", "protein", "carbs", "fat"];

function ingredientTile(ingredient) {
  const image = ingredientImage(ingredient);
  const url = safeLinkUrl(ingredient.url);
  const visual = image
    ? `<span class="ingredient-tile-visual has-image"><img class="ingredient-tile-image" src="${escapeHtml(image)}" alt="" loading="lazy" data-cloud-image data-image-label="${escapeHtml(ingredient.name)}" /></span>`
    : `<span class="ingredient-tile-visual">${escapeHtml(ingredient.name.slice(0, 1).toUpperCase())}</span>`;
  const macros = nutrients
    .filter((nutrient) => tileNutrients.includes(nutrient.key))
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

  const categorySelect = document.getElementById("recipe-category");
  const hasCategory = [...categorySelect.options].some((option) => option.value === parsed.category);
  categorySelect.value = hasCategory ? parsed.category : "Dinner";

  const ingredientRows = document.getElementById("recipe-ingredient-rows");
  ingredientRows.replaceChildren();
  (parsed.ingredients.length ? parsed.ingredients : [""]).forEach((line) => addRecipeIngredientRow(line));

  const stepRows = document.getElementById("recipe-step-rows");
  stepRows.replaceChildren();
  (parsed.steps.length ? parsed.steps : [""]).forEach((step) => addRecipeStepRow(step));

  recipeDraftNutrition = parsed.nutrition;
  recipeDraftImage = safeImageUrl(parsed.image);
  setRecipePhotoMessage(recipeDraftImage ? "Photo linked from the source site." : "Optional. Photos are resized before uploading.");
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
  const range = `${formatShortDate(selectedWeekStart)} - ${formatShortDate(end)}`;
  document.getElementById("week-range").textContent = range;
  document.getElementById("week-sidebar-title").textContent = isCurrentWeek() ? "This week" : "Selected week";
}

function renderPlannedCount() {
  const count = plannedSlotValues().length;
  document.getElementById("planned-count").textContent = `${count} meal${count === 1 ? "" : "s"} planned`;
}

function renderAll() {
  renderWeekLabels();
  renderPlannerControls();
  renderPlanner();
  renderRecipes();
  renderRecipeEditor();
  renderGroceries();
  renderIngredients();
  renderMacros();
  renderPlannedCount();
  refreshRecipeIngredientRows();
  updateDataControls();
}

function setupForms() {
  populateServingUnits();
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
    }

    state.ingredients[key] = ingredient;
    event.target.reset();
    delete event.target.dataset.editingKey;
    resetIngredientMacroInputs();
    clearIngredientPhotoDraft();
    ingredientDraftImage = "";
    setIngredientPhotoMessage("Optional. Photos are resized before uploading.");
    renderIngredientPhotoPreview();
    renderAll();

    authEls.syncStatus.textContent = "Saving";
    setAccountStatus("checking", "Signed in", "Saving to Firebase...");
    const saved = await saveCloudState("Ingredient save failed");
    if (saved) setAuthMessage("Ingredient saved to Firebase.");
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
    </label>
    <button class="danger-button" type="button">Remove</button>`;

  row.querySelector(".danger-button").addEventListener("click", () => {
    row.remove();
    if (!container.children.length) addRecipeStepRow();
    updateRecipeStepNumbers();
  });
  container.append(row);
  makeRowsSortable(container, { item: ".recipe-step-row", onReorder: updateRecipeStepNumbers });
  updateRecipeStepNumbers();
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
  setRecipePhotoMessage(recipeDraftImage ? "Photo attached." : "Optional. Photos are resized before uploading.");
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
  setRecipePhotoMessage("Optional. Photos are resized before uploading.");
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
    measure: item.measure || "serving"
  };
}

function recipeMeasurementOptions(ingredient, selectedMeasure) {
  const serving = ingredient ? parseServing(ingredient.serving) : null;
  const selected = selectedMeasure || "serving";
  const specialOptions = `
    <option value="serving" ${selected === "serving" ? "selected" : ""}>Serving${serving ? ` (${escapeHtml(ingredient.serving)})` : "(s)"}</option>
    <option value="container" ${selected === "container" ? "selected" : ""}>Whole container${ingredient ? ` (${formatQuantity(servingsPerContainer(ingredient))} servings)` : "(s)"}</option>`;
  const measurementOptions = servingUnits
    .map((section) => {
      const options = section.units
        .map((unit) => {
          const compatible = !serving || measurementIsCompatible(unit, serving.unit);
          return `<option value="${unit}" ${selected === unit ? "selected" : ""} ${compatible ? "" : "disabled"}>${unit}</option>`;
        })
        .join("");
      return `<optgroup label="${section.group}">${options}</optgroup>`;
    })
    .join("");

  const servingUnit = normalizeMeasurementUnit(serving?.unit);
  const customOption = serving && !knownServingUnit(servingUnit)
    ? `<optgroup label="Ingredient unit"><option value="${escapeHtml(serving.unit)}" ${selected === serving.unit ? "selected" : ""}>${escapeHtml(serving.unit)}</option></optgroup>`
    : "";
  return specialOptions + measurementOptions + customOption;
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
  bindIngredientPicker(row);
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
function bindIngredientPicker(row) {
  const input = row.querySelector(".recipe-ingredient-search");
  const results = row.querySelector(".ingredient-picker-results");
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
    updateRecipeIngredientRow(row);
    refreshRecipeMacroPreview();
    row.querySelector(".recipe-ingredient-quantity").focus();
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
      ingredients.push(`${formatQuantity(quantity)} ${unit} ${name}`.replace(/\s+/g, " ").trim());
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
  servingUnits.forEach((section) => {
    const group = document.createElement("optgroup");
    group.label = section.group;
    section.units.forEach((unit) => {
      const option = document.createElement("option");
      option.value = unit;
      option.textContent = unit;
      group.appendChild(option);
    });
    select.appendChild(group);
  });
  const other = document.createElement("option");
  other.value = customServingUnit;
  other.textContent = "Other...";
  select.appendChild(other);
  select.value = "g";
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
  const { amount, unit } = parseServing(serving);
  document.getElementById("ingredient-serving-amount").value = formatQuantity(amount);
  const select = document.getElementById("ingredient-serving-unit");
  const custom = document.getElementById("ingredient-serving-unit-other");
  if (knownServingUnit(unit)) {
    select.value = unit;
  } else {
    select.value = customServingUnit;
    custom.value = unit;
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
  setIngredientPhotoMessage(ingredientDraftImage ? "Photo attached." : "Optional. Photos are resized before uploading.");
  renderIngredientPhotoPreview();
  document.getElementById("ingredient-name").focus();
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
  setMembersPlaceholder("Loading members...");
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
    hideNutrition: authEls.hideNutrition.checked
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

  setMessage("Preparing your photo...");
  try {
    // Some browsers stall while decoding particular WebP variants. Firebase can
    // store WebP directly, so preserve its bytes and MIME type instead of routing
    // it through canvas. Other formats are still resized and encoded as JPEG.
    if (isWebpFile(file)) {
      if (file.size >= PHOTO_UPLOAD_MAX_BYTES) {
        throw new Error("WebP photos must be smaller than 5 MB");
      }
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
    "#create-planner-form input",
    "#create-planner-form button",
    "[data-join-planner]",
    "[data-leave-planner]",
    "[data-delete]",
    "[data-edit-recipe]",
    "[data-edit-open-recipe]",
    "[data-delete-ingredient]",
    "[data-edit-ingredient]"
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
setupForms();
setupRecipeImport();
setupAuth();
renderAll();
initializeCloud();
