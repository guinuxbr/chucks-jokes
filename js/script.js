// @ts-check

/**
 * @fileoverview Chuck's Jokes - Core Application Logic & Services
 * ================================================================
 * This client-side module powers the Chuck's Jokes application. It connects to the
 * public chucknorris.io REST API (https://api.chucknorris.io/) to provide a fast,
 * accessible, and feature-packed Chuck Norris joke explorer with category filtering,
 * smart search browsing, Web Speech API text-to-speech, local favourites bookmarking,
 * dark/light theme switching, and keyboard navigation.
 *
 * Architecture Overview:
 * ----------------------
 * 1. Storage & State: Manages application state, theme persistence, and localStorage favourites.
 * 2. Theme Management: Handles dark/light theme switching and system preference auto-detection.
 * 3. Toast Notifications: Non-blocking floating status alerts.
 * 4. UI Status & Loading State: Visual feedback, skeleton loaders, and error messaging.
 * 5. Chuck Norris API Services: Asynchronous fetch clients for joke categories, random jokes, and keyword search.
 * 6. Joke Presentation & UI: Renders joke content, dynamic badges, and search pagination.
 * 7. Text-to-Speech (TTS): Web Speech API voice synthesis integration with play/stop toggle.
 * 8. Favourites System: LocalStorage-backed bookmarking system with an interactive modal manager.
 * 9. Clipboard & Web Sharing Actions: One-click copy and native Web Share API integration.
 * 10. Modal Dialogue Handlers: Accessibility dialog openers and closers with backdrop dismiss.
 * 11. Event Listeners & Keyboard Shortcuts: Centralized power-user keyboard shortcuts and DOM listeners.
 * 12. Service Worker: PWA offline caching registration.
 * 13. Application Bootstrap: DOM lifecycle startup and initial data fetching.
 *
 * @author Guilherme Marques (https://guinuxbr.com)
 * @license GNU GPLv3
 */

// ==========================================================================
// Type Definitions (JSDoc Data Models)
// ==========================================================================

/**
 * Represents a Chuck Norris joke item.
 * @typedef {Object} JokeItem
 * @property {string} id - Unique identifier for the joke.
 * @property {string} value - The punchline / joke text.
 * @property {string} [category] - Category name of the joke (e.g. "dev", "movie", "Random").
 * @property {string} [url] - Canonical API URL for the joke.
 */

/**
 * Represents a saved favourite joke in localStorage.
 * @typedef {Object} FavoriteJoke
 * @property {string} id - Unique identifier for the joke.
 * @property {string} value - The joke text content.
 * @property {string} category - Category label.
 * @property {string} date - Locale date string when the joke was favourited.
 */

/**
 * Raw response format returned by the chucknorris.io random joke endpoint.
 * @typedef {Object} RandomJokeApiResponse
 * @property {string[]} categories - Array of categories assigned to the joke.
 * @property {string} created_at - Timestamp of joke creation.
 * @property {string} icon_url - Icon avatar URL.
 * @property {string} id - Unique joke ID.
 * @property {string} updated_at - Timestamp of joke update.
 * @property {string} url - Canonical joke URL.
 * @property {string} value - Joke text content.
 */

/**
 * Raw response format returned by the chucknorris.io search endpoint.
 * @typedef {Object} SearchJokeApiResponse
 * @property {number} total - Total count of matching jokes.
 * @property {RandomJokeApiResponse[]} result - Array of matching joke objects.
 */

/**
 * Allowed colour theme modes.
 * @typedef {"system" | "light" | "dark"} ThemeMode
 */

/**
 * Allowed toast alert severity types.
 * @typedef {"info" | "success" | "error"} ToastType
 */

// ==========================================================================
// DOM Element References
// ==========================================================================

/**
 * Centralized dictionary of cached DOM element references.
 */
