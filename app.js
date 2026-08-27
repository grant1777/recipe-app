const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const meals = ["Breakfast", "Lunch", "Dinner", "Snack"];
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
          url: item.url || walmartSearchUrl(name)
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
    const app = appModule.initializeApp(firebaseConfig);
    const auth = authModule.getAuth(app);
    const db = firestoreModule.getFirestore(app);

    await authModule.setPersistence(auth, authModule.browserLocalPersistence);

    cloud = {
      auth,
      db,
      doc: firestoreModule.doc,
      collection: firestoreModule.collection,
      writeBatch: firestoreModule.writeBatch,
      getDoc: firestoreModule.getDoc,
      setDoc: firestoreModule.setDoc,
      onSnapshot: firestoreModule.onSnapshot,
      onAuthStateChanged: authModule.onAuthStateChanged,
      GithubAuthProvider: authModule.GithubAuthProvider,
      getRedirectResult: authModule.getRedirectResult,
      signInWithPopup: authModule.signInWithPopup,
      signOut: authModule.signOut
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

  try {
    const ref = cloud.doc(cloud.db, "households", currentHouseholdId);
    await cloud.setDoc(ref, state, { merge: true });
    return true;
  } catch (error) {
    handleSyncError(errorPrefix, error);
    return false;
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

function plannedRecipeIds() {
  const plan = getCurrentPlan();
  return days.flatMap((day) => meals.map((meal) => plan[day]?.[meal]).filter(Boolean));
}

function plannedRecipes() {
  return plannedRecipeIds().map(recipeById).filter(Boolean);
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
        .map(
          (meal) => `
            <div class="meal-slot">
              <label for="${day}-${meal}">${meal}</label>
              <select id="${day}-${meal}" data-day="${day}" data-meal="${meal}">
                ${recipeOptions(plan[day]?.[meal] || "")}
              </select>
            </div>`
        )
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
      getCurrentPlan()[select.dataset.day][select.dataset.meal] = select.value;
      saveState();
      renderAll();
    });
  });
}

