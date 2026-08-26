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

const authEls = {
  appShell: document.getElementById("app-shell"),
  signedOut: document.getElementById("signed-out-panel"),
  householdPanel: document.getElementById("household-panel"),
  householdAccount: document.getElementById("household-account"),
  householdMessage: document.getElementById("household-message"),
  householdCode: document.getElementById("household-code"),
  householdMembersList: document.getElementById("household-members-list"),
  householdMemberCount: document.getElementById("household-member-count"),
  profileDialog: document.getElementById("profile-dialog"),
  profileAvatar: document.getElementById("profile-avatar"),
  profileName: document.getElementById("profile-name"),
  profilePhoto: document.getElementById("profile-photo"),
  profileMessage: document.getElementById("profile-message"),
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

function blankPlan() {
  return Object.fromEntries(days.map((day) => [day, Object.fromEntries(meals.map((meal) => [meal, ""]))]));
}

function createInitialState() {
  return {
    recipes: starterRecipes,
    ingredients: {},
    plans: {
      [dateKey(selectedWeekStart)]: blankPlan()
    }
  };
}

function createSignedOutState() {
  return {
    recipes: [],
    ingredients: {},
    plans: {
      [dateKey(selectedWeekStart)]: blankPlan()
    }
  };
}

function normalizeState(value) {
  const ingredientSource = value?.ingredients && typeof value.ingredients === "object" ? value.ingredients : value?.mappings;
  const normalized = {
    recipes: Array.isArray(value?.recipes) ? value.recipes : starterRecipes,
    plans: value?.plans && typeof value.plans === "object" ? value.plans : {},
    ingredients: normalizeIngredientCatalog(ingredientSource)
  };

  if (value?.plan && !Object.keys(normalized.plans).length) {
    normalized.plans[dateKey(selectedWeekStart)] = value.plan;
  }

  if (!Object.keys(normalized.plans).length) {
    normalized.plans[dateKey(selectedWeekStart)] = blankPlan();
  }

  return normalized;
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
          product: item.product || name,
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

function getCurrentPlan() {
  const key = dateKey(selectedWeekStart);
  if (!state.plans[key]) state.plans[key] = blankPlan();
  return state.plans[key];
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
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`${button.dataset.tab}-view`).classList.add("active");
    });
  });
}

function renderPlanner() {
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
    select.addEventListener("change", () => {
      if (!requireCloudWrite()) {
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

function renderRecipes() {
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
    .map((recipe) => {
      const macros = recipeMacros(recipe);
      const containers = recipeContainers(recipe);
      return `
        <article class="recipe-card">
          <header>
            <div>
              <h3>${escapeHtml(recipe.name)}</h3>
              <span class="category-pill">${escapeHtml(recipe.category)}</span>
            </div>
            <button class="danger-button" data-delete="${recipe.id}" type="button">Delete</button>
          </header>
          <div class="macro-row">
            ${nutrientChips(macros)}
            ${catalogItems(recipe).length ? macroChip("Containers", formatQuantity(roundTo(containers, 2))) : ""}
          </div>
          <ul class="ingredients">
            ${recipe.ingredients.map((ingredient) => `<li>${escapeHtml(recipeIngredientText(ingredient))}</li>`).join("")}
          </ul>
          ${recipe.notes ? `<p class="empty-state">${escapeHtml(recipe.notes)}</p>` : ""}
        </article>`;
    })
    .join("");

  list.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!requireCloudWrite()) return;
      const id = button.dataset.delete;
      state.recipes = state.recipes.filter((recipe) => recipe.id !== id);
      Object.values(state.plans).forEach((plan) => {
        days.forEach((day) => {
          meals.forEach((meal) => {
            if (plan[day][meal] === id) plan[day][meal] = "";
          });
        });
      });
      saveState();
      renderAll();
    });
  });
}

function macroChip(label, value) {
  return `<div class="macro-chip"><span>${label}</span><strong>${value}</strong></div>`;
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
  return nutrients.map((nutrient) => macroChip(nutrient[labelKey], nutrientText(nutrient, totals[nutrient.key]))).join("");
}

function servingsPerContainer(source) {
  const value = Number(source?.servingsPerContainer || 0);
  return value > 0 ? value : 1;
}

function containersForServings(quantity, perContainer) {
  const value = Number(perContainer || 0);
  return Number(quantity || 0) / (value > 0 ? value : 1);
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
    return addNutrients(totals, ingredient, Number(item.quantity || 0));
  }, emptyNutrients());
}