const dom = {
  // --- Joke Presentation Card ---
  jokeCard: /** @type {HTMLElement} */ (document.getElementById("joke-card")),
  jokeContent: /** @type {HTMLElement} */ (document.getElementById("joke-content")),
  jokeText: /** @type {HTMLElement} */ (document.getElementById("joke")),
  cardSkeleton: /** @type {HTMLElement} */ (document.getElementById("card-skeleton")),
  badgeCategory: /** @type {HTMLElement} */ (document.getElementById("badge-category")),
  badgeCounter: /** @type {HTMLElement} */ (document.getElementById("badge-counter")),

  // --- Joke Actions ---
  btnCopy: /** @type {HTMLButtonElement} */ (document.getElementById("btn-copy")),
  btnSpeak: /** @type {HTMLButtonElement} */ (document.getElementById("btn-speak")),
  iconSpeak: /** @type {HTMLElement} */ (document.getElementById("icon-speak")),
  labelSpeak: /** @type {HTMLElement} */ (document.getElementById("label-speak")),
  btnFavorite: /** @type {HTMLButtonElement} */ (document.getElementById("btn-favorite")),
  iconFavorite: /** @type {HTMLElement} */ (document.getElementById("icon-favorite")),
  labelFavorite: /** @type {HTMLElement} */ (document.getElementById("label-favorite")),
  btnShare: /** @type {HTMLButtonElement} */ (document.getElementById("btn-share")),

  // --- Controls & Search Deck ---
  selectCategory: /** @type {HTMLSelectElement} */ (document.getElementById("select-category")),
  inputSearch: /** @type {HTMLInputElement} */ (document.getElementById("input-search")),
  btnClearInput: /** @type {HTMLButtonElement} */ (document.getElementById("btn-clear")),
  btnNewJoke: /** @type {HTMLButtonElement} */ (document.getElementById("btn-new-joke")),
  btnNewJokeText: /** @type {HTMLElement} */ (document.getElementById("btn-new-joke-text")),

  // --- Search Pagination ---
  searchPagination: /** @type {HTMLElement} */ (document.getElementById("search-pagination")),
  btnPrev: /** @type {HTMLButtonElement} */ (document.getElementById("btn-prev")),
  btnNext: /** @type {HTMLButtonElement} */ (document.getElementById("btn-next")),
  paginationText: /** @type {HTMLElement} */ (document.getElementById("pagination-text")),

  // --- Status & Toasts ---
  statusMessage: /** @type {HTMLElement} */ (document.getElementById("status-message")),
  toastContainer: /** @type {HTMLElement} */ (document.getElementById("toast-container")),

  // --- Header Navigation & Tools ---
  btnThemeToggle: /** @type {HTMLButtonElement} */ (document.getElementById("btn-theme-toggle")),
  iconTheme: /** @type {HTMLElement} */ (document.getElementById("icon-theme")),
  btnFavoritesToggle: /** @type {HTMLButtonElement} */ (document.getElementById("btn-favorites-toggle")),
  favoritesBadge: /** @type {HTMLElement} */ (document.getElementById("favorites-badge")),
  btnShortcutsToggle: /** @type {HTMLButtonElement} */ (document.getElementById("btn-shortcuts-toggle")),

  // --- Favourites Manager Modal ---
  modalFavorites: /** @type {HTMLElement} */ (document.getElementById("modal-favorites")),
  btnCloseFavorites: /** @type {HTMLButtonElement} */ (document.getElementById("btn-close-favorites")),
  btnCloseFavoritesAlt: /** @type {HTMLButtonElement} */ (document.getElementById("btn-close-favorites-alt")),
  favoritesListContainer: /** @type {HTMLElement} */ (document.getElementById("favorites-list-container")),
  btnClearAllFavorites: /** @type {HTMLButtonElement} */ (document.getElementById("btn-clear-all-favorites")),

  // --- Keyboard Shortcuts Modal ---
  modalShortcuts: /** @type {HTMLElement} */ (document.getElementById("modal-shortcuts")),
  btnCloseShortcuts: /** @type {HTMLButtonElement} */ (document.getElementById("btn-close-shortcuts")),
  btnCloseShortcutsAlt: /** @type {HTMLButtonElement} */ (document.getElementById("btn-close-shortcuts-alt")),
};

// ==========================================================================
// Application State
// ==========================================================================

/**
 * Global reactive runtime state.
 */
const state = {
  /** @type {JokeItem | null} Currently displayed joke object */
  currentJoke: null,

  /** @type {RandomJokeApiResponse[]} Array of matching jokes from active search */
  searchResults: [],

  /** @type {number} Current active index within the searchResults array */
  searchIndex: 0,

  /** @type {string} Active search keyword query */
  searchQuery: "",

  /** @type {string} Currently selected joke category slug */
  selectedCategory: "",

  /** @type {boolean} Indicates if a network fetch operation is currently in flight */
  isLoading: false,

  /** @type {boolean} True if speech synthesis is currently active */
  isSpeaking: false,

  /** @type {SpeechSynthesis | null} Web Speech API speech synthesis instance */
  speechSynth: typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null,

  /** @type {SpeechSynthesisUtterance | null} Active speech utterance instance */
  currentUtterance: null,

  /** @type {FavoriteJoke[]} Array of bookmarked favourite jokes saved in localStorage */
  favorites: [],

  /** @type {ThemeMode} Current active theme mode */
  theme: "system",

  /** @type {AbortController | null} Controller for canceling pending in-flight fetch requests */
  activeAbortController: null,
};

