// ========== FOOD DATABASE ==========
// Open Food Facts integration for food search and barcode lookup
// API: https://world.openfoodfacts.org/ (100% free, open-source, no key required)

const FOOD_DB_CACHE_KEY = 'ft_food_db_cache';
const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_BARCODE_URL = 'https://world.openfoodfacts.org/api/v2/product/';
const FOOD_DB_MAX_CACHE = 500;

let _foodSearchTimeout = null;
let _foodSearchController = null;

// ========== CACHE ==========
function loadFoodCache() {
  try {
    const raw = localStorage.getItem(FOOD_DB_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveFoodCache(cache) {
  try {
    const keys = Object.keys(cache);
    if (keys.length > FOOD_DB_MAX_CACHE) {
      const sorted = keys.sort((a, b) => (cache[a]._cachedAt || 0) - (cache[b]._cachedAt || 0));
      sorted.slice(0, keys.length - FOOD_DB_MAX_CACHE).forEach(k => delete cache[k]);
    }
    localStorage.setItem(FOOD_DB_CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full fallback */ }
}

function cacheProduct(product) {
  const cache = loadFoodCache();
  const key = product._barcode || product._searchKey || product.name;
  cache[key] = { ...product, _cachedAt: Date.now() };
  saveFoodCache(cache);
}

function getCachedByBarcode(barcode) {
  const cache = loadFoodCache();
  return cache[barcode] || null;
}

function getCachedSearch(query) {
  const q = query.toLowerCase().trim();
  const cache = loadFoodCache();
  const cached = Object.values(cache).filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p._searchKey || '').toLowerCase().includes(q)
  );
  return mergeFoodResults(getSavedFoodItems(q), cached, 12);
}

function getSavedFoodItems(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [];
  const items = loadData(KEYS.foodItems);
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const row = item || {};
      return {
        name: String(row.name || '').trim(),
        serving: String(row.serving || '').trim(),
        calories: Math.max(0, Number(row.calories) || 0),
        protein: Math.max(0, Number(row.protein) || 0),
        carbs: Math.max(0, Number(row.carbs) || 0),
        fat: Math.max(0, Number(row.fat) || 0),
        fiber: Math.max(0, Number(row.fiber) || 0),
        sugar: Math.max(0, Number(row.sugar) || 0),
        sodium: Math.max(0, Number(row.sodium) || 0),
        _searchKey: (String(row.name || '') + ' ' + String(row.serving || '')).toLowerCase(),
      };
    })
    .filter((row) => row.name)
    .filter((row) => row.name.toLowerCase().includes(q) || row._searchKey.includes(q));
}

