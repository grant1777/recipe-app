const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const meals = ["Breakfast", "Lunch", "Dinner", "Snack"];
const storageKey = "household-recipe-planner-v2";
const legacyStorageKey = "household-recipe-planner";
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
  signedOut: document.getElementById("signed-out-panel"),
  signedIn: document.getElementById("signed-in-panel"),
  email: document.getElementById("auth-email"),
  password: document.getElementById("auth-password"),
  accountEmail: document.getElementById("account-email"),
  message: document.getElementById("auth-message"),
  syncStatus: document.getElementById("sync-status")
};

let selectedWeekStart = getWeekStart(new Date());
let state = loadLocalState();
let cloud = null;
let saveTimer = null;

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

function loadLocalState() {
  const saved = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
  if (!saved) return createInitialState();

  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return createInitialState();
  }
}

async function initializeCloud() {
  if (!firebaseConfig) {
    setAuthMessage("Local mode. Add Firebase config to enable household logins.");
    return;
  }

  try {
    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    const app = appModule.initializeApp(firebaseConfig);
    const auth = authModule.getAuth(app);
    const db = firestoreModule.getFirestore(app);

    cloud = {
      auth,
      db,
      doc: firestoreModule.doc,
      getDoc: firestoreModule.getDoc,
      setDoc: firestoreModule.setDoc,
      onAuthStateChanged: authModule.onAuthStateChanged,
      signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
      createUserWithEmailAndPassword: authModule.createUserWithEmailAndPassword,
      GithubAuthProvider: authModule.GithubAuthProvider,
      getRedirectResult: authModule.getRedirectResult,
      signInWithRedirect: authModule.signInWithRedirect,
      signOut: authModule.signOut
    };

    cloud.onAuthStateChanged(auth, handleAuthChange);
    checkGitHubRedirectResult();
    setAuthMessage("Firebase ready.");
  } catch (error) {
    setAuthMessage(`Firebase did not load: ${error.message}`);
  }
}

async function handleAuthChange(user) {
  if (!user) {
    authEls.signedOut.hidden = false;
    authEls.signedIn.hidden = true;
    authEls.syncStatus.textContent = "Local";
    renderAll();
    return;
  }

  authEls.signedOut.hidden = true;
  authEls.signedIn.hidden = false;
  authEls.accountEmail.textContent = user.email || user.displayName || "GitHub account";
  authEls.syncStatus.textContent = "Loading";

  const ref = cloud.doc(cloud.db, "users", user.uid);
  try {
    const localState = normalizeState(state);
    const snapshot = await cloud.getDoc(ref);
    if (snapshot.exists()) {
      state = mergeCloudAndLocalState(snapshot.data(), localState);
      await cloud.setDoc(ref, state);
    } else {
      await cloud.setDoc(ref, state);
    }

    saveLocalState();
    authEls.syncStatus.textContent = "Synced";
    setAuthMessage("Signed in. Local data synced to Firebase.");
  } catch (error) {
    authEls.syncStatus.textContent = "Sync error";
    setAuthMessage(`Firestore sync failed: ${error.message}`);
  }

  renderAll();
}

function saveState() {
  saveLocalState();
  if (!cloud?.auth.currentUser) return;

  clearTimeout(saveTimer);
  authEls.syncStatus.textContent = "Saving";
  saveTimer = setTimeout(() => {
    saveCloudState("Firestore save failed");
  }, 350);
}

async function saveCloudState(errorPrefix = "Firestore save failed") {
  if (!cloud?.auth.currentUser) return false;

  try {
    const ref = cloud.doc(cloud.db, "users", cloud.auth.currentUser.uid);
    await cloud.setDoc(ref, state);
    authEls.syncStatus.textContent = "Synced";
    return true;
  } catch (error) {
    authEls.syncStatus.textContent = "Sync error";
    setAuthMessage(`${errorPrefix}: ${error.message}`);
    return false;
  }
}

function mergeCloudAndLocalState(cloudData, localData) {
  const cloudState = normalizeState(cloudData);
  const localState = normalizeState(localData);
  const recipesById = new Map();

  [...cloudState.recipes, ...localState.recipes].forEach((recipe) => {
    if (recipe?.id) recipesById.set(recipe.id, recipe);
  });

  return {
    recipes: [...recipesById.values()],
    plans: {
      ...cloudState.plans,
      ...localState.plans
    },
    mappings: {
      ...cloudState.mappings,
      ...localState.mappings
    }
  };
}

function saveLocalState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
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
}

function setupForms() {
  document.getElementById("recipe-form").addEventListener("submit", (event) => {
    event.preventDefault();
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
    const ingredient = document.getElementById("mapping-ingredient").value.trim();
    const product = document.getElementById("mapping-product").value.trim();
    const url = document.getElementById("mapping-url").value.trim();
    const key = mappingKey(ingredient);

    state.mappings[key] = { key, ingredient, product, url };
    event.target.reset();
    saveLocalState();
    renderAll();

    if (!cloud?.auth.currentUser) {
      setAuthMessage("Mapping saved locally. Sign in to sync it to Firebase.");
      return;
    }

    clearTimeout(saveTimer);
    authEls.syncStatus.textContent = "Saving";
    const saved = await saveCloudState("Mapping save failed");
    if (saved) setAuthMessage("Mapping saved to Firebase.");
  });

  document.getElementById("clear-week").addEventListener("click", () => {
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
  document.getElementById("sign-in").addEventListener("click", () => authenticate("signIn"));
  document.getElementById("sign-up").addEventListener("click", () => authenticate("signUp"));
  document.getElementById("sign-in-github").addEventListener("click", authenticateWithGitHub);
  document.getElementById("sign-out").addEventListener("click", async () => {
    if (!cloud) return;
    await cloud.signOut(cloud.auth);
    setAuthMessage("Signed out. Local changes stay on this device.");
  });
}

async function authenticate(mode) {
  if (!cloud) {
    setAuthMessage("Add Firebase config before using logins.");
    return;
  }

  const email = authEls.email.value.trim();
  const password = authEls.password.value;
  if (!email || !password) {
    setAuthMessage("Enter an email and password.");
    return;
  }

  try {
    if (mode === "signUp") {
      await cloud.createUserWithEmailAndPassword(cloud.auth, email, password);
      setAuthMessage("Account created.");
    } else {
      await cloud.signInWithEmailAndPassword(cloud.auth, email, password);
      setAuthMessage("Signed in.");
    }
  } catch (error) {
    setAuthMessage(error.message);
  }
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
    const provider = new cloud.GithubAuthProvider();
    await cloud.signInWithRedirect(cloud.auth, provider);
  } catch (error) {
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
    return "The GitHub sign-in popup closed before it finished.";
  }

  return error.message;
}

function changeWeek(daysToMove) {
  selectedWeekStart = addDays(selectedWeekStart, daysToMove);
  getCurrentPlan();
  saveLocalState();
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
