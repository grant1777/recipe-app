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

const authEls = {
  appShell: document.getElementById("app-shell"),
  signedOut: document.getElementById("signed-out-panel"),
  householdPanel: document.getElementById("household-panel"),
  householdAccount: document.getElementById("household-account"),
  householdMessage: document.getElementById("household-message"),
  householdCode: document.getElementById("household-code"),
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

function blankPlan() {
  return Object.fromEntries(days.map((day) => [day, Object.fromEntries(meals.map((meal) => [meal, ""]))]));
}

function createInitialState() {
  return {
    recipes: starterRecipes,
    mappings: {},
    plans: {
      [dateKey(selectedWeekStart)]: blankPlan()
    }
  };
}

function createSignedOutState() {
  return {
    recipes: [],
    mappings: {},
    plans: {
      [dateKey(selectedWeekStart)]: blankPlan()
    }
  };
}

function normalizeState(value) {
  const normalized = {
    recipes: Array.isArray(value?.recipes) ? value.recipes : starterRecipes,
    plans: value?.plans && typeof value.plans === "object" ? value.plans : {},
    mappings: value?.mappings && typeof value.mappings === "object" ? value.mappings : {}
  };

  if (value?.plan && !Object.keys(normalized.plans).length) {
    normalized.plans[dateKey(selectedWeekStart)] = value.plan;
  }

  if (!Object.keys(normalized.plans).length) {
    normalized.plans[dateKey(selectedWeekStart)] = blankPlan();
  }

  return normalized;
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

  const ref = cloud.doc(cloud.db, "households", householdId);
  unsubscribeCloudState = cloud.onSnapshot(ref, { includeMetadataChanges: true }, (snapshot) => {
    if (!snapshot.exists()) {
      handleSyncError("The shared household no longer exists", new Error("Ask the household owner for a new invite."));
      return;
    }

    const household = snapshot.data();
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
    .map(
      (recipe) => `
        <article class="recipe-card">
          <header>
            <div>
              <h3>${escapeHtml(recipe.name)}</h3>
              <span class="category-pill">${escapeHtml(recipe.category)}</span>
            </div>
            <button class="danger-button" data-delete="${recipe.id}" type="button">Delete</button>
          </header>
          <div class="macro-row">
            ${macroChip("Cal", recipe.calories)}
            ${macroChip("Protein", `${recipe.protein}g`)}
            ${macroChip("Carbs", `${recipe.carbs}g`)}
            ${macroChip("Fat", `${recipe.fat}g`)}
          </div>
          <ul class="ingredients">
            ${recipe.ingredients.map((ingredient) => `<li>${escapeHtml(ingredient)}</li>`).join("")}
          </ul>
          ${recipe.notes ? `<p class="empty-state">${escapeHtml(recipe.notes)}</p>` : ""}
        </article>`
    )
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

function renderGroceries() {
  const groceries = new Map();
  plannedRecipes().forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const parsed = parseIngredient(ingredient);
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
          const mapping = findMapping(item.name);
          const link = mapping?.url || walmartSearchUrl(item.name);
          const linkLabel = mapping ? escapeHtml(mapping.product) : "Search Walmart";
          return `
            <li>
              <span>${escapeHtml(text)}</span>
              <a href="${escapeHtml(link)}" target="_blank" rel="noopener">${linkLabel}</a>
            </li>`;
        })
        .join("")}
    </ul>`;
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
  const totals = plannedRecipes().reduce(
    (sum, recipe) => ({
      calories: sum.calories + Number(recipe.calories || 0),
      protein: sum.protein + Number(recipe.protein || 0),
      carbs: sum.carbs + Number(recipe.carbs || 0),
      fat: sum.fat + Number(recipe.fat || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  document.getElementById("macro-dashboard").innerHTML = [
    macroCard("Calories", totals.calories),
    macroCard("Protein", `${totals.protein}g`),
    macroCard("Carbs", `${totals.carbs}g`),
    macroCard("Fat", `${totals.fat}g`)
  ].join("");
}

function renderWalmartMappings() {
  renderUnmappedIngredients();
  renderSavedMappings();
}

function renderUnmappedIngredients() {
  const list = document.getElementById("unmapped-list");
  const ingredients = [...new Set(plannedRecipes().flatMap((recipe) => recipe.ingredients.map((item) => parseIngredient(item)?.name).filter(Boolean)))]
    .filter((name) => !findMapping(name))
    .sort((a, b) => a.localeCompare(b));

  if (!ingredients.length) {
    list.innerHTML = '<p class="empty-state">All planned grocery items have mappings, or this week has no planned meals.</p>';
    return;
  }

  list.innerHTML = ingredients
    .map(
      (name) => `
        <article class="mapping-row">
          <span>${escapeHtml(name)}</span>
          <button class="secondary-button" data-fill-mapping="${escapeHtml(name)}" type="button">Map</button>
        </article>`
    )
    .join("");

  list.querySelectorAll("[data-fill-mapping]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.fillMapping;
      document.getElementById("mapping-ingredient").value = name;
      document.getElementById("mapping-product").focus();
    });
  });
}

function renderSavedMappings() {
  const list = document.getElementById("mapping-list");
  const mappings = Object.values(state.mappings || {}).sort((a, b) => a.ingredient.localeCompare(b.ingredient));

  if (!mappings.length) {
    list.innerHTML = '<p class="empty-state">No Walmart product mappings saved yet.</p>';
    return;
  }

  list.innerHTML = mappings
    .map(
      (mapping) => `
        <article class="mapping-row">
          <div>
            <strong>${escapeHtml(mapping.ingredient)}</strong>
            <a href="${escapeHtml(mapping.url)}" target="_blank" rel="noopener">${escapeHtml(mapping.product)}</a>
          </div>
          <button class="danger-button" data-delete-mapping="${escapeHtml(mapping.key)}" type="button">Delete</button>
        </article>`
    )
    .join("");

  list.querySelectorAll("[data-delete-mapping]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!requireCloudWrite()) return;
      delete state.mappings[button.dataset.deleteMapping];
      saveState();
      renderAll();
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
  renderWalmartMappings();
  renderMacros();
  renderPlannedCount();
  updateDataControls();
}

function setupForms() {
  document.getElementById("recipe-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireCloudWrite()) return;
    const ingredients = document
      .getElementById("recipe-ingredients")
      .value.split("\n")
      .map((ingredient) => ingredient.trim())
      .filter(Boolean);

    state.recipes.push({
      id: crypto.randomUUID(),
      name: document.getElementById("recipe-name").value.trim(),
      category: document.getElementById("recipe-category").value,
      servings: Number(document.getElementById("recipe-servings").value),
      calories: Number(document.getElementById("recipe-calories").value),
      protein: Number(document.getElementById("recipe-protein").value),
      carbs: Number(document.getElementById("recipe-carbs").value),
      fat: Number(document.getElementById("recipe-fat").value),
      ingredients,
      notes: document.getElementById("recipe-notes").value.trim()
    });

    event.target.reset();
    document.getElementById("recipe-servings").value = 4;
    saveState();
    renderAll();
  });

  document.getElementById("category-filter").addEventListener("change", renderRecipes);

  document.getElementById("walmart-map-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!requireCloudWrite()) return;
    const ingredient = document.getElementById("mapping-ingredient").value.trim();
    const product = document.getElementById("mapping-product").value.trim();
    const url = document.getElementById("mapping-url").value.trim();
    const key = mappingKey(ingredient);

    state.mappings[key] = { key, ingredient, product, url };
    event.target.reset();
    renderAll();

    authEls.syncStatus.textContent = "Saving";
    setAccountStatus("checking", "Signed in", "Saving to Firebase...");
    const saved = await saveCloudState("Mapping save failed");
    if (saved) setAuthMessage("Mapping saved to Firebase.");
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

    await cloud.setDoc(householdRef, {
      ...existingState,
      ownerUid: user.uid,
      inviteToken
    });
    await cloud.setDoc(memberRef, memberRecord(user, inviteToken));
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
    await cloud.setDoc(memberRef, memberRecord(user, inviteToken));
    await cloud.setDoc(userRef, { householdId }, { merge: true });
    event.target.reset();
    subscribeToHousehold(householdId);
  } catch (error) {
    setHouseholdControlsDisabled(false);
    setHouseholdMessage(error.code === "permission-denied" ? "That invite code was rejected. Ask the household owner to copy it again." : `Could not join household: ${error.message}`);
  }
}

function memberRecord(user, inviteToken) {
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "GitHub account",
    inviteToken
  };
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
    "#walmart-map-form input",
    "#walmart-map-form button",
    "[data-delete]",
    "[data-delete-mapping]",
    "[data-fill-mapping]"
  ];

  document.querySelectorAll(selectors.join(",")).forEach((element) => {
    element.disabled = disabled;
  });
}

function findMapping(ingredientName) {
  return state.mappings?.[mappingKey(ingredientName)];
}

function mappingKey(value) {
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