function mergeFoodResults(primary, secondary, limit) {
  const output = [];
  const seen = new Set();
  const max = Math.max(1, Number(limit) || 10);

  const pushList = function (rows) {
    (rows || []).forEach((row) => {
      const name = String(row && row.name || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      output.push(row);
    });
  };

  pushList(primary);
  pushList(secondary);

  return output.slice(0, max);
}

// ========== API: NORMALIZE PRODUCT ==========
function normalizeOFFProduct(raw) {
  const p = raw.product || raw;
  const n = p.nutriments || {};
  const name = p.product_name || p.product_name_en || p.generic_name || 'Unknown';
  const brand = p.brands || '';
  const serving = p.serving_size || '';
  const per100 = {
    calories: Math.round(n['energy-kcal_100g'] || n['energy_100g'] / 4.184 || 0),
    protein: Math.round((n.proteins_100g || 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
    fat: Math.round((n.fat_100g || 0) * 10) / 10,
    fiber: Math.round((n.fiber_100g || 0) * 10) / 10,
    sugar: Math.round((n.sugars_100g || 0) * 10) / 10,
    sodium: Math.round((n.sodium_100g || 0) * 1000),
  };
  const perServing = {
    calories: Math.round(n['energy-kcal_serving'] || (per100.calories * (parseFloat(serving) || 100) / 100) || 0),
    protein: Math.round((n.proteins_serving || per100.protein * (parseFloat(serving) || 100) / 100) * 10) / 10,
    carbs: Math.round((n.carbohydrates_serving || per100.carbs * (parseFloat(serving) || 100) / 100) * 10) / 10,
    fat: Math.round((n.fat_serving || per100.fat * (parseFloat(serving) || 100) / 100) * 10) / 10,
  };

  return {
    name: brand ? name + ' (' + brand + ')' : name,
    barcode: p.code || p._id || '',
    serving: serving || '100g',
    calories: perServing.calories || per100.calories,
    protein: perServing.protein || per100.protein,
    carbs: perServing.carbs || per100.carbs,
    fat: perServing.fat || per100.fat,
    fiber: per100.fiber,
    sugar: per100.sugar,
    sodium: per100.sodium,
    per100,
    perServing,
    imageUrl: p.image_small_url || p.image_front_small_url || '',
    _barcode: p.code || '',
    _searchKey: (name + ' ' + brand).toLowerCase(),
  };
}

// ========== API: SEARCH ==========
async function searchFoodsAPI(query) {
  if (!query || query.trim().length < 2) return [];

  if (_foodSearchController) _foodSearchController.abort();
  _foodSearchController = new AbortController();

  try {
    const localMatches = getSavedFoodItems(query);
    const url = OFF_SEARCH_URL +
      '?search_terms=' + encodeURIComponent(query.trim()) +
      '&json=1&page_size=10&search_simple=1&action=process' +
      '&fields=product_name,product_name_en,brands,code,serving_size,nutriments,image_small_url,image_front_small_url,generic_name';

    const resp = await fetch(url, {
      signal: _foodSearchController.signal,
      headers: { 'User-Agent': 'FitOne PWA - https://github.com/user/FitOne' },
    });
    if (!resp.ok) throw new Error('API error: ' + resp.status);
    const data = await resp.json();
    const products = (data.products || [])
      .filter(p => p.product_name || p.product_name_en)
      .map(p => normalizeOFFProduct({ product: p }));

    products.forEach(p => cacheProduct(p));
    return mergeFoodResults(localMatches, products, 12);
  } catch (e) {
    if (e.name === 'AbortError') return [];
    console.warn('Food search API error:', e);
    return getCachedSearch(query);
  }
}

async function lookupBarcode(barcode) {
  if (!barcode) return null;
  const cleaned = barcode.replace(/\D/g, '');
  if (cleaned.length < 4) return null;

  const cached = getCachedByBarcode(cleaned);
  if (cached) return cached;

  try {
    const url = OFF_BARCODE_URL + cleaned + '.json?fields=product_name,product_name_en,brands,code,serving_size,nutriments,image_small_url,image_front_small_url,generic_name';
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'FitOne PWA' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.status !== 1 || !data.product) return null;
    const product = normalizeOFFProduct(data);
    cacheProduct(product);
    return product;
  } catch (e) {
    console.warn('Barcode lookup error:', e);
    return null;
  }
}

// ========== DEBOUNCED SEARCH ==========
function debouncedFoodSearch(query, callback) {
  clearTimeout(_foodSearchTimeout);
  if (!query || query.trim().length < 2) {
    callback([]);
    return;
  }
  const cached = getCachedSearch(query);
  if (cached.length > 0) callback(cached);

  _foodSearchTimeout = setTimeout(async () => {
    const results = await searchFoodsAPI(query);
    callback(results.length > 0 ? results : cached);
  }, 350);
}

// ========== SEARCH DROPDOWN UI ==========
function createFoodSearchDropdown() {
  let dropdown = $('foodSearchDropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'foodSearchDropdown';
    dropdown.className = 'food-search-dropdown';
    const nameInput = $('foodName');
    if (nameInput && nameInput.parentElement) {
      nameInput.parentElement.style.position = 'relative';
      nameInput.parentElement.appendChild(dropdown);
    }
  }
  return dropdown;
}

function renderFoodSearchResults(results) {
  const dropdown = createFoodSearchDropdown();
  if (!results || results.length === 0) {
    dropdown.classList.remove('show');
    return;
  }

  dropdown.innerHTML = results.map((r, i) => {
    const macroLine = 'P' + (r.protein || 0) + ' C' + (r.carbs || 0) + ' F' + (r.fat || 0);
    return '<div class="food-search-item" data-food-idx="' + i + '">' +
      '<div class="food-search-item-name">' + esc(r.name) + '</div>' +
      '<div class="food-search-item-detail">' +
        (r.serving ? esc(r.serving) + ' • ' : '') +
        r.calories + ' cal • ' + macroLine +
      '</div>' +
    '</div>';
  }).join('');

  dropdown.classList.add('show');

  dropdown.querySelectorAll('.food-search-item').forEach((item, idx) => {
    item.addEventListener('click', () => {
      const product = results[idx];
      if (!product) return;
      fillFoodFormFromProduct(product);
      dropdown.classList.remove('show');
    });
  });
}

function fillFoodFormFromProduct(product) {
  if ($('foodName')) $('foodName').value = product.name || '';
  if ($('foodCalories')) {
    $('foodCalories').value = product.calories || '';
    $('foodCalories').dataset.manualEntry = product.calories ? '1' : '';
  }
  if ($('foodProtein')) $('foodProtein').value = product.protein || '';
  if ($('foodCarbs')) $('foodCarbs').value = product.carbs || '';
  if ($('foodFat')) $('foodFat').value = product.fat || '';
  if ($('foodFiber')) $('foodFiber').value = product.fiber || '';
  if ($('foodSugar')) $('foodSugar').value = product.sugar || '';
  if ($('foodSodium')) $('foodSodium').value = product.sodium || '';
  if ($('foodServing')) $('foodServing').value = product.serving || '';
  refreshCalorieGuidance();
  if (typeof refreshMicronutrientHints === 'function') refreshMicronutrientHints();
}

function hideFoodSearchDropdown() {
  const dropdown = $('foodSearchDropdown');
  if (dropdown) dropdown.classList.remove('show');
}

// ========== INIT FOOD SEARCH ==========
function initFoodSearch() {
  const nameInput = $('foodName');
  if (!nameInput) return;

  createFoodSearchDropdown();

  nameInput.addEventListener('input', () => {
    const q = nameInput.value.trim();
    if (q.length < 2) {
      hideFoodSearchDropdown();
      return;
    }
    debouncedFoodSearch(q, renderFoodSearchResults);
  });

  nameInput.addEventListener('focus', () => {
    const q = nameInput.value.trim();
    if (q.length >= 2) {
      debouncedFoodSearch(q, renderFoodSearchResults);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#foodName') && !e.target.closest('.food-search-dropdown')) {
      hideFoodSearchDropdown();
    }
  });

  nameInput.addEventListener('keydown', (e) => {
    const dropdown = $('foodSearchDropdown');
    if (!dropdown || !dropdown.classList.contains('show')) return;
    const items = dropdown.querySelectorAll('.food-search-item');
    const active = dropdown.querySelector('.food-search-item.active');
    let idx = active ? Array.from(items).indexOf(active) : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (active) active.classList.remove('active');
      idx = Math.min(idx + 1, items.length - 1);
      items[idx].classList.add('active');
      items[idx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (active) active.classList.remove('active');
      idx = Math.max(idx - 1, 0);
      items[idx].classList.add('active');
      items[idx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && active) {
      e.preventDefault();
      active.click();
    } else if (e.key === 'Escape') {
      hideFoodSearchDropdown();
    }
  });
}
