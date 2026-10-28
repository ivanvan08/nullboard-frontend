// Talking to the backend and small DOM helpers shared by all other files.

const API_BASE = "http://127.0.0.1:8000/api/v1";

// Error thrown for every failed request. Keeps the HTTP status code and,
// for 400 validation errors, the per-field messages ({"field": ["..."]}).
class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

// Send a request to the API and return the parsed JSON body.
// method: "GET", "POST", "PATCH" or "DELETE"; body: a plain object or undefined.
// Returns null for 204 No Content. Throws ApiError on any non-2xx answer.
async function api(method, path, body) {
  const options = { method, headers: {} };
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
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, data.message || `HTTP ${response.status}`, data.fields);
  }
  return data;
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