// ==========================================================================
// LocalStorage Keys
// ==========================================================================

/**
 * Storage keys used for client-side persistence in localStorage.
 * @readonly
 * @enum {string}
 */
const STORAGE_KEYS = {
  FAVORITES: "chucks_jokes_favorites_v1",
  THEME: "chucks_jokes_theme_v1",
};

// ==========================================================================
// 1. Storage & State Management
// ==========================================================================

/**
 * Initializes and restores state from browser localStorage.
 * Restores saved favourite jokes and user theme preference.
 *
 * @returns {void}
 */
function loadStoredState() {
  // 1. Load saved favourites
  try {
    const storedFavs = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (storedFavs) {
      state.favorites = JSON.parse(storedFavs);
    }
  } catch (e) {
    console.error("Failed to load favourites from localStorage:", e);
    state.favorites = [];
  }
  updateFavoritesBadge();

  // 2. Load theme preference
  try {
    const storedTheme = /** @type {ThemeMode} */ (localStorage.getItem(STORAGE_KEYS.THEME) || "system");
    setTheme(storedTheme, false);
  } catch (e) {
    console.error("Failed to load theme preference:", e);
  }
}

/**
 * Persists the current favourites collection to browser localStorage.
 *
 * @returns {void}
 */
function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(state.favorites));
  } catch (e) {
    console.error("Failed to save favourites to localStorage:", e);
  }
  updateFavoritesBadge();
}

// ==========================================================================
// 2. Theme Management
// ==========================================================================

/**
 * Sets the active application visual theme (light, dark, or system).
 *
 * @param {ThemeMode} theme - Theme name to activate.
 * @param {boolean} [save=true] - Whether to persist the selection to localStorage.
 * @returns {void}
 */
function setTheme(theme, save = true) {
  state.theme = theme;
  const root = document.documentElement;

  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
    dom.iconTheme.className = "fa-solid fa-sun";
  } else if (theme === "light") {
    root.setAttribute("data-theme", "light");
    dom.iconTheme.className = "fa-solid fa-moon";
  } else {
    // System Default
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    dom.iconTheme.className = prefersDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }

  if (save) {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e) {
      console.error("Failed to save theme preference:", e);
    }
  }
}

/**
 * Toggles between Light and Dark themes with toast notification feedback.
 *
 * @returns {void}
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  setTheme(/** @type {ThemeMode} */ (next), true);
  showToast(`Switched to ${next === "dark" ? "Dark" : "Light"} theme`, "info", 1500);
}

// ==========================================================================
// 3. Toast Notifications System
// ==========================================================================

/**
 * Displays an animated, non-blocking toast alert at the bottom of the screen.
 *
 * @param {string} message - Notification text to display.
 * @param {ToastType} [type="info"] - Alert severity ("info", "success", "error").
 * @param {number} [duration=3200] - Duration in milliseconds before auto-dismissal.
 * @returns {void}
 *
 * @example
 * showToast("Joke copied to clipboard!", "success");
 */
