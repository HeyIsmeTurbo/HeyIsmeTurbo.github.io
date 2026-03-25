const SWAPI_BASE = 'https://swapi.dev/api/';
let currentCategory = 'people';
const WIKI_SUMMARY_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const imageCache = new Map();

const CONTAINER = document.getElementById('cards-container');
const LOADING = document.getElementById('loading');
const ERROR = document.getElementById('error');
const CATEGORY_TITLE = document.getElementById('category-title');
const CATEGORY_NAV = document.querySelector('.categories-nav');
const SETTINGS_OVERLAY = document.getElementById('settings-overlay');
const OPEN_SETTINGS_BTN = document.getElementById('open-settings');
const CLOSE_SETTINGS_BTN = document.getElementById('close-settings');
const SAVE_PREFERENCES_BTN = document.getElementById('save-preferences');
const RESET_PREFERENCES_BTN = document.getElementById('reset-preferences');
const PREF_DEFAULT_CATEGORY = document.getElementById('pref-default-category');
const PREF_CARD_DENSITY = document.getElementById('pref-card-density');
const PREF_STICKERS_ENABLED = document.getElementById('pref-stickers-enabled');
const PREF_REDUCED_MOTION = document.getElementById('pref-reduced-motion');
let activeModal = null;
let activeSettings = null;

const PREFERENCES_KEY = 'sw_universe_preferences';
const defaultPreferences = {
  defaultCategory: 'people',
  cardDensity: 'normal',
  stickersEnabled: true,
  reducedMotion: false
};
let userPreferences = { ...defaultPreferences };

// Category configurations
const categories = {
  people: {
    endpoint: 'people/',
    label: 'Characters',
    fields: ['height', 'mass', 'hair_color', 'skin_color', 'birth_year']
  },
  starships: {
    endpoint: 'starships/',
    label: 'Spaceships',
    fields: ['model', 'manufacturer', 'cost_in_credits', 'crew', 'max_atmosphering_speed']
  },
  vehicles: {
    endpoint: 'vehicles/',
    label: 'Vehicles',
    fields: ['model', 'manufacturer', 'cost_in_credits', 'crew', 'max_atmosphering_speed']
  },
  species: {
    endpoint: 'species/',
    label: 'Species',
    fields: ['classification', 'designation', 'average_height', 'skin_colors', 'language']
  },
  planets: {
    endpoint: 'planets/',
    label: 'Planets',
    fields: ['diameter', 'rotation_period', 'orbital_period', 'gravity', 'climate']
  }
};

const movieFields = ['episode_id', 'director', 'producer', 'release_date', 'opening_crawl'];

// Generate image from hash - creates consistent colorful images
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Generate colorful gradient background for each character
function generateImageUrl(name, category) {
  // Always return a valid SVG fallback
  const hash = hashCode(name);
  const hue = hash % 360;
  const saturation = 60 + (hash % 30);
  const lightness = 40 + (hash % 20);
  const emojis = {
    people: '👤',
    starships: '🚀',
    vehicles: '🏎️',
    species: '👽',
    planets: '🪐'
  };
  const emoji = emojis[category] || '⭐';
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:hsl(${hue},${saturation}%25,${lightness}%25);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:hsl(${(hue + 60) % 360},${saturation}%25,${lightness - 10}%25);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23grad)' width='300' height='400'/%3E%3Ccircle cx='150' cy='100' r='60' fill='rgba(255,255,255,0.2)'/%3E%3Ctext x='50%25' y='50%25' font-size='120' text-anchor='middle' dominant-baseline='middle' fill='white'%3E${emoji}%3C/text%3E%3Ctext x='50%25' y='85%25' font-size='14' text-anchor='middle' dominant-baseline='middle' fill='white' opacity='0.8'%3E${name}%3C/text%3E%3C/svg%3E`;
}

// Setup category button listeners
function setupCategoryButtons() {
  const buttons = document.querySelectorAll('.category-btn');
  buttons.forEach(btn => {
    if (btn.dataset.bound === 'true') {
      return;
    }

    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const category = btn.dataset.category;
      currentCategory = category;
      fetchData(category);
    });

    btn.dataset.bound = 'true';
  });
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      userPreferences = { ...defaultPreferences };
      return;
    }

    const parsed = JSON.parse(raw);
    userPreferences = {
      ...defaultPreferences,
      ...parsed
    };
  } catch (err) {
    userPreferences = { ...defaultPreferences };
  }
}

function savePreferences() {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(userPreferences));
}

function syncBodyScrollLock() {
  if (activeModal || activeSettings) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
}

