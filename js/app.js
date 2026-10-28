const API_BASE = "http://127.0.0.1:8000/api/v1";

// Fetch JSON from the API. Throws an Error with the server "message" on failure.
async function getJSON(path) {
  let response;
  try {
    response = await fetch(API_BASE + path);
  } catch {
    throw new Error("API at http://127.0.0.1:8000 is not running.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
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

function setStatus(id, text, isError = false) {
  const node = document.getElementById(id);
  node.textContent = text;
  node.classList.toggle("error", isError);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

async function loadBoards() {
  const list = document.getElementById("boards");
  list.replaceChildren();
  setStatus("boards-status", "Loading...");
  try {
    const boards = await getJSON("/boards/");
    setStatus("boards-status", boards.length ? "" : "No boards yet.");
    for (const board of boards) {
      const item = el("li");
      item.append(
        el("span", "slug", `/${board.slug}/ `),
        el("span", "title", board.title),
        el("p", "body", board.description),
        el("div", "meta", `${board.thread_count} threads`),
      );
      list.append(item);
    }
  } catch (error) {
    setStatus("boards-status", error.message, true);
  }
}

async function loadThreads() {
  const list = document.getElementById("threads");
  const ordering = document.getElementById("ordering").value;
  list.replaceChildren();
  setStatus("threads-status", "Loading...");
  try {
    const threads = await getJSON(`/threads/?ordering=${ordering}`);
    setStatus("threads-status", threads.length ? "" : "No threads yet.");
    for (const thread of threads) {
      const item = el("li", "thread-item");
      if (thread.is_pinned) item.append(el("span", "pinned", "[PINNED]"));
      if (thread.is_locked) item.append(el("span", "locked", "[LOCKED]"));
      item.append(
        el("span", "slug", `/${thread.board}/ `),
        el("span", "title", thread.subject),
      );
      const meta = el("div", "meta");
      for (const tag of thread.tags) meta.append(el("span", "tag", `#${tag}`));
      meta.append(
        `${thread.reply_count} replies · created ${formatDate(thread.created_at)}` +
          ` · bumped ${formatDate(thread.bumped_at)}`,
      );
      item.append(meta);
      item.addEventListener("click", () => {
        document.querySelectorAll(".thread-item.active").forEach((n) => n.classList.remove("active"));
        item.classList.add("active");
        showThread(thread);
      });
      list.append(item);
    }
  } catch (error) {
    setStatus("threads-status", error.message, true);
  }
}

async function showThread(thread) {
  const view = document.getElementById("thread-view");
  const article = document.getElementById("thread");
  const list = document.getElementById("posts");
  view.hidden = false;
  article.replaceChildren(
    el("span", "slug", `/${thread.board}/ #${thread.id} `),
    el("span", "title", thread.subject),
    el("div", "meta", `${thread.name || "Anonymous"} · ${formatDate(thread.created_at)}`),
    el("p", "body", thread.body),
  );
  list.replaceChildren();
  setStatus("posts-status", "Loading...");
  try {
    const posts = await getJSON(`/threads/${thread.id}/posts/`);
    setStatus("posts-status", posts.length ? "" : "No replies yet.");
    for (const post of posts) {
      const item = el("li");
      item.append(
        el("div", "meta", `#${post.id} ${post.name || "Anonymous"} · ${formatDate(post.created_at)}`),
        el("p", "body", post.body),
      );
      list.append(item);
    }
  } catch (error) {
    setStatus("posts-status", error.message, true);
  }
  view.scrollIntoView({ behavior: "smooth" });
}

document.getElementById("ordering").addEventListener("change", loadThreads);
loadBoards();
loadThreads();
