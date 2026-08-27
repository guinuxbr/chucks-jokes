/**
 * Chuck's Jokes - Application Logic & Services
 * ============================================
 */

// --- DOM Element Selectors ---
const dom = {
  jokeCard: document.getElementById("joke-card"),
  jokeContent: document.getElementById("joke-content"),
  jokeText: document.getElementById("joke"),
  cardSkeleton: document.getElementById("card-skeleton"),
  badgeCategory: document.getElementById("badge-category"),
  badgeCounter: document.getElementById("badge-counter"),
  
  // Actions
  btnCopy: document.getElementById("btn-copy"),
  btnSpeak: document.getElementById("btn-speak"),
  iconSpeak: document.getElementById("icon-speak"),
  labelSpeak: document.getElementById("label-speak"),
  btnFavorite: document.getElementById("btn-favorite"),
  iconFavorite: document.getElementById("icon-favorite"),
  labelFavorite: document.getElementById("label-favorite"),
  btnShare: document.getElementById("btn-share"),
  
  // Controls
  selectCategory: document.getElementById("select-category"),
  inputSearch: document.getElementById("input-search"),
  btnClearInput: document.getElementById("btn-clear"),
  btnNewJoke: document.getElementById("btn-new-joke"),
  btnNewJokeText: document.getElementById("btn-new-joke-text"),
  
  // Pagination
  searchPagination: document.getElementById("search-pagination"),
  btnPrev: document.getElementById("btn-prev"),
  btnNext: document.getElementById("btn-next"),
  paginationText: document.getElementById("pagination-text"),
  
  // Status & Toasts
  statusMessage: document.getElementById("status-message"),
  toastContainer: document.getElementById("toast-container"),
  
  // Header Tools
  btnThemeToggle: document.getElementById("btn-theme-toggle"),
  iconTheme: document.getElementById("icon-theme"),
  btnFavoritesToggle: document.getElementById("btn-favorites-toggle"),
  favoritesBadge: document.getElementById("favorites-badge"),
  btnShortcutsToggle: document.getElementById("btn-shortcuts-toggle"),
  
  // Modals
  modalFavorites: document.getElementById("modal-favorites"),
  btnCloseFavorites: document.getElementById("btn-close-favorites"),
  btnCloseFavoritesAlt: document.getElementById("btn-close-favorites-alt"),
  favoritesListContainer: document.getElementById("favorites-list-container"),
  btnClearAllFavorites: document.getElementById("btn-clear-all-favorites"),
  
  modalShortcuts: document.getElementById("modal-shortcuts"),
  btnCloseShortcuts: document.getElementById("btn-close-shortcuts"),
  btnCloseShortcutsAlt: document.getElementById("btn-close-shortcuts-alt"),
};

// --- Application State ---
const state = {
  currentJoke: null,
  searchResults: [],
  searchIndex: 0,
  searchQuery: "",
  selectedCategory: "",
  isLoading: false,
  isSpeaking: false,
  speechSynth: window.speechSynthesis || null,
  currentUtterance: null,
  favorites: [],
  theme: "system",
  activeAbortController: null,
};

// --- Storage Keys ---
const STORAGE_KEYS = {
  FAVORITES: "chucks_jokes_favorites_v1",
  THEME: "chucks_jokes_theme_v1",
};

// ==========================================================================
// 1. Storage & State Management
// ==========================================================================

function loadStoredState() {
  // Load Favorites
  try {
    const storedFavs = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (storedFavs) {
      state.favorites = JSON.parse(storedFavs);
    }
  } catch (e) {
    console.error("Failed to load favorites from localStorage:", e);
    state.favorites = [];
  }
  updateFavoritesBadge();

  // Load Theme
  try {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || "system";
    setTheme(storedTheme, false);
  } catch (e) {
    console.error("Failed to load theme preference:", e);
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(state.favorites));
  } catch (e) {
    console.error("Failed to save favorites to localStorage:", e);
  }
  updateFavoritesBadge();
}

// ==========================================================================
// 2. Toast Notifications
// ==========================================================================

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

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================================================
// 3. UI Status & Loading State
// ==========================================================================

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

function setStatusMessage(msg, type = "info") {
  dom.statusMessage.className = `status-message ${type}`;
  dom.statusMessage.textContent = msg;
}

function clearStatusMessage() {
  dom.statusMessage.textContent = "";
  dom.statusMessage.className = "status-message";
}