function applyUserPreferences() {
  const cardDensityClass = {
    compact: 'cards-compact',
    normal: 'cards-normal',
    large: 'cards-large'
  }[userPreferences.cardDensity] || 'cards-normal';

  document.body.classList.remove('cards-compact', 'cards-normal', 'cards-large');
  document.body.classList.add(cardDensityClass);

  document.body.classList.toggle('stickers-off', !userPreferences.stickersEnabled);
  document.body.classList.toggle('reduced-motion', !!userPreferences.reducedMotion);
}

function populatePreferencesForm() {
  PREF_CARD_DENSITY.value = userPreferences.cardDensity;
  PREF_STICKERS_ENABLED.checked = !!userPreferences.stickersEnabled;
  PREF_REDUCED_MOTION.checked = !!userPreferences.reducedMotion;
}

function refreshDefaultCategoryOptions() {
  PREF_DEFAULT_CATEGORY.innerHTML = '';

  Object.entries(categories).forEach(([key, config]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = config.label;
    PREF_DEFAULT_CATEGORY.appendChild(option);
  });

  PREF_DEFAULT_CATEGORY.value = categories[userPreferences.defaultCategory]
    ? userPreferences.defaultCategory
    : 'people';
}

function closeSettings() {
  if (!activeSettings) {
    return;
  }

  const { escapeHandler } = activeSettings;
  document.removeEventListener('keydown', escapeHandler);
  SETTINGS_OVERLAY.classList.remove('open');
  SETTINGS_OVERLAY.setAttribute('aria-hidden', 'true');
  activeSettings = null;
  syncBodyScrollLock();
}

function openSettings() {
  populatePreferencesForm();
  refreshDefaultCategoryOptions();

  SETTINGS_OVERLAY.classList.add('open');
  SETTINGS_OVERLAY.setAttribute('aria-hidden', 'false');

  const escapeHandler = (event) => {
    if (event.key === 'Escape') {
      closeSettings();
    }
  };

  document.addEventListener('keydown', escapeHandler);
  activeSettings = { escapeHandler };
  syncBodyScrollLock();
}

function setupPreferencesUi() {
  OPEN_SETTINGS_BTN.addEventListener('click', openSettings);
  CLOSE_SETTINGS_BTN.addEventListener('click', closeSettings);

  SETTINGS_OVERLAY.addEventListener('click', (event) => {
    if (event.target === SETTINGS_OVERLAY) {
      closeSettings();
    }
  });

  RESET_PREFERENCES_BTN.addEventListener('click', () => {
    userPreferences = { ...defaultPreferences };
    populatePreferencesForm();
    refreshDefaultCategoryOptions();
    applyUserPreferences();
    savePreferences();
  });

  SAVE_PREFERENCES_BTN.addEventListener('click', () => {
    userPreferences = {
      defaultCategory: PREF_DEFAULT_CATEGORY.value || 'people',
      cardDensity: PREF_CARD_DENSITY.value || 'normal',
      stickersEnabled: PREF_STICKERS_ENABLED.checked,
      reducedMotion: PREF_REDUCED_MOTION.checked
    };

    applyUserPreferences();
    savePreferences();
    closeSettings();
  });
}

function activateCategoryButton(category) {
  document.querySelectorAll('.category-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.category === category);
  });
}

function makeMovieCategoryKey(film) {
  return `film_${film.episode_id || film.url || film.title}`
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_');
}

function createMovieButton(categoryKey, film) {
  const btn = document.createElement('button');
  btn.className = 'category-btn movie-btn';
  btn.dataset.category = categoryKey;
  btn.dataset.label = film.title;
  btn.textContent = `🎬 Episode ${film.episode_id} - ${film.title}`;
  return btn;
}

async function setupMovieCategories() {
  try {
    const response = await fetch(`${SWAPI_BASE}films/`);
    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const payload = await response.json();
    const films = (payload.results || []).slice().sort((a, b) => (a.episode_id || 0) - (b.episode_id || 0));

    if (films.length === 0) {
      return;
    }

    const separator = document.createElement('div');
    separator.className = 'category-separator';
    separator.textContent = 'MOVIES';
    CATEGORY_NAV.appendChild(separator);

    films.forEach((film) => {
      const categoryKey = makeMovieCategoryKey(film);

      categories[categoryKey] = {
        endpoint: film.url,
        label: film.title,
        fields: movieFields
      };

      CATEGORY_NAV.appendChild(createMovieButton(categoryKey, film));
    });

    setupCategoryButtons();
  } catch (err) {
    console.warn('Failed to load movie categories:', err.message);
  }
}

// Fetch data from SWAPI
async function fetchData(category) {
  try {
    LOADING.style.display = 'block';
    ERROR.classList.remove('show');
    CONTAINER.innerHTML = '';

    const config = categories[category];
    console.log(`📡 Fetching all ${config.label} pages from SWAPI...`);
    const data = await fetchAllCategoryPages(config.endpoint);
    LOADING.style.display = 'none';
    CATEGORY_TITLE.textContent = config.label;
    console.log(`✓ Successfully fetched ${data.results.length} items`);
    renderCards(data.results, category);
  } catch (err) {
    LOADING.style.display = 'none';
    showError(`Failed to load ${categories[category].label}: ${err.message}`);
    console.error(err);
  }
}