function showToast(message, type = "info", duration = 3200) {
  if (!dom.toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let iconClass = "fa-solid fa-circle-info";
  if (type === "success") iconClass = "fa-solid fa-circle-check";
  if (type === "error") iconClass = "fa-solid fa-triangle-exclamation";

  toast.innerHTML = `
    <i class="${iconClass}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, duration);
}

/**
 * Escapes raw HTML entities to prevent Cross-Site Scripting (XSS).
 *
 * @param {string} text - Raw string to escape.
 * @returns {string} Sanitized HTML string safe for innerHTML insertion.
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================================================
// 4. UI Status & Loading State
// ==========================================================================

/**
 * Toggles the loading visual state across the joke card, skeleton placeholders, and action buttons.
 *
 * @param {boolean} loading - Whether loading mode is active.
 * @returns {void}
 */
function setLoading(loading) {
  state.isLoading = loading;

  if (loading) {
    stopSpeech();
    dom.jokeContent.style.opacity = "0.2";
    dom.cardSkeleton.classList.add("active");
    dom.btnNewJoke.disabled = true;
  } else {
    dom.jokeContent.style.opacity = "1";
    dom.cardSkeleton.classList.remove("active");
    dom.btnNewJoke.disabled = false;
  }
}

/**
 * Displays a status or error banner beneath the joke card.
 *
 * @param {string} msg - Message text to present.
 * @param {"info" | "success" | "error"} [type="info"] - Visual status style.
 * @returns {void}
 */
function setStatusMessage(msg, type = "info") {
  dom.statusMessage.className = `status-message ${type}`;
  dom.statusMessage.textContent = msg;
}

/**
 * Clears and hides the inline status message banner.
 *
 * @returns {void}
 */
function clearStatusMessage() {
  dom.statusMessage.textContent = "";
  dom.statusMessage.className = "status-message";
}

// ==========================================================================
// 5. Chuck Norris API Services
// ==========================================================================

/**
 * Base URL endpoint for the public chucknorris.io REST API.
 * @constant {string}
 */
const API_BASE = "https://api.chucknorris.io/jokes";

/**
 * Asynchronously fetches all available joke categories and populates the dropdown filter.
 *
 * @async
 * @returns {Promise<void>}
 */
async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    /** @type {string[]} */
    const categories = await res.json();

    // Populate category dropdown options
    dom.selectCategory.innerHTML = `<option value="">🎲 All / Any Category</option>`;
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = `${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
      dom.selectCategory.appendChild(option);
    });
  } catch (error) {
    console.warn("Could not load joke categories:", error);
  }
}

/**
 * Asynchronously fetches a fresh joke from the API (random or specific category).
 *
 * @async
 * @param {string} [category=""] - Optional category filter slug (e.g. "dev", "movie").
 * @returns {Promise<void>}
 */
async function fetchJoke(category = "") {
  // 1. Cancel previous in-flight fetch if still active
  if (state.activeAbortController) {
    state.activeAbortController.abort();
  }
  state.activeAbortController = new AbortController();

  setLoading(true);
  clearStatusMessage();

  // 2. Reset search pagination state
  state.searchResults = [];
  state.searchIndex = 0;
  updatePaginationUI();

  let url = `${API_BASE}/random`;
  if (category) {
    url += `?category=${encodeURIComponent(category)}`;
  }

  try {
    const res = await fetch(url, { signal: state.activeAbortController.signal });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    /** @type {RandomJokeApiResponse} */
    const data = await res.json();

    state.currentJoke = {
      id: data.id,
      value: data.value,
      category: data.categories && data.categories.length > 0 ? data.categories[0] : (category || "Random"),
      url: data.url,
    };

    displayJoke(state.currentJoke);
  } catch (error) {
    if (/** @type {Error} */ (error).name === "AbortError") return;
    console.error("Error fetching joke:", error);
    setStatusMessage("Could not retrieve a joke. Check your connection and try again.", "error");
    showToast("Network error. Please try again.", "error");
  } finally {
    setLoading(false);
  }
}

/**
 * Asynchronously searches jokes by keyword query via the Chuck Norris API.
 *
 * @async
 * @param {string} query - Keyword search string.
 * @returns {Promise<void>}
 */