// ==========================================================================
// 4. API Services
// ==========================================================================

const API_BASE = "https://api.chucknorris.io/jokes";

async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const categories = await res.json();
    
    // Populate category dropdown
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

async function fetchJoke(category = "") {
  // Cancel previous fetch if still in progress
  if (state.activeAbortController) {
    state.activeAbortController.abort();
  }
  state.activeAbortController = new AbortController();

  setLoading(true);
  clearStatusMessage();

  // Reset search results state
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
    const data = await res.json();

    state.currentJoke = {
      id: data.id,
      value: data.value,
      category: data.categories && data.categories.length > 0 ? data.categories[0] : (category || "Random"),
      url: data.url,
    };

    displayJoke(state.currentJoke);
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error("Error fetching joke:", error);
    setStatusMessage("Could not retrieve a joke. Check your connection and try again.", "error");
    showToast("Network error. Please try again.", "error");
  } finally {
    setLoading(false);
  }
}

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
    if (error.name === "AbortError") return;
    console.error("Error searching jokes:", error);
    setStatusMessage("Error searching for jokes. Please try again.", "error");
    showToast("Error executing search.", "error");
  } finally {
    setLoading(false);
  }
}

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

function nextSearchResult() {
  if (state.searchResults.length <= 1) return;
  state.searchIndex = (state.searchIndex + 1) % state.searchResults.length;
  loadCurrentSearchResult();
}

function prevSearchResult() {
  if (state.searchResults.length <= 1) return;
  state.searchIndex = (state.searchIndex - 1 + state.searchResults.length) % state.searchResults.length;
  loadCurrentSearchResult();
}

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
// 5. Display & Rendering
// ==========================================================================

function displayJoke(joke) {
  if (!joke || !joke.value) return;

  // Adapt font size for long jokes
  if (joke.value.length > 120) {
    dom.jokeText.classList.add("long-joke");
  } else {
    dom.jokeText.classList.remove("long-joke");
  }

  dom.jokeText.textContent = joke.value;

  // Category Badge
  let catName = joke.category || "Random";
  if (catName.toLowerCase() === "random") {
    dom.badgeCategory.textContent = "🎲 Random";
  } else {
    dom.badgeCategory.textContent = `🏷️ ${catName.charAt(0).toUpperCase() + catName.slice(1)}`;
  }

  updateFavoriteButtonState();
}

function isCurrentJokeFavorite() {
  if (!state.currentJoke || !state.currentJoke.value) return false;
  return state.favorites.some((fav) => fav.value === state.currentJoke.value);
}

function updateFavoriteButtonState() {
  const isFav = isCurrentJokeFavorite();
  if (isFav) {
    dom.btnFavorite.classList.add("active-favorite");
    dom.iconFavorite.className = "fa-solid fa-heart";
    dom.labelFavorite.textContent = "Favorited";
  } else {
    dom.btnFavorite.classList.remove("active-favorite");
    dom.iconFavorite.className = "fa-regular fa-heart";
    dom.labelFavorite.textContent = "Favorite";
  }
}

function updateFavoritesBadge() {
  const count = state.favorites.length;
  if (count > 0) {
    dom.favoritesBadge.style.display = "inline-block";
    dom.favoritesBadge.textContent = count > 99 ? "99+" : count;
  } else {
    dom.favoritesBadge.style.display = "none";
  }
}

// ==========================================================================
// 6. Action Features: Copy, TTS, Share, Favorites
// ==========================================================================

