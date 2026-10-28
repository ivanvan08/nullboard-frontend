// Hash router: reads location.hash, picks a view from views.js and
// puts the result into <main id="app">.
//
//   #/                -> renderHome()
//   #/boards/{slug}   -> renderBoard(slug)
//   #/threads/{id}    -> renderThread(id)
//   #/tags            -> renderTags()
//   anything else     -> renderNotFound()

// Turn "#/boards/sec" into a promise of DOM nodes for that page.
function route(hash) {
  // "#/boards/sec" -> ["boards", "sec"]; "" or "#/" -> []
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);

  if (parts.length === 0) return renderHome();
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
  const app = document.getElementById("app");
  const hash = location.hash;
  let nodes;
  try {
    nodes = await route(hash);
  } catch (error) {
    if (error.status === 404) {
      nodes = renderNotFound(`404 · ${error.message}`);
    } else {
      const box = el("p", "status error", `${error.status || "network"} · ${error.message}`);
      nodes = [panel("error", box)];
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
render();