function recipeOptions(selectedId = "") {
  return [
    '<option value="">Choose a recipe</option>',
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
  const catalogue = document.getElementById("recipe-catalogue");
  const detail = document.getElementById("recipe-detail");
  const search = document.getElementById("recipe-search").value.trim().toLowerCase();
  const selectedRecipe = openRecipeId ? recipeById(openRecipeId) : null;

  if (selectedRecipe) {
    catalogue.hidden = true;
    detail.hidden = false;
    detail.innerHTML = recipeDetailMarkup(selectedRecipe);
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
    ? recipes.map(recipeCatalogueCard).join("")
    : '<p class="empty-state">No recipes match your search.</p>';
  catalogue.querySelectorAll("[data-open-recipe]").forEach((button) => {
    button.addEventListener("click", () => {
      openRecipeId = button.dataset.openRecipe;
      renderRecipes();
    });
  });
}

function recipeCatalogueCard(recipe) {
  const steps = recipeSteps(recipe).length;
  return `
    <button class="recipe-catalogue-card" data-open-recipe="${escapeHtml(recipe.id)}" type="button">
      <span class="recipe-catalogue-visual" aria-hidden="true">${escapeHtml(recipe.name.slice(0, 1).toUpperCase())}</span>
      <span class="recipe-catalogue-body">
        <span class="category-pill">${escapeHtml(recipe.category)}</span>
        <strong>${escapeHtml(recipe.name)}</strong>
        <span>${recipe.ingredients?.length || 0} ingredients · ${steps} steps · Serves ${formatQuantity(Number(recipe.servings || 1))}</span>
      </span>
      <span class="recipe-catalogue-open">View recipe →</span>
    </button>`;
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
    const amount = parsed.quantity ? `${formatQuantity(parsed.quantity)}${parsed.unit ? ` ${parsed.unit}` : ""}` : item;
    return { name: parsed.name, amount };
  }

  const ingredient = state.ingredients[item.key] || item;
  if (!ingredient?.name) return null;
  const quantity = Number(item.quantity || 0);
  const servingCount = recipeItemServingCount(item, ingredient);
  const amount = item.measure === "container"
    ? `${formatQuantity(quantity)} whole container${quantity === 1 ? "" : "s"} (${formatQuantity(servingCount)} servings)`
    : item.measure && item.measure !== "serving"
      ? `${formatQuantity(quantity)} ${item.measure} (${formatQuantity(roundTo(servingCount, 3))} servings)`
      : `${formatQuantity(quantity)} x ${ingredient.serving || "serving"}`;
  return {
    name: ingredient.name,
    amount
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
  if (typeof item === "string") return item;
  const ingredient = state.ingredients[item.key] || item;
  const quantity = Number(item.quantity || 0);
  const servingCount = recipeItemServingCount(item, ingredient);
  if (item.measure === "container") {
    return `${formatQuantity(quantity)} whole container${quantity === 1 ? "" : "s"} ${ingredient.name || "Ingredient"} (${formatQuantity(servingCount)} x ${ingredient.serving || "serving"})`;
  }
  if (item.measure && item.measure !== "serving") {
    const base = `${formatQuantity(quantity)} ${item.measure} ${ingredient.name || "Ingredient"}`;
    return `${base} (${formatQuantity(roundTo(servingCount, 3))} servings, ${formatContainers(recipeItemContainerCount(item, ingredient))})`;
  }
  const base = `${formatQuantity(quantity)} x ${ingredient.serving || "serving"} ${ingredient.name || "Ingredient"}`;
  return `${base} (${formatContainers(recipeItemContainerCount(item, ingredient))})`;
}

function formatMacro(value) {
  return Number(value || 0).toFixed(1).replace(/\.0$/, "");
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
    <ul>
      ${[...groceries.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => {
          const text = formatGroceryItem(item);
          const ingredient = findIngredient(item.name);
          const link = ingredient?.url || walmartSearchUrl(item.name);
          const linkLabel = ingredient ? escapeHtml(ingredient.name) : "Search Walmart";
          const perContainer = item.servingsPerContainer || ingredient?.servingsPerContainer;
          const containers = perContainer && item.quantity ? containersForServings(item.quantity, perContainer) : 0;
          return `
            <li>
              <span>${escapeHtml(text)}</span>
              ${containers ? `<span class="grocery-containers">Buy ${Math.ceil(containers)} (needs ${formatContainers(containers)})</span>` : ""}
              <a href="${escapeHtml(link)}" target="_blank" rel="noopener">${linkLabel}</a>
            </li>`;
        })
        .join("")}
    </ul>`;
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
  if (value.includes("/")) {
    const [top, bottom] = value.split("/").map(Number);
    return bottom ? top / bottom : 0;
  }

  return Number(value);
}

function formatGroceryItem(item) {
  if (item.quantity) {
    return `${formatQuantity(item.quantity)} ${item.unit} ${item.name}`.replace(/\s+/g, " ").trim();
  }

  return `${item.name}${item.count > 1 ? ` x${item.count}` : ""}`;
}

function formatQuantity(quantity) {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
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
  document.getElementById("ingredient-options").innerHTML = ingredients
    .map(
      (ingredient) =>
        `<option value="${escapeHtml(ingredient.name)}">${escapeHtml(ingredient.serving)} - ${formatQuantity(
          servingsPerContainer(ingredient)
        )} per container</option>`
    )
    .join("");

  const list = document.getElementById("ingredient-list");
  if (!ingredients.length) {
    list.innerHTML = '<p class="empty-state">Add an ingredient with its serving macros before building a recipe.</p>';
    return;
  }

  list.innerHTML = ingredients
    .map(
      (ingredient) => `
        <article class="mapping-row">
          <div>
            <strong><a href="${escapeHtml(ingredient.url)}" target="_blank" rel="noopener">${escapeHtml(ingredient.name)}</a></strong>
            <span>${escapeHtml(ingredient.serving)} per serving</span>
            <span class="nutrition-only">${nutrients.map((nutrient) => `${nutrientText(nutrient, ingredient[nutrient.key])} ${nutrient.label.toLowerCase()}`).join(" - ")}</span>
            <span>${formatQuantity(servingsPerContainer(ingredient))} servings per container</span>
          </div>
          <div class="mapping-actions">
            <button class="secondary-button" data-edit-ingredient="${escapeHtml(ingredient.key)}" type="button">Edit</button>
            <button class="danger-button" data-delete-ingredient="${escapeHtml(ingredient.key)}" type="button">Delete</button>
          </div>
        </article>`
    )
    .join("");

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

      delete state.ingredients[key];
      saveState();
      renderAll();
      refreshRecipeMacroPreview();
    });
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
  const count = plannedRecipeIds().length;
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
  document.getElementById("recipe-form").addEventListener("submit", (event) => {
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
    const macros = hasManualIngredients && existingRecipe ? nutrientValues(existingRecipe) : macrosForIngredientRows(ingredients);
    const steps = collectRecipeSteps();
    if (!steps.length) {
      setAuthMessage("Add at least one instruction step.");
      return;
    }

    const recipe = {
      id: existingRecipe?.id || crypto.randomUUID(),
      name: document.getElementById("recipe-name").value.trim(),
      category: document.getElementById("recipe-category").value,
      servings: Number(document.getElementById("recipe-servings").value),
      ...macros,
      ingredients,
      steps,
      notes: document.getElementById("recipe-notes").value.trim()
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
    const ingredient = {
      key,
      name,
      serving: readServingInputs(),
      ...readNutrientInputs(),
      servingsPerContainer: servingsPerContainer({
        servingsPerContainer: document.getElementById("ingredient-servings-per-container").value
      }),
      url: document.getElementById("ingredient-url").value.trim()
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
    renderAll();

    authEls.syncStatus.textContent = "Saving";
    setAccountStatus("checking", "Signed in", "Saving to Firebase...");
    const saved = await saveCloudState("Ingredient save failed");
    if (saved) setAuthMessage("Ingredient saved to Firebase.");
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
    <span class="recipe-step-number" aria-hidden="true"></span>
    <label>
      <span class="recipe-step-label">Step</span>
      <textarea class="recipe-step-input" required placeholder="Describe this step...">${escapeHtml(value)}</textarea>
    </label>
    <button class="danger-button" type="button">Remove</button>`;

  row.querySelector("button").addEventListener("click", () => {
    row.remove();
    if (!container.children.length) addRecipeStepRow();
    updateRecipeStepNumbers();
  });
  container.append(row);
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

function addRecipeIngredientRow(item = {}) {
  const container = document.getElementById("recipe-ingredient-rows");
  const row = document.createElement("div");
  row.className = "recipe-ingredient-row";
  const formValue = recipeIngredientFormValue(item);
  row.innerHTML = `
    <label>
      Ingredient
      <input class="recipe-ingredient-search" list="ingredient-options" required placeholder="Search ingredients" value="${escapeHtml(formValue.name)}" />
    </label>
    <label>
      Quantity
      <input class="recipe-ingredient-quantity" min="0.0001" required step="any" type="number" value="${formValue.quantity}" />
    </label>
    <label>
      Unit
      <select class="recipe-ingredient-measure" data-initial-measure="${escapeHtml(formValue.measure)}"></select>
    </label>
    <span class="recipe-ingredient-serving">Choose an ingredient</span>
    <button class="danger-button" type="button">Remove</button>`;

  const search = row.querySelector(".recipe-ingredient-search");
  const quantity = row.querySelector(".recipe-ingredient-quantity");
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
    if (measure.value === "container") quantity.value = 1;
    updateRecipeIngredientRow(row);
    refreshRecipeMacroPreview();
  });
  row.querySelector("button").addEventListener("click", () => {
    row.remove();
    refreshRecipeMacroPreview();
  });
  container.append(row);
  updateRecipeIngredientRow(row);
  refreshRecipeMacroPreview();
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
  const quantity = Number(row.querySelector(".recipe-ingredient-quantity").value || 0);
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
    const quantity = Number(row.querySelector(".recipe-ingredient-quantity").value);
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
  const match = text.match(/^(\d*\.?\d+(?:\s*\/\s*\d*\.?\d+)?)\s*(.*)$/);
  if (!match) return { amount: 1, unit: text || "serving" };
  const [numerator, denominator] = match[1].split("/").map((part) => Number(part.trim()));
  const amount = denominator ? numerator / denominator : numerator;
  return { amount: roundTo(amount, 2), unit: match[2].trim() || "serving" };
}

function readServingInputs() {
  const amount = Number(document.getElementById("ingredient-serving-amount").value || 0);
  const select = document.getElementById("ingredient-serving-unit");
  const unit =
    select.value === customServingUnit
      ? document.getElementById("ingredient-serving-unit-other").value.trim()
      : select.value;
  return `${formatQuantity(amount)} ${unit}`.trim();
}

function setServingInputs(serving) {
  const { amount, unit } = parseServing(serving);
  document.getElementById("ingredient-serving-amount").value = amount;
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
    document.getElementById(nutrientInputId(nutrient)).value = Number(ingredient[nutrient.key] || 0);
  });
  document.getElementById("ingredient-servings-per-container").value = servingsPerContainer(ingredient);
  document.getElementById("ingredient-url").value = ingredient.url;
  document.getElementById("ingredient-name").focus();
}

function resetIngredientMacroInputs() {
  nutrients.forEach((nutrient) => {
    document.getElementById(nutrientInputId(nutrient)).value = 0;
  });
  document.getElementById("ingredient-servings-per-container").value = 1;
  setServingInputs("1 g");
}

function nutrientInputId(nutrient) {
  return `ingredient-${nutrient.key}`;
}

function readNutrientInputs() {
  return Object.fromEntries(
    nutrients.map((nutrient) => [nutrient.key, Number(document.getElementById(nutrientInputId(nutrient)).value)])
  );
}

function getGroceryTexts() {
  return [...document.querySelectorAll("#grocery-list li span")].map((item) => item.textContent);
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

  if (!file.type.startsWith("image/")) {
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

function resizeImageToDataUrl(file, size) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("the file could not be read"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("the file is not a readable image"));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
    "#clear-week",
    "#recipe-form input",
    "#recipe-form select",
    "#recipe-form textarea",
    "#recipe-form button",
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
setupAuth();
renderAll();
initializeCloud();