async function copyCurrentJoke() {
  const text = state.currentJoke?.value || dom.jokeText.textContent;
  if (!text) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback
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

  // Pick an English voice if available
  const voices = state.speechSynth.getVoices();
  const enVoice = voices.find((v) => v.lang.startsWith("en") && !v.name.includes("Google"));
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

function stopSpeech() {
  if (state.speechSynth) {
    state.speechSynth.cancel();
  }
  state.isSpeaking = false;
  dom.btnSpeak.classList.remove("speaking");
  dom.iconSpeak.className = "fa-solid fa-volume-high";
  dom.labelSpeak.textContent = "Listen";
}

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
      if (err.name !== "AbortError") {
        console.warn("Native share error, falling back to X:", err);
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

function toggleFavorite() {
  if (!state.currentJoke || !state.currentJoke.value || state.currentJoke.id === "not_found") {
    showToast("No joke to favorite!", "error");
    return;
  }

  const existingIdx = state.favorites.findIndex((f) => f.value === state.currentJoke.value);

  if (existingIdx >= 0) {
    state.favorites.splice(existingIdx, 1);
    saveFavorites();
    updateFavoriteButtonState();
    showToast("Removed from favorites", "info");
  } else {
    state.favorites.unshift({
      id: state.currentJoke.id || Date.now().toString(),
      value: state.currentJoke.value,
      category: state.currentJoke.category || "General",
      date: new Date().toLocaleDateString(),
    });
    saveFavorites();
    updateFavoriteButtonState();
    showToast("Saved to favorites! ❤️", "success");
  }
}

function removeFavoriteById(id) {
  state.favorites = state.favorites.filter((f) => f.id !== id);
  saveFavorites();
  updateFavoriteButtonState();
  renderFavoritesModal();
  showToast("Favorite removed", "info");
}

function clearAllFavorites() {
  if (state.favorites.length === 0) return;
  if (!confirm("Are you sure you want to delete all saved favorite jokes?")) return;

  state.favorites = [];
  saveFavorites();
  updateFavoriteButtonState();
  renderFavoritesModal();
  showToast("All favorites cleared", "info");
}

// ==========================================================================
// 7. Modals (Favorites & Shortcuts)
// ==========================================================================

function openModal(modalEl) {
  modalEl.classList.add("active");
  modalEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(modalEl) {
  modalEl.classList.remove("active");
  modalEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function closeAllModals() {
  closeModal(dom.modalFavorites);
  closeModal(dom.modalShortcuts);
}

function renderFavoritesModal() {
  const container = dom.favoritesListContainer;
  container.innerHTML = "";

  if (state.favorites.length === 0) {
    dom.btnClearAllFavorites.style.display = "none";
    container.innerHTML = `<p class="empty-state-text">No favorite jokes saved yet.<br>Click the ❤️ button on any joke to save it!</p>`;
    return;
  }

  dom.btnClearAllFavorites.style.display = "inline-flex";

  state.favorites.forEach((fav) => {
    const item = document.createElement("div");
    item.className = "favorite-item";
    item.innerHTML = `
      <div class="favorite-text">${escapeHtml(fav.value)}</div>
      <div class="favorite-actions">
        <button class="btn-fav-action btn-fav-copy" title="Copy joke" aria-label="Copy favorite joke">
          <i class="fa-regular fa-copy"></i>
        </button>
        <button class="btn-fav-action btn-fav-delete" title="Delete joke" aria-label="Delete favorite joke">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    // Copy action
    item.querySelector(".btn-fav-copy").addEventListener("click", () => {
      navigator.clipboard.writeText(fav.value);
      showToast("Favorite copied to clipboard!", "success");
    });

    // Delete action
    item.querySelector(".btn-fav-delete").addEventListener("click", () => {
      removeFavoriteById(fav.id);
    });

    container.appendChild(item);
  });
}

// ==========================================================================
// 8. Theme Manager
// ==========================================================================

function setTheme(theme, save = true) {
  state.theme = theme;
  if (save) {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e) {}
  }

  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    dom.iconTheme.className = "fa-solid fa-sun";
  } else if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    dom.iconTheme.className = "fa-solid fa-moon";
  } else {
    // System Default
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    dom.iconTheme.className = prefersDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  setTheme(next, true);
  showToast(`Switched to ${next} theme`, "info", 1500);
}

// ==========================================================================
// 9. Event Listeners & Keyboard Shortcuts
// ==========================================================================

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
    state.selectedCategory = e.target.value;
    dom.inputSearch.value = "";
    dom.btnClearInput.style.display = "none";
    fetchJoke(state.selectedCategory);
  });

  dom.inputSearch.addEventListener("input", (e) => {
    dom.btnClearInput.style.display = e.target.value ? "block" : "none";
    dom.btnNewJokeText.textContent = e.target.value.trim() ? "Search Joke" : "Get Joke";
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
      document.activeElement.tagName === "INPUT" ||
      document.activeElement.tagName === "TEXTAREA";

    // Handle Escape anywhere
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

    // Ignore single-key shortcuts while typing in input
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
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (state.theme === "system") {
      setTheme("system", false);
    }
  });
}

// ==========================================================================
// 10. Service Worker (PWA Offline)
// ==========================================================================

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
// 11. App Initialization
// ==========================================================================

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
