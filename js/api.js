// Talking to the backend, authentication token management and DOM helpers.

const API_BASE = "http://127.0.0.1:8000/api/v1";

// Auth state stored in localStorage
const AUTH_STORAGE_KEY = "nullboard_auth";

function getAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setAuth(data) {
  if (!data) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  }
  updateAuthBar();
}

function getAccessToken() {
  const auth = getAuth();
  return auth ? auth.access : null;
}

function getRefreshToken() {
  const auth = getAuth();
  return auth ? auth.refresh : null;
}

function getCurrentUser() {
  const auth = getAuth();
  return auth ? auth.user : null;
}

function isAuthenticated() {
  return Boolean(getAccessToken());
}

function isAdmin() {
  const user = getCurrentUser();
  return Boolean(user && user.is_staff);
}

function logout() {
  setAuth(null);
  showFlash("Logged out successfully.");
  // If currently on an auth-only view, redirect to home
  if (location.hash.startsWith("#/admin") || location.hash.startsWith("#/new-thread")) {
    location.hash = "#/";
  } else {
    render();
  }
}

// Error thrown for every failed request. Keeps the HTTP status code and,
// for 400 validation errors, the per-field messages ({"field": ["..."]}).
class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

// HTTP status code of the latest API answer (e.g. 201), shown in the
// status line after a successful change.
let lastStatus = 0;

// Refresh access token transparently using refresh token
let refreshPromise = null;
async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error("No refresh token");
    try {
      const res = await fetch(`${API_BASE}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) throw new Error("Refresh failed");
      const data = await res.json();
      const current = getAuth() || {};
      current.access = data.access;
      setAuth(current);
      return data.access;
    } catch (err) {
      setAuth(null);
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

// Send a request to the API and return the parsed JSON body.
// Handles auto-attaching Bearer token and transparent silent token refresh on 401.
async function api(method, path, body, isRetry = false) {
  const options = { method, headers: {} };
  const token = getAccessToken();
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, options);
  } catch {
    throw new ApiError(0, "API at http://127.0.0.1:8000 is not running.");
  }

  // Handle 401: try silent refresh if not already retried and path is not login/refresh
  if (
    response.status === 401 &&
    !isRetry &&
    !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/refresh") &&
    getRefreshToken()
  ) {
    try {
      await refreshAccessToken();
      return await api(method, path, body, true);
    } catch {
      // Refresh expired, user must log in again
    }
  }

  lastStatus = response.status;
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, data.message || `HTTP ${response.status}`, data.fields);
  }
  return data;
}

// "409 · Thread #11 is locked..." - status code first, then the API message.
function errorText(error) {
  return `${error.status || "network"} · ${error.message}`;
}

// Create an element with a class and text (textContent is safe against XSS).
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Create a link to a route inside the app, e.g. link("#/boards/sec", "/sec/").
function link(href, text, className) {
  const a = el("a", className, text);
  a.href = href;
  return a;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function showFlash(message, isError = false) {
  const flash = document.getElementById("flash");
  if (!flash) return;
  flash.textContent = message;
  flash.className = `status flash ${isError ? "error" : "success"}`;
  flash.style.display = "block";
  clearTimeout(flash._timer);
  flash._timer = setTimeout(() => {
    flash.style.display = "none";
  }, 4000);
}

// Update Topbar auth badge & action buttons
function updateAuthBar() {
  const container = document.getElementById("auth-bar");
  if (!container) return;
  container.innerHTML = "";

  const user = getCurrentUser();
  if (user) {
    const info = el("span", "auth-user-badge");
    info.appendChild(el("span", "user-icon", "●"));
    info.appendChild(document.createTextNode(` ${user.username}`));
    if (user.is_staff) {
      info.appendChild(el("span", "role-tag admin", "admin"));
    } else {
      info.appendChild(el("span", "role-tag user", "user"));
    }
    container.appendChild(info);

    const logoutBtn = el("button", "btn-subtle", "Logout");
    logoutBtn.type = "button";
    logoutBtn.addEventListener("click", () => logout());
    container.appendChild(logoutBtn);
  } else {
    container.appendChild(link("#/login", "Login", "auth-link"));
    container.appendChild(link("#/register", "Register", "auth-link highlight"));
  }
}