async function searchJokes(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    return fetchJoke(state.selectedCategory);
  }

  if (trimmed.length < 3) {
    setStatusMessage("⚠️ Search keyword must be at least 3 characters long.", "error");
    showToast("Search term must be at least 3 characters", "error");
    return;
  }

  // 1. Cancel previous in-flight fetch request
  if (state.activeAbortController) {
    state.activeAbortController.abort();
  }
  state.activeAbortController = new AbortController();

  setLoading(true);
  clearStatusMessage();

  try {
    const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(trimmed)}`, {
      signal: state.activeAbortController.signal,
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    /** @type {SearchJokeApiResponse} */
    const data = await res.json();

    if (!data.result || data.result.length === 0) {
      state.searchResults = [];
      state.searchIndex = 0;
      updatePaginationUI();
      setStatusMessage(`No jokes found containing "${trimmed}". Chuck Norris wiped them out.`, "info");
      displayJoke({
        id: "not_found",
        value: `Chuck Norris searched for "${trimmed}" and determined that it is not worthy of a joke. Try another word!`,
        category: "Search",
      });
      return;
    }

    state.searchResults = data.result;
    state.searchIndex = 0;
    state.searchQuery = trimmed;

    setStatusMessage(`Found ${data.total} joke${data.total === 1 ? "" : "s"} matching "${trimmed}".`, "success");
    loadCurrentSearchResult();
  } catch (error) {
    if (/** @type {Error} */ (error).name === "AbortError") return;
    console.error("Error searching jokes:", error);
    setStatusMessage("Error searching for jokes. Please try again.", "error");
    showToast("Error executing search.", "error");
  } finally {
    setLoading(false);
  }
}

/**
 * Loads and displays the joke at the current search index from searchResults.
 *
 * @returns {void}
 */
function loadCurrentSearchResult() {
  if (!state.searchResults || state.searchResults.length === 0) return;

  const item = state.searchResults[state.searchIndex];
  state.currentJoke = {
    id: item.id,
    value: item.value,
    category: item.categories && item.categories.length > 0 ? item.categories[0] : "Search",
    url: item.url,
  };

  displayJoke(state.currentJoke);
  updatePaginationUI();
}

/**
 * Navigates to the next search result joke in the active search set.
 *
 * @returns {void}
 */
function nextSearchResult() {
  if (state.searchResults.length <= 1) return;
  state.searchIndex = (state.searchIndex + 1) % state.searchResults.length;
  loadCurrentSearchResult();
}

/**
 * Navigates to the previous search result joke in the active search set.
 *
 * @returns {void}
 */
function prevSearchResult() {
  if (state.searchResults.length <= 1) return;
  state.searchIndex = (state.searchIndex - 1 + state.searchResults.length) % state.searchResults.length;
  loadCurrentSearchResult();
}

/**
 * Updates the visibility and counter display for search pagination controls.
 *
 * @returns {void}
 */
function updatePaginationUI() {
  if (state.searchResults.length > 1) {
    dom.searchPagination.style.display = "flex";
    dom.paginationText.textContent = `${state.searchIndex + 1} / ${state.searchResults.length}`;
    dom.badgeCounter.style.display = "inline-flex";
    dom.badgeCounter.textContent = `Joke ${state.searchIndex + 1} of ${state.searchResults.length}`;
  } else {
    dom.searchPagination.style.display = "none";
    dom.badgeCounter.style.display = "none";
  }
}

// ==========================================================================
// 6. Joke Presentation & UI
// ==========================================================================

/**
 * Renders a joke item into the main card UI, adjusting dynamic font scaling and badge labels.
 *
 * @param {JokeItem | null} joke - Joke object to render.
 * @returns {void}
 */
function displayJoke(joke) {
  if (!joke || !joke.value) return;

  // 1. Adapt typography for longer joke text
  if (joke.value.length > 120) {
    dom.jokeText.classList.add("long-joke");
  } else {
    dom.jokeText.classList.remove("long-joke");
  }

  dom.jokeText.textContent = joke.value;

  // 2. Update category badge
  const catName = joke.category || "Random";
  if (catName.toLowerCase() === "random") {
    dom.badgeCategory.textContent = "🎲 Random";
  } else {
    dom.badgeCategory.textContent = `🏷️ ${catName.charAt(0).toUpperCase() + catName.slice(1)}`;
  }

  // 3. Update bookmark button state
  updateFavoriteButtonState();
}

/**
 * Checks whether the currently displayed joke is stored in user favourites.
 *
 * @returns {boolean} True if favourited, false otherwise.
 */
function isCurrentJokeFavorite() {
  if (!state.currentJoke || !state.currentJoke.value) return false;
  return state.favorites.some((fav) => fav.value === state.currentJoke?.value);
}

/**
 * Synchronizes the visual styling and icon of the favourite toggle button.
 *
 * @returns {void}
 */
function updateFavoriteButtonState() {
  const isFav = isCurrentJokeFavorite();
  if (isFav) {
    dom.btnFavorite.classList.add("active-favorite");
    dom.iconFavorite.className = "fa-solid fa-heart";
    dom.labelFavorite.textContent = "Favourited";
    dom.btnFavorite.setAttribute("title", "Remove from favourites (F)");
    dom.btnFavorite.setAttribute("aria-label", "Remove from favourites");
  } else {
    dom.btnFavorite.classList.remove("active-favorite");
    dom.iconFavorite.className = "fa-regular fa-heart";
    dom.labelFavorite.textContent = "Favourite";
    dom.btnFavorite.setAttribute("title", "Save to favourites (F)");
    dom.btnFavorite.setAttribute("aria-label", "Save to favourites");
  }
}

/**
 * Updates the header favourite count badge based on stored items count.
 *
 * @returns {void}
 */
function updateFavoritesBadge() {
  const count = state.favorites.length;
  if (count > 0) {
    dom.favoritesBadge.style.display = "inline-block";
    dom.favoritesBadge.textContent = count > 99 ? "99+" : String(count);
  } else {
    dom.favoritesBadge.style.display = "none";
  }
}

// ==========================================================================
// 7. Text-to-Speech (TTS) Voice Synthesis
// ==========================================================================

/**
 * Toggles speech synthesis voice narration for the currently displayed joke.
 * Prioritizes British English (en-GB) voices.
 *
 * @returns {void}
 */
function toggleSpeech() {
  if (!state.speechSynth) {
    showToast("Text-to-speech is not supported by your browser.", "error");
    return;
  }

  if (state.isSpeaking) {
    stopSpeech();
    return;
  }

  const text = state.currentJoke?.value || dom.jokeText.textContent;
  if (!text) return;

  stopSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95; // Slightly measured comedic delivery
  utterance.pitch = 1.0;

  // Pick a British English voice (en-GB) if available, fallback to any English voice
  const voices = state.speechSynth.getVoices();
  const gbVoice = voices.find((v) => (v.lang === "en-GB" || v.lang === "en_GB") && !v.name.includes("Google"));
  const enVoice = gbVoice || voices.find((v) => v.lang.startsWith("en") && !v.name.includes("Google"));
  if (enVoice) utterance.voice = enVoice;

  utterance.onstart = () => {
    state.isSpeaking = true;
    dom.btnSpeak.classList.add("speaking");
    dom.iconSpeak.className = "fa-solid fa-volume-xmark";
    dom.labelSpeak.textContent = "Stop";
  };

  utterance.onend = () => {
    stopSpeech();
  };

  utterance.onerror = (e) => {
    console.warn("Speech synthesis error:", e);
    stopSpeech();
  };

  state.currentUtterance = utterance;
  state.speechSynth.speak(utterance);
}

/**
 * Halts active voice narration and resets button visual styling.
 *
 * @returns {void}
 */
function stopSpeech() {
  if (state.speechSynth) {
    state.speechSynth.cancel();
  }
  state.isSpeaking = false;
  dom.btnSpeak.classList.remove("speaking");
  dom.iconSpeak.className = "fa-solid fa-volume-high";
  dom.labelSpeak.textContent = "Listen";
}

// ==========================================================================
// 8. Clipboard & Web Sharing Actions
// ==========================================================================

/**
 * Copies the current joke text to the system clipboard with toast feedback.
 *
 * @async
 * @returns {Promise<void>}
 */
async function copyCurrentJoke() {
  const text = state.currentJoke?.value || dom.jokeText.textContent;
  if (!text) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Legacy fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    showToast("Joke copied to clipboard!", "success");
  } catch (err) {
    console.error("Copy failed:", err);
    showToast("Could not copy joke.", "error");
  }
}

/**
 * Shares the current joke using the native Web Share API or falls back to an X/Twitter intent.
 *
 * @async
 * @returns {Promise<void>}
 */
async function shareCurrentJoke() {
  const text = state.currentJoke?.value || dom.jokeText.textContent;
  if (!text) return;

  const shareData = {
    title: "Chuck's Jokes",
    text: `"${text}" — Chuck Norris`,
    url: window.location.href,
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      showToast("Shared successfully!", "success");
      return;
    } catch (err) {
      if (/** @type {Error} */ (err).name !== "AbortError") {
        console.warn("Native share error, falling back to X intent:", err);
      } else {
        return;
      }
    }
  }

  // Fallback to X intent
  const postText = encodeURIComponent(`"${text}" #ChuckNorris #ChuckJokes`);
  const xURL = `https://x.com/intent/post?text=${postText}&url=${encodeURIComponent(window.location.href)}`;
  window.open(xURL, "_blank", "noopener,noreferrer");
}

