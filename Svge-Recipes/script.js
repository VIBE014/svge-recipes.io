  // --------------------------------------------------------------
  //  CONFIGURATION: Edamam API keys (free tier) - replace with your own keys for production
  //  Get your keys at: https://developer.edamam.com/edamam-docs-recipe-api
  //  The app works with TheMealDB for recipes; nutrition calls need valid keys.
  //  If keys not provided, fallback message will be shown with instructions.
  // --------------------------------------------------------------
  const EDAMAM_APP_ID = "aaa5395c";      // <-- Replace with your Edamam App ID
  const EDAMAM_APP_KEY = "235c8815354cf07dd1eef249f1e7d8fb";    // <-- Replace with your Edamam App Key
  // For demo convenience, if keys are unchanged, nutrition will show demo note
 const HAS_VALID_KEYS = (EDAMAM_APP_ID !== "YOUR_APP_ID" && EDAMAM_APP_KEY !== "YOUR_APP_KEY");
 
  // ------------------- TheMealDB endpoints ----------------------
  const MEALDB_API = "https://www.themealdb.com/api/json/v1/1";
  
  // Global state
  let currentRecipes = [];           // stores full recipe objects from last search/filter
  let favorites = [];                // array of recipe objects { idMeal, strMeal, strMealThumb, strCategory }
  let mealPlan = {                   // key: monday, tuesday ... sunday, each holds array of recipe briefs
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
  };
  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayDisplay = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

  // Load data from localStorage
  function loadStorage() {
    const storedFav = localStorage.getItem("svge_recipes_favorites");
    if(storedFav) favorites = JSON.parse(storedFav);
    const storedPlan = localStorage.getItem("svge_meal_plan");
    if(storedPlan) mealPlan = JSON.parse(storedPlan);
    else initEmptyMealPlan();
    renderFavorites();
    renderMealPlanner();
  }
  function initEmptyMealPlan() {
    daysOrder.forEach(day => { if(!mealPlan[day]) mealPlan[day] = []; });
  }
  function saveFavorites() { localStorage.setItem("svge_recipes_favorites", JSON.stringify(favorites)); }
  function saveMealPlan() { localStorage.setItem("svge_meal_plan", JSON.stringify(mealPlan)); }

  // Helper: add/remove favorite
  function toggleFavorite(recipe) {
    const exists = favorites.some(fav => fav.idMeal === recipe.idMeal);
    if(exists) {
      favorites = favorites.filter(fav => fav.idMeal !== recipe.idMeal);
    } else {
      favorites.push({ idMeal: recipe.idMeal, strMeal: recipe.strMeal, strMealThumb: recipe.strMealThumb, strCategory: recipe.strCategory || 'Misc' });
    }
    saveFavorites();
    renderFavorites();
    renderRecipesGrid(currentRecipes); // refresh hearts
  }
  function isFavorite(idMeal) { return favorites.some(fav => fav.idMeal === idMeal); }

  // Add recipe to meal plan (specific day)
  function addToMealPlan(recipe, dayKey) {
    if(!mealPlan[dayKey]) mealPlan[dayKey] = [];
    // avoid duplicate meal entry in same day (by id)
    const already = mealPlan[dayKey].some(item => item.idMeal === recipe.idMeal);
    if(!already) {
      mealPlan[dayKey].push({ idMeal: recipe.idMeal, strMeal: recipe.strMeal, strMealThumb: recipe.strMealThumb });
      saveMealPlan();
      renderMealPlanner();
    } else {
      alert("Recipe already in this day's meal plan!");
    }
  }
  function removeFromMealPlan(dayKey, index) {
    mealPlan[dayKey].splice(index, 1);
    saveMealPlan();
    renderMealPlanner();
  }
  function renderMealPlanner() {
    const container = document.getElementById("mealPlanContainer");
    if(!container) return;
    container.innerHTML = "";
    for(let day of daysOrder) {
      const meals = mealPlan[day] || [];
      const dayDiv = document.createElement("div");
      dayDiv.className = "meal-day";
      dayDiv.innerHTML = `
        <div class="day-header">
          <span>📌 ${dayDisplay[day]} (${day})</span>
          <button class="add-meal-btn" data-day="${day}">+ Add recipe</button>
        </div>
        <div class="day-recipes" id="day-${day}"></div>
      `;
      const recipesContainer = dayDiv.querySelector(`.day-recipes`);
      if(meals.length === 0) {
        recipesContainer.innerHTML = `<div class="empty-day">✨ No meals planned. Click + to add</div>`;
      } else {
        meals.forEach((meal, idx) => {
          const mealItem = document.createElement("div");
          mealItem.className = "meal-item";
          mealItem.innerHTML = `
            <span>🍲 ${meal.strMeal.substring(0, 35)}</span>
            <button class="remove-btn" data-day="${day}" data-index="${idx}" title="remove">✖</button>
          `;
          recipesContainer.appendChild(mealItem);
        });
      }
      container.appendChild(dayDiv);
      // attach event listeners
      const addBtn = dayDiv.querySelector(".add-meal-btn");
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openAddToDayModal(day);
      });
      const removeBtns = dayDiv.querySelectorAll(".remove-btn");
      removeBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
          const d = btn.dataset.day;
          const idx = parseInt(btn.dataset.index);
          removeFromMealPlan(d, idx);
        });
      });
    }
  }
  // helper to choose recipe from favorites or current recipes
  function openAddToDayModal(dayKey) {
    // combine favorites + current recipes to pick from
    let available = [...favorites];
    for(let r of currentRecipes) {
      if(!available.some(a => a.idMeal === r.idMeal)) available.push({ idMeal: r.idMeal, strMeal: r.strMeal, strMealThumb: r.strMealThumb, strCategory: r.strCategory });
    }
    if(available.length === 0) { alert("No recipes available. Search or favorite some first!"); return; }
    // simple select via prompt
    let listStr = available.map((r,idx) => `${idx+1}. ${r.strMeal}`).join("\n");
    let choice = prompt(`Select recipe number to add to ${dayDisplay[dayKey]}:\n${listStr}`);
    if(choice) {
      let idx = parseInt(choice) - 1;
      if(!isNaN(idx) && available[idx]) {
        addToMealPlan(available[idx], dayKey);
      } else alert("Invalid selection");
    }
  }

  // Render favorites list
  function renderFavorites() {
    const container = document.getElementById("favoritesContainer");
    if(!container) return;
    if(favorites.length === 0) {
      container.innerHTML = "❤️ No favorites yet. Tap heart icon on any recipe.";
      return;
    }
    container.innerHTML = "";
    favorites.forEach(fav => {
      const div = document.createElement("div");
      div.className = "fav-item";
      div.innerHTML = `
        <span>🍴 ${fav.strMeal.substring(0, 40)}</span>
        <button class="remove-btn" data-id="${fav.idMeal}">🗑️</button>
      `;
      container.appendChild(div);
      div.querySelector(".remove-btn").addEventListener("click", () => {
        favorites = favorites.filter(f => f.idMeal !== fav.idMeal);
        saveFavorites();
        renderFavorites();
        renderRecipesGrid(currentRecipes); // refresh heart states
      });
    });
  }

  // render recipe grid
  function renderRecipesGrid(recipes) {
    const grid = document.getElementById("recipesGrid");
    if(!grid) return;
    if(!recipes.length) {
      grid.innerHTML = `<div style="grid-column:1/-1; text-align:center;">😋 No recipes found. Try another search!</div>`;
      return;
    }
    grid.innerHTML = "";
    recipes.forEach(recipe => {
      const card = document.createElement("div");
      card.className = "recipe-card";
      const favActive = isFavorite(recipe.idMeal);
      card.innerHTML = `
        <img class="recipe-img" src="${recipe.strMealThumb}" alt="${recipe.strMeal}" loading="lazy">
        <div class="recipe-info">
          <div class="recipe-title">
            <span>${recipe.strMeal.substring(0, 40)}</span>
            <button class="fav-btn ${favActive ? 'active' : ''}" data-id="${recipe.idMeal}">${favActive ? '❤️' : '🤍'}</button>
          </div>
          <div class="recipe-category">${recipe.strCategory || 'Various'}</div>
          <div class="card-actions">
            <button class="btn-sm nutrition-btn" data-id="${recipe.idMeal}">🥗 Nutrition</button>
            <button class="btn-sm primary plan-btn" data-id="${recipe.idMeal}">📅 +Plan</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
      // favorite event
      card.querySelector(".fav-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(recipe);
      });
      // nutrition event
      card.querySelector(".nutrition-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        fetchRecipeDetailsAndNutrition(recipe.idMeal);
      });
      // plan event
      card.querySelector(".plan-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        openDaySelector(recipe);
      });
      // card click to show nutrition too (optional)
      card.addEventListener("click", () => fetchRecipeDetailsAndNutrition(recipe.idMeal));
    });
  }

  function openDaySelector(recipe) {
    let daysList = daysOrder.map(d => dayDisplay[d]).join(", ");
    let dayInput = prompt(`Add "${recipe.strMeal}" to which day?\nType day (monday, tuesday, ... sunday)`, "monday");
    if(dayInput) {
      let targetDay = dayInput.trim().toLowerCase();
      if(daysOrder.includes(targetDay)) {
        addToMealPlan(recipe, targetDay);
      } else alert(`Invalid day. Use: ${daysOrder.join(", ")}`);
    }
  }

  // Nutrition using Edamam (ingredients from TheMealDB lookup)
  async function fetchRecipeDetailsAndNutrition(mealId) {
    const modal = document.getElementById("nutritionModal");
    const modalTitle = document.getElementById("modalRecipeTitle");
    const nutritionDiv = document.getElementById("nutritionInfo");
    modal.style.display = "flex";
    modalTitle.innerText = "Loading recipe...";
    nutritionDiv.innerHTML = "<div class='loading-nutrition'>🔍 Gathering ingredients & nutrition data...</div>";
    
    try {
      // fetch full recipe by ID
      const res = await fetch(`${MEALDB_API}/lookup.php?i=${mealId}`);
      const data = await res.json();
      if(!data.meals || data.meals.length === 0) throw new Error("Recipe not found");
      const recipe = data.meals[0];
      modalTitle.innerText = recipe.strMeal;
      // extract ingredients list with measures
      let ingredientsList = [];
      for(let i=1; i<=20; i++) {
        let ing = recipe[`strIngredient${i}`];
        let measure = recipe[`strMeasure${i}`];
        if(ing && ing.trim() !== "") {
          let full = `${measure ? measure : ''} ${ing}`.trim();
          ingredientsList.push(full);
        }
      }
      if(ingredientsList.length === 0) throw new Error("No ingredients found");
      // combine into string for Edamam
      const ingrText = ingredientsList.join(", ");
      if(!HAS_VALID_KEYS) {
        nutritionDiv.innerHTML = `
          <div style="margin-bottom:12px;"><strong>⚠️ Nutrition API demo keys not configured</strong></div>
          <div>Ingredients: ${ingredientsList.slice(0,5).join(", ")}${ingredientsList.length>5 ? "..." : ""}</div>
          <div>🔑 To see real nutritional values, get free Edamam API keys (app_id & app_key) and replace them in the script.</div>
          <div>🍽️ Estimated: This recipe contains fresh ingredients. Check for balanced diet.</div>
        `;
        return;
      }
      // Call Edamam nutrition data endpoint
      const url = `https://api.edamam.com/api/nutrition-data?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}&ingr=${encodeURIComponent(ingrText)}`;
      const nutriRes = await fetch(url);
      if(!nutriRes.ok) throw new Error(`Nutrition API error: ${nutriRes.status}`);
      const nutriData = await nutriRes.json();
      if(nutriData.calories) {
        const totalNutrients = nutriData.totalNutrients || {};
        const protein = totalNutrients.PROCNT ? Math.round(totalNutrients.PROCNT.quantity) : '—';
        const fat = totalNutrients.FAT ? Math.round(totalNutrients.FAT.quantity) : '—';
        const carbs = totalNutrients.CHOCDF ? Math.round(totalNutrients.CHOCDF.quantity) : '—';
        nutritionDiv.innerHTML = `
          <div class="nutrient-row"><strong>🔥 Calories</strong> <span>${Math.round(nutriData.calories)} kcal</span></div>
          <div class="nutrient-row"><strong>🍗 Protein</strong> <span>${protein}g</span></div>
          <div class="nutrient-row"><strong>🧈 Fat</strong> <span>${fat}g</span></div>
          <div class="nutrient-row"><strong>🍚 Carbs</strong> <span>${carbs}g</span></div>
          <div class="nutrient-row"><strong>📋 Servings</strong> <span>${nutriData.totalWeight ? Math.round(nutriData.totalWeight/100)/10 : '—'} units</span></div>
          <div style="font-size:0.7rem; margin-top:12px;">Based on ingredients: ${ingredientsList.slice(0,4).join(", ")}...</div>
        `;
      } else {
        nutritionDiv.innerHTML = `<div>⚠️ Could not retrieve full nutrition. Ensure ingredients are valid. Raw ingredients: ${ingredientsList.slice(0,3).join(", ")}</div>`;
      }
    } catch(err) {
      console.error(err);
      nutritionDiv.innerHTML = `<div>❌ Nutrition fetch failed: ${err.message}. Try again later.</div>`;
    }
  }
  document.getElementById("closeModal")?.addEventListener("click", () => {
    document.getElementById("nutritionModal").style.display = "none";
  });
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("nutritionModal");
    if(e.target === modal) modal.style.display = "none";
  });

  // API interaction: fetch categories for filter dropdown
  async function loadCategories() {
    try {
      const res = await fetch(`${MEALDB_API}/categories.php`);
      const data = await res.json();
      if(data.categories) {
        const select = document.getElementById("categorySelect");
        data.categories.forEach(cat => {
          const opt = document.createElement("option");
          opt.value = cat.strCategory;
          opt.textContent = cat.strCategory;
          select.appendChild(opt);
        });
      }
    } catch(e) { console.warn("categories error"); }
  }

  // search by query or filter by category
  let currentSearchMode = "search";
  let currentQuery = "chicken";
  let currentCategory = "";

  async function fetchRecipes() {
    let url = "";
    if(currentSearchMode === "search" && currentQuery) {
      url = `${MEALDB_API}/search.php?s=${encodeURIComponent(currentQuery)}`;
    } else if(currentSearchMode === "category" && currentCategory) {
      url = `${MEALDB_API}/filter.php?c=${encodeURIComponent(currentCategory)}`;
    } else {
      // default show some meals (popular chicken)
      url = `${MEALDB_API}/search.php?s=chicken`;
    }
    const grid = document.getElementById("recipesGrid");
    grid.innerHTML = "<div style='padding:20px;'>Searching recipes...</div>";
    try {
      const res = await fetch(url);
      const data = await res.json();
      let meals = data.meals || [];
      if(meals && meals.length) {
        // enhance with category info (for filter by category api response lacks strCategory, but fine)
        if(currentSearchMode === "category" && currentCategory) {
          meals = meals.map(m => ({ ...m, strCategory: currentCategory }));
        } else {
          meals = meals.map(m => ({ ...m, strCategory: m.strCategory || "Dish" }));
        }
        currentRecipes = meals;
        renderRecipesGrid(currentRecipes);
      } else {
        currentRecipes = [];
        renderRecipesGrid([]);
      }
    } catch(err) { grid.innerHTML = `<div>Error loading recipes: ${err.message}</div>`; }
  }

  // Event binding
  document.getElementById("searchBtn").addEventListener("click", () => {
    currentQuery = document.getElementById("searchInput").value.trim();
    if(!currentQuery) currentQuery = "pasta";
    currentSearchMode = "search";
    currentCategory = "";
    fetchRecipes();
  });
  document.getElementById("filterBtn").addEventListener("click", () => {
    currentCategory = document.getElementById("categorySelect").value;
    if(currentCategory) {
      currentSearchMode = "category";
      fetchRecipes();
    } else if(!currentCategory) {
      alert("Please select a category");
    }
  });
  // initial load
  loadCategories().then(() => {
    loadStorage();
    currentQuery = "chicken";
    currentSearchMode = "search";
    fetchRecipes();
  });