async function fetchAllCategoryPages(endpoint) {
  let nextUrl = endpoint.startsWith('http') ? endpoint : (SWAPI_BASE + endpoint);
  const results = [];

  while (nextUrl) {
    const response = await fetch(nextUrl);

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const pageData = await response.json();

    if (Array.isArray(pageData.results)) {
      results.push(...pageData.results);
      nextUrl = pageData.next;
    } else {
      results.push(pageData);
      nextUrl = null;
    }
  }

  return { results };
}

// Render cards from data
function renderCards(items, category) {
  CONTAINER.innerHTML = '';

  if (!items || items.length === 0) {
    CONTAINER.innerHTML = '<p style="color: #ffd700;">No results found</p>';
    return;
  }

  items.forEach((item) => {
    const card = createCard(item, category);
    CONTAINER.appendChild(card);
  });
}

function normalizeTitle(name) {
  const aliasMap = {
    'Owen Lars': 'Owen Lars',
    'Beru Whitesun lars': 'Beru Whitesun Lars',
    'Sand Crawler': 'Sandcrawler',
    'Star Destroyer': 'Star Destroyer',
    'Sentinel-class landing craft': 'Sentinel-class landing craft',
    'Rebel transport': 'GR-75 medium transport',
    Snowspeeder: 'Snowspeeder',
    'AT-ST': 'AT-ST',
    'Storm IV Twin-Pod cloud car': 'Cloud car',
    Human: 'Human (Star Wars)',
    'Mon Calamari': 'Mon Calamari',
    Sullustan: 'Sullustan',
    'TIE/LN starfighter': 'TIE fighter',
    'CR90 corvette': 'CR90 corvette (Tantive IV)',
    Executor: 'Executor (Star Wars)'
  };

  return (aliasMap[name] || name).replace(/\s+/g, '_');
}

function isRelevantWikiPage(summaryText, title, category) {
  if (!summaryText) {
    return false;
  }

  const text = `${summaryText} ${title || ''}`.toLowerCase();

  if (text.includes('star wars') || text.includes('(star wars)')) {
    return true;
  }

  if (category === 'species' && (text.includes('fictional species') || text.includes('species'))) {
    return true;
  }

  if ((category === 'starships' || category === 'vehicles') && (text.includes('fictional spacecraft') || text.includes('fictional vehicle'))) {
    return true;
  }

  if (category === 'planets' && text.includes('fictional planet')) {
    return true;
  }

  if (category === 'people' && text.includes('fictional character')) {
    return true;
  }

  return false;
}

async function fetchWikiThumbnailByTitle(title, category) {
  const response = await fetch(`${WIKI_SUMMARY_BASE}${encodeURIComponent(title)}`);

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const summary = `${payload.extract || ''} ${payload.description || ''}`;

  if (!payload.thumbnail?.source || !isRelevantWikiPage(summary, payload.title, category)) {
    return null;
  }

  return payload.thumbnail.source;
}

async function searchStarWarsTitle(name, category) {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name + ' star wars')}&format=json&origin=*&srlimit=5`;
  const response = await fetch(searchUrl);

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const matches = payload?.query?.search || [];

  for (const match of matches) {
    const title = match?.title;
    if (!title) {
      continue;
    }

    const thumbnail = await fetchWikiThumbnailByTitle(title, category);
    if (thumbnail) {
      return thumbnail;
    }
  }

  return null;
}

async function fetchWookieepediaThumbnail(name) {
  const searchUrl = `https://starwars.fandom.com/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=700&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=1`;
  const response = await fetch(searchUrl);

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const pages = payload?.query?.pages;

  if (!pages) {
    return null;
  }

  const firstPage = Object.values(pages)[0];
  return firstPage?.thumbnail?.source || null;
}

async function getImageForCard(name, category) {
  const cacheKey = `${category}:${name}`;

  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  let imageUrl = null;

  try {
    const normalizedTitle = normalizeTitle(name);
    imageUrl = await fetchWikiThumbnailByTitle(normalizedTitle, category);

    if (!imageUrl) {
      imageUrl = await searchStarWarsTitle(name, category);
    }

    if (!imageUrl) {
      imageUrl = await fetchWookieepediaThumbnail(normalizedTitle);
    }

    if (!imageUrl) {
      imageUrl = await fetchWookieepediaThumbnail(name);
    }
  } catch (err) {
    console.warn(`Failed to fetch image for ${name}:`, err.message);
  }

  imageCache.set(cacheKey, imageUrl);
  return imageUrl;
}