// ==========================================================================
// 9. Favourites System & Manager Modal
// ==========================================================================

/**
 * Toggles bookmark status for the currently displayed joke.
 *
 * @returns {void}
 */
function toggleFavorite() {
  if (!state.currentJoke || !state.currentJoke.value || state.currentJoke.id === "not_found") {
    showToast("No joke to favourite!", "error");
    return;
  }

  const existingIdx = state.favorites.findIndex((f) => f.value === state.currentJoke?.value);

  if (existingIdx >= 0) {
    state.favorites.splice(existingIdx, 1);
    saveFavorites();
    updateFavoriteButtonState();
    showToast("Removed from favourites", "info");
  } else {
    state.favorites.unshift({
      id: state.currentJoke.id || Date.now().toString(),
      value: state.currentJoke.value,
      category: state.currentJoke.category || "General",
      date: new Date().toLocaleDateString(),
    });
    saveFavorites();
    updateFavoriteButtonState();
    showToast("Saved to favourites! ❤️", "success");
  }
}

/**
 * Removes a favourite item by its unique ID and refreshes the modal view.
 *
 * @param {string} id - ID of the joke to remove.
 * @returns {void}
 */
function removeFavoriteById(id) {
  state.favorites = state.favorites.filter((f) => f.id !== id);
  saveFavorites();
  updateFavoriteButtonState();
  renderFavoritesModal();
  showToast("Favourite removed", "info");
}