function catalogItems(recipe) {
  return recipe.ingredients?.filter((item) => item && typeof item === "object") || [];
}

function recipeContainers(recipe) {
  return catalogItems(recipe).reduce((total, item) => {
    const ingredient = state.ingredients[item.key] || item;
    return total + containersForServings(item.quantity, ingredient.servingsPerContainer);
  }, 0);
}

function recipeIngredientText(item) {
  if (typeof item === "string") return item;
  const ingredient = state.ingredients[item.key] || item;
  const base = `${formatQuantity(Number(item.quantity || 0))} x ${ingredient.serving || "serving"} ${ingredient.name || "Ingredient"}`;
  return `${base} (${formatContainers(containersForServings(item.quantity, ingredient.servingsPerContainer))})`;
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
          const linkLabel = ingredient ? escapeHtml(ingredient.product) : "Search Walmart";
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
    quantity: Number(item.quantity || 0),
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
    ...nutrients.map((nutrient) => macroCard(nutrient.label, nutrientText(nutrient, totals[nutrient.key]))),
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
            <strong>${escapeHtml(ingredient.name)} - ${escapeHtml(ingredient.serving)}</strong>
            <span>${nutrients.map((nutrient) => `${nutrientText(nutrient, ingredient[nutrient.key])} ${nutrient.label.toLowerCase()}`).join(" - ")}</span>
            <span>${formatQuantity(servingsPerContainer(ingredient))} servings per container</span>
            <a href="${escapeHtml(ingredient.url)}" target="_blank" rel="noopener">${escapeHtml(ingredient.product)}</a>
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

function macroCard(label, value) {
  return `<article class="macro-card"><span>${label}</span><strong>${value}</strong></article>`;
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
  renderPlanner();
  renderRecipes();
  renderGroceries();
  renderIngredients();
  renderMacros();
  renderPlannedCount();
  refreshRecipeIngredientRows();
  updateDataControls();
}

function setupForms() {
  document.getElementById("recipe-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireCloudWrite()) return;
    const ingredients = collectRecipeIngredients();
    if (!ingredients?.length) {
      setAuthMessage("Choose at least one ingredient from the ingredient index.");
      return;
    }

    const macros = macrosForIngredientRows(ingredients);

    state.recipes.push({
      id: crypto.randomUUID(),
      name: document.getElementById("recipe-name").value.trim(),
      category: document.getElementById("recipe-category").value,
      servings: Number(document.getElementById("recipe-servings").value),
      ...macros,
      ingredients,
      notes: document.getElementById("recipe-notes").value.trim()
    });

    event.target.reset();
    document.getElementById("recipe-servings").value = 4;
    document.getElementById("recipe-ingredient-rows").innerHTML = "";
    addRecipeIngredientRow();
    saveState();
    renderAll();
  });

  document.getElementById("category-filter").addEventListener("change", renderRecipes);
  document.getElementById("add-recipe-ingredient").addEventListener("click", () => addRecipeIngredientRow());

  document.getElementById("ingredient-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!requireCloudWrite()) return;
    const name = document.getElementById("ingredient-name").value.trim();
    const key = ingredientKey(name);
    const previousKey = event.target.dataset.editingKey;
    const ingredient = {
      key,
      name,
      serving: document.getElementById("ingredient-serving").value.trim(),
      ...readNutrientInputs(),
      servingsPerContainer: servingsPerContainer({
        servingsPerContainer: document.getElementById("ingredient-servings-per-container").value
      }),
      product: document.getElementById("ingredient-product").value.trim(),
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
    state.plans[dateKey(selectedWeekStart)] = blankPlan();
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
}

function addRecipeIngredientRow(item = {}) {
  const container = document.getElementById("recipe-ingredient-rows");
  const row = document.createElement("div");
  row.className = "recipe-ingredient-row";
  const ingredient = state.ingredients[item.key] || item;
  row.innerHTML = `
    <label>
      Ingredient
      <input class="recipe-ingredient-search" list="ingredient-options" required placeholder="Search ingredients" value="${escapeHtml(ingredient.name || "")}" />
    </label>
    <label>
      Quantity
      <input class="recipe-ingredient-quantity" min="0.01" required step="0.25" type="number" value="${Number(item.quantity || 1)}" />
    </label>
    <span class="recipe-ingredient-serving">${ingredient.serving ? `x ${escapeHtml(ingredient.serving)}` : "Choose an ingredient"}</span>
    <button class="danger-button" type="button">Remove</button>`;

  const search = row.querySelector(".recipe-ingredient-search");
  const quantity = row.querySelector(".recipe-ingredient-quantity");
  search.addEventListener("input", () => {
    updateRecipeIngredientRow(row);
    refreshRecipeMacroPreview();
  });
  quantity.addEventListener("input", refreshRecipeMacroPreview);
  row.querySelector("button").addEventListener("click", () => {
    row.remove();
    refreshRecipeMacroPreview();
  });
  container.append(row);
  refreshRecipeMacroPreview();
}

function updateRecipeIngredientRow(row) {
  const name = row.querySelector(".recipe-ingredient-search").value;
  const ingredient = state.ingredients[ingredientKey(name)];
  row.querySelector(".recipe-ingredient-serving").textContent = ingredient ? `x ${ingredient.serving}` : "Choose an indexed ingredient";
}

function collectRecipeIngredients(allowIncomplete = false) {
  const rows = [...document.querySelectorAll(".recipe-ingredient-row")];
  const ingredients = [];

  for (const row of rows) {
    const name = row.querySelector(".recipe-ingredient-search").value.trim();
    const ingredient = state.ingredients[ingredientKey(name)];
    const quantity = Number(row.querySelector(".recipe-ingredient-quantity").value);
    if (!ingredient || quantity <= 0) {
      if (allowIncomplete) continue;
      return null;
    }
    ingredients.push({ key: ingredient.key, quantity });
  }

  return ingredients;
}

function macrosForIngredientRows(items) {
  return items.reduce((totals, item) => {
    const ingredient = state.ingredients[item.key];
    if (!ingredient) return totals;
    return addNutrients(totals, ingredient, item.quantity);
  }, emptyNutrients());
}

function containersForIngredientRows(items) {
  return items.reduce((total, item) => {
    const ingredient = state.ingredients[item.key];
    if (!ingredient) return total;
    return total + containersForServings(item.quantity, ingredient.servingsPerContainer);
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

function fillIngredientForm(ingredient) {
  if (!ingredient) return;
  const form = document.getElementById("ingredient-form");
  form.dataset.editingKey = ingredient.key;
  document.getElementById("ingredient-name").value = ingredient.name;
  document.getElementById("ingredient-serving").value = ingredient.serving;
  nutrients.forEach((nutrient) => {
    document.getElementById(nutrientInputId(nutrient)).value = Number(ingredient[nutrient.key] || 0);
  });
  document.getElementById("ingredient-servings-per-container").value = servingsPerContainer(ingredient);
  document.getElementById("ingredient-product").value = ingredient.product;
  document.getElementById("ingredient-url").value = ingredient.url;
  document.getElementById("ingredient-name").focus();
}

function resetIngredientMacroInputs() {
  nutrients.forEach((nutrient) => {
    document.getElementById(nutrientInputId(nutrient)).value = 0;
  });
  document.getElementById("ingredient-servings-per-container").value = 1;
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
    setAuthMessage("Household invite code copied.");
  });
  document.getElementById("leave-household").addEventListener("click", leaveHousehold);
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
    batch.set(userRef, { householdId: null }, { merge: true });
    batch.delete(memberRef);
    await batch.commit();

    unsubscribeCloudState?.();
    unsubscribeCloudState = null;
    clearHouseholdMembers();
    currentHouseholdId = null;
    currentInviteCode = null;
    cloudDataLoaded = false;
    state = createSignedOutState();
    authEls.householdCode.textContent = "Loading...";
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

      const name = document.createElement("span");
      name.className = "member-name";
      name.textContent = memberName(member) + (member.uid === currentUid ? " (you)" : "");
      item.append(name);

      if (member.email && member.email !== memberName(member)) {
        const email = document.createElement("span");
        email.className = "member-email";
        email.textContent = member.email;
        item.append(email);
      }

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
  return member.displayName || member.email || "Household member";
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
  setProfileMessage("");
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

  const profile = { displayName, photoUrl: profileDraftPhoto || "" };
  setProfileMessage("Saving your profile...");

  try {
    const userRef = cloud.doc(cloud.db, "users", user.uid);
    await cloud.setDoc(userRef, { profile }, { merge: true });

    if (currentHouseholdId) {
      const memberRef = cloud.doc(cloud.db, "households", currentHouseholdId, "members", user.uid);
      await cloud.setDoc(memberRef, profile, { merge: true });
    }

    authEls.accountEmail.textContent = displayName;
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
    "[data-delete]",
    "[data-delete-ingredient]",
    "[data-edit-ingredient]"
  ];

  document.querySelectorAll(selectors.join(",")).forEach((element) => {
    element.disabled = disabled;
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