function toDisplayLabel(key) {
  return key.replace(/_/g, ' ').toUpperCase();
}

function formatDetailValue(value) {
  if (Array.isArray(value)) {
    return `${value.length} linked records`;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

function buildDetailRows(item, category) {
  const config = categories[category];
  const usedKeys = new Set(['name', 'title', 'url', 'created', 'edited', ...config.fields]);
  const rows = [];

  rows.push({ label: 'CATEGORY', value: config.label });

  config.fields.forEach((field) => {
    if (item[field] !== undefined && item[field] !== null) {
      const value = formatDetailValue(item[field]);
      if (value !== null) {
        rows.push({ label: toDisplayLabel(field), value });
      }
    }
  });

  Object.entries(item).forEach(([key, value]) => {
    if (usedKeys.has(key)) {
      return;
    }

    const formatted = formatDetailValue(value);
    if (formatted !== null) {
      rows.push({ label: toDisplayLabel(key), value: formatted });
    }
  });

  return rows;
}

function closeActiveModal() {
  if (!activeModal) {
    return;
  }

  const { overlay, escapeHandler } = activeModal;
  document.removeEventListener('keydown', escapeHandler);
  overlay.remove();
  activeModal = null;
  syncBodyScrollLock();
}

function openCardModal(item, category, imageSrc) {
  closeActiveModal();

  const name = item.name || item.title || 'Unknown';
  const fallbackSvg = generateImageUrl(name, category);
  const rows = buildDetailRows(item, category);
  const detailRowsHtml = rows.map((row) => `
      <div class="modal-info-row">
        <span class="modal-info-label">${row.label}:</span>
        <span class="modal-info-value">${row.value}</span>
      </div>
    `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'card-modal-overlay';
  overlay.innerHTML = `
    <div class="card-modal" role="dialog" aria-modal="true" aria-label="${name} details">
      <button class="card-modal-close" type="button" aria-label="Close expanded card">&times;</button>
      <div class="card-modal-image-wrap">
        <img src="${imageSrc || fallbackSvg}" alt="${name}" class="card-modal-image">
      </div>
      <div class="card-modal-content">
        <h2 class="card-modal-title">${name}</h2>
        <p class="card-modal-subtitle">Expanded details</p>
        <div class="card-modal-info">
          ${detailRowsHtml}
        </div>
      </div>
    </div>
  `;

  const closeBtn = overlay.querySelector('.card-modal-close');
  const modalImage = overlay.querySelector('.card-modal-image');

  modalImage.addEventListener('error', () => {
    modalImage.src = fallbackSvg;
  }, { once: true });

  closeBtn.addEventListener('click', closeActiveModal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeActiveModal();
    }
  });

  const escapeHandler = (event) => {
    if (event.key === 'Escape') {
      closeActiveModal();
    }
  };

  document.addEventListener('keydown', escapeHandler);
  document.body.appendChild(overlay);
  activeModal = { overlay, escapeHandler };
  syncBodyScrollLock();
}

// Create a single card element with generated images
function createCard(item, category) {
  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');

  const config = categories[category];
  const name = item.name || item.title || 'Unknown';

  const displayFields = config.fields.filter(field => item[field] !== undefined && item[field] !== null);

  let infoRows = '';
  displayFields.forEach(field => {
    const label = field.replace(/_/g, ' ').toUpperCase();
    const value = item[field];
    infoRows += `
      <div class="info-row">
        <span class="info-label">${label}:</span>
        <span class="info-value">${value}</span>
      </div>
    `;
  });

  const fallbackSvg = generateImageUrl(name, category);

  card.innerHTML = `
    <div class="card-image-container">
      <img src="${fallbackSvg}" alt="${name}" class="card-image" data-fallback="${fallbackSvg}">
    </div>
    <h2>${name}</h2>
    <div class="card-info">
      ${infoRows}
    </div>
  `;

  const img = card.querySelector('.card-image');
  card.addEventListener('click', () => openCardModal(item, category, img.src));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openCardModal(item, category, img.src);
    }
  });

  getImageForCard(name, category).then((imageUrl) => {
    if (!imageUrl || !document.body.contains(img)) {
      return;
    }

    img.src = imageUrl;
    img.addEventListener('error', () => {
      img.src = fallbackSvg;
    }, { once: true });
  });

  return card;
}

// Show error message
function showError(message) {
  ERROR.textContent = message;
  ERROR.classList.add('show');
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', async () => {
  loadPreferences();
  applyUserPreferences();
  setupPreferencesUi();

  setupCategoryButtons();
  await setupMovieCategories();
  refreshDefaultCategoryOptions();

  const startupCategory = categories[userPreferences.defaultCategory]
    ? userPreferences.defaultCategory
    : 'people';

  activateCategoryButton(startupCategory);
  currentCategory = startupCategory;
  fetchData(startupCategory);
});