/**
 * Clears all saved favourites after confirmation.
 *
 * @returns {void}
 */
function clearAllFavorites() {
  if (state.favorites.length === 0) return;
  if (!confirm("Are you sure you want to delete all saved favourite jokes?")) return;

  state.favorites = [];
  saveFavorites();
  updateFavoriteButtonState();
  renderFavoritesModal();
  showToast("All favourites cleared", "info");
}

/**
 * Renders the saved favourites list into the favourites modal manager.
 *
 * @returns {void}
 */
function renderFavoritesModal() {
  const container = dom.favoritesListContainer;
  container.innerHTML = "";

  if (state.favorites.length === 0) {
    dom.btnClearAllFavorites.style.display = "none";
    container.innerHTML = `<p class="empty-state-text">No favourite jokes saved yet.<br>Click the ❤️ button on any joke to save it!</p>`;
    return;
  }

  dom.btnClearAllFavorites.style.display = "inline-flex";

  state.favorites.forEach((fav) => {
    const item = document.createElement("div");
    item.className = "favorite-item";
    item.innerHTML = `
      <div class="favorite-text">${escapeHtml(fav.value)}</div>
      <div class="favorite-actions">
        <button class="btn-fav-action btn-fav-copy" title="Copy joke" aria-label="Copy favourite joke">
          <i class="fa-regular fa-copy"></i>
        </button>
        <button class="btn-fav-action btn-fav-delete" title="Delete joke" aria-label="Delete favourite joke">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    // Copy action
    const btnCopy = item.querySelector(".btn-fav-copy");
    if (btnCopy) {
      btnCopy.addEventListener("click", () => {
        navigator.clipboard.writeText(fav.value);
        showToast("Favourite copied to clipboard!", "success");
      });
    }

    // Delete action
    const btnDelete = item.querySelector(".btn-fav-delete");
    if (btnDelete) {
      btnDelete.addEventListener("click", () => {
        removeFavoriteById(fav.id);
      });
    }

    container.appendChild(item);
  });
}

// ==========================================================================
// 10. Modal Dialogue Handlers
// ==========================================================================

/**
 * Opens an accessible modal dialogue overlay.
 *
 * @param {HTMLElement} modalEl - Modal container element to activate.
 * @returns {void}
 */
function openModal(modalEl) {
  modalEl.classList.add("active");
  modalEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

/**
 * Closes an accessible modal dialogue overlay.
 *
 * @param {HTMLElement} modalEl - Modal container element to deactivate.
 * @returns {void}
 */
function closeModal(modalEl) {
  modalEl.classList.remove("active");
  modalEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/**
 * Closes all open modal dialogues.
 *
 * @returns {void}
 */
function closeAllModals() {
  closeModal(dom.modalFavorites);
  closeModal(dom.modalShortcuts);
}

// ==========================================================================
// 11. Event Listeners & Keyboard Shortcuts
// ==========================================================================

/**
 * Registers all user event listeners, controls, and global keyboard shortcuts.
 *
 * @returns {void}
 */
function setupEventListeners() {
  // Theme Toggle
  dom.btnThemeToggle.addEventListener("click", toggleTheme);

  // Modals Toggle
  dom.btnFavoritesToggle.addEventListener("click", () => {
    renderFavoritesModal();
    openModal(dom.modalFavorites);
  });
  dom.btnCloseFavorites.addEventListener("click", () => closeModal(dom.modalFavorites));
  dom.btnCloseFavoritesAlt.addEventListener("click", () => closeModal(dom.modalFavorites));
  dom.btnClearAllFavorites.addEventListener("click", clearAllFavorites);

  dom.btnShortcutsToggle.addEventListener("click", () => openModal(dom.modalShortcuts));
  dom.btnCloseShortcuts.addEventListener("click", () => closeModal(dom.modalShortcuts));
  dom.btnCloseShortcutsAlt.addEventListener("click", () => closeModal(dom.modalShortcuts));

  // Close modals on outside click
  [dom.modalFavorites, dom.modalShortcuts].forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Action Buttons
  dom.btnCopy.addEventListener("click", copyCurrentJoke);
  dom.btnSpeak.addEventListener("click", toggleSpeech);
  dom.btnFavorite.addEventListener("click", toggleFavorite);
  dom.btnShare.addEventListener("click", shareCurrentJoke);

  // Search & Category Controls
  dom.selectCategory.addEventListener("change", (e) => {
    state.selectedCategory = /** @type {HTMLSelectElement} */ (e.target).value;
    dom.inputSearch.value = "";
    dom.btnClearInput.style.display = "none";
    fetchJoke(state.selectedCategory);
  });

  dom.inputSearch.addEventListener("input", (e) => {
    const val = /** @type {HTMLInputElement} */ (e.target).value;
    dom.btnClearInput.style.display = val ? "block" : "none";
    dom.btnNewJokeText.textContent = val.trim() ? "Search Joke" : "Get Joke";
  });

  dom.btnClearInput.addEventListener("click", () => {
    dom.inputSearch.value = "";
    dom.btnClearInput.style.display = "none";
    dom.btnNewJokeText.textContent = "Get Joke";
    dom.inputSearch.focus();
    clearStatusMessage();
    fetchJoke(state.selectedCategory);
  });

  dom.btnNewJoke.addEventListener("click", () => {
    const query = dom.inputSearch.value.trim();
    if (query) {
      searchJokes(query);
    } else {
      fetchJoke(state.selectedCategory);
    }
  });

  dom.btnPrev.addEventListener("click", prevSearchResult);
  dom.btnNext.addEventListener("click", nextSearchResult);

  // Keyboard Shortcuts
  document.addEventListener("keydown", (e) => {
    const isInputFocused =
      document.activeElement === dom.inputSearch ||
      document.activeElement === dom.selectCategory ||
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA" ||
      document.activeElement?.tagName === "SELECT";

    // Handle Escape key anywhere
    if (e.key === "Escape") {
      if (dom.modalFavorites.classList.contains("active") || dom.modalShortcuts.classList.contains("active")) {
        closeAllModals();
        return;
      }
      if (dom.inputSearch.value) {
        dom.inputSearch.value = "";
        dom.btnClearInput.style.display = "none";
        dom.btnNewJokeText.textContent = "Get Joke";
        fetchJoke(state.selectedCategory);
      }
      return;
    }

    // Enter in search input
    if (e.key === "Enter" && document.activeElement === dom.inputSearch) {
      e.preventDefault();
      const query = dom.inputSearch.value.trim();
      if (query) {
        searchJokes(query);
      } else {
        fetchJoke(state.selectedCategory);
      }
      return;
    }

    // Ignore single-key shortcuts while typing in inputs
    if (isInputFocused) return;

    if (e.key === " " || e.key === "n" || e.key === "N") {
      e.preventDefault();
      fetchJoke(state.selectedCategory);
    } else if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      copyCurrentJoke();
    } else if (e.key === "s" || e.key === "S") {
      e.preventDefault();
      toggleSpeech();
    } else if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      toggleFavorite();
    } else if (e.key === "t" || e.key === "T") {
      e.preventDefault();
      toggleTheme();
    } else if (e.key === "?") {
      e.preventDefault();
      openModal(dom.modalShortcuts);
    } else if (e.key === "/") {
      e.preventDefault();
      dom.inputSearch.focus();
      dom.inputSearch.select();
    } else if (e.key === "ArrowRight") {
      if (state.searchResults.length > 1) {
        e.preventDefault();
        nextSearchResult();
      }
    } else if (e.key === "ArrowLeft") {
      if (state.searchResults.length > 1) {
        e.preventDefault();
        prevSearchResult();
      }
    }
  });

  // Watch for OS theme changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (state.theme === "system") {
      setTheme("system", false);
    }
  });
}

// ==========================================================================
// 12. Service Worker (PWA Offline)
// ==========================================================================

/**
 * Registers the Service Worker for offline asset caching and PWA functionality.
 *
 * @returns {void}
 */
function registerServiceWorker() {
  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => {
          console.log("Service Worker registered successfully:", reg.scope);
        })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err);
        });
    });
  }
}

// ==========================================================================
// 13. Application Bootstrap
// ==========================================================================

/**
 * Initializes and bootstraps the application upon DOM load.
 *
 * @async
 * @returns {Promise<void>}
 */
async function initApp() {
  loadStoredState();
  setupEventListeners();
  registerServiceWorker();

  // Load categories in parallel with first joke
  await Promise.all([
    fetchCategories(),
    fetchJoke(),
  ]);
}

// Launch
initApp();

