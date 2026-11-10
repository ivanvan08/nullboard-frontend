// Hash router: reads location.hash, picks a view from views.js and
// puts the result into <main id="app">.
//
//   #/                -> renderHome()
//   #/boards/{slug}   -> renderBoard(slug)
//   #/threads/{id}    -> renderThread(id)
//   #/tags            -> renderTags()
//   #/login           -> renderLogin()
//   #/register        -> renderRegister()
//   #/admin           -> renderAdmin()
//   anything else     -> renderNotFound()

// Turn "#/boards/sec" into a promise of DOM nodes for that page.
function route(hash) {
  // Strip #, split by ? for query params
  const [pathPart, queryPart] = hash.replace(/^#\/?/, "").split("?");
  const parts = pathPart.split("/").filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(queryPart || "");
  const nextRoute = query.get("next") || "#/";

  if (parts.length === 0) return renderHome();
  if (parts[0] === "login") return renderLogin(nextRoute);
  if (parts[0] === "register") return renderRegister(nextRoute);
  if (parts[0] === "admin") return renderAdmin();
  if (parts[0] === "boards" && parts.length === 2) return renderBoard(parts[1]);
  if (parts[0] === "threads" && parts.length === 2 && /^\d+$/.test(parts[1])) {
    return renderThread(parts[1]);
  }
  if (parts[0] === "tags" && parts.length === 1) return renderTags();
  return renderNotFound(`No page for ${hash}`);
}

// Render the page for the current hash. Called on load, on every
// hash change (links, Back/Forward, typing a URL) and after each change.
async function render() {
  updateAuthBar();
  const app = document.getElementById("app");
  const hash = location.hash;
  let nodes;
  try {
    nodes = await route(hash);
  } catch (error) {
    if (error.status === 404) {
      nodes = renderNotFound(errorText(error));
    } else {
      nodes = [panel("error", el("p", "status error", errorText(error)))];
    }
  }
  // Ignore a slow answer if the user already went to another page.
  if (hash !== location.hash) return;
  app.replaceChildren(...nodes);
}

window.addEventListener("hashchange", () => {
  render();
  window.scrollTo(0, 0);
});

// Initial boot
render();
