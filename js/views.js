// One function per page. Each one loads data from the API and returns
// the DOM nodes for that page; app.js puts them into <main id="app">.

// A tiled "window" with a small uppercase label on top.
function panel(label, ...children) {
  const section = el("section", "panel");
  section.append(el("h2", "label", label), ...children);
  return section;
}

// Thread ordering for the home feed, remembered between renders.
let ordering = "-bumped_at";

// <ul> of threads; each subject and board is a link.
function threadList(threads) {
  const list = el("ul", "list");
  if (!threads.length) list.append(el("li", "meta", "No threads yet."));
  for (const thread of threads) {
    const item = el("li");
    if (thread.is_pinned) item.append(el("span", "pinned", "[PINNED]"));
    if (thread.is_locked) item.append(el("span", "locked", "[LOCKED]"));
    item.append(
      link(`#/boards/${thread.board}`, `/${thread.board}/`, "slug"),
      " ",
      link(`#/threads/${thread.id}`, thread.subject, "title"),
    );
    const meta = el("div", "meta");
    for (const tag of thread.tags) meta.append(link("#/tags", `#${tag}`, "tag"));
    meta.append(
      `${thread.reply_count} replies · created ${formatDate(thread.created_at)}` +
        ` · bumped ${formatDate(thread.bumped_at)}`,
    );
    item.append(meta);
    list.append(item);
  }
  return list;
}

// #/  - boards list and the thread feed with the ordering selector.
async function renderHome() {
  const [boards, threads] = await Promise.all([
    api("GET", "/boards/"),
    api("GET", `/threads/?ordering=${ordering}`),
  ]);

  const boardList = el("ul", "list");
  if (!boards.length) boardList.append(el("li", "meta", "No boards yet."));
  for (const board of boards) {
    const item = el("li");
    item.append(
      link(`#/boards/${board.slug}`, `/${board.slug}/`, "slug"),
      " ",
      el("span", "title", board.title),
      el("p", "body", board.description),
      el("div", "meta", `${board.thread_count} threads`),
    );
    boardList.append(item);
  }

  const select = el("select");
  for (const [value, text] of [
    ["-bumped_at", "Active"],
    ["-created_at", "New"],
    ["-reply_count", "Most replies"],
  ]) {
    const option = el("option", "", text);
    option.value = value;
    select.append(option);
  }
  select.value = ordering;
  select.addEventListener("change", () => {
    ordering = select.value;
    render();
  });
  const orderLabel = el("label", "label", "order ");
  orderLabel.append(select);

  const threadsPanel = panel("threads", threadList(threads));
  threadsPanel.querySelector(".label").replaceWith(headRow("threads", orderLabel));

  return [panel("boards", boardList), threadsPanel];
}

// A panel header row: label on the left, extra controls on the right.
function headRow(label, ...controls) {
  const row = el("div", "panel-head");
  row.append(el("h2", "label", label), ...controls);
  return row;
}

// #/boards/{slug}  - one board and its threads.
async function renderBoard(slug) {
  const [board, threads] = await Promise.all([
    api("GET", `/boards/${slug}/`),
    api("GET", "/threads/?ordering=-bumped_at"),
  ]);
  // The API has no ?board= filter, so we load all threads and keep
  // only the ones that belong to this board on the client.
  const own = threads.filter((thread) => thread.board === board.slug);

  const info = el("div");
  info.append(
    el("span", "slug", `/${board.slug}/ `),
    el("span", "title", board.title),
    el("p", "body", board.description),
    el("div", "meta", `${board.thread_count} threads`),
  );
  return [panel("board", info), panel("threads", threadList(own))];
}

// #/threads/{id}  - the opening post and all replies.
async function renderThread(id) {
  const [thread, posts] = await Promise.all([
    api("GET", `/threads/${id}/`),
    api("GET", `/threads/${id}/posts/`),
  ]);

  const op = el("article", "op");
  if (thread.is_pinned) op.append(el("span", "pinned", "[PINNED]"));
  if (thread.is_locked) op.append(el("span", "locked", "[LOCKED]"));
  op.append(
    link(`#/boards/${thread.board}`, `/${thread.board}/`, "slug"),
    ` #${thread.id} `,
    el("span", "title", thread.subject),
  );
  const meta = el("div", "meta");
  for (const tag of thread.tags) meta.append(link("#/tags", `#${tag}`, "tag"));
  meta.append(`${thread.name || "Anonymous"} · ${formatDate(thread.created_at)}`);
  op.append(meta, el("p", "body", thread.body));

  const list = el("ul", "list");
  if (!posts.length) list.append(el("li", "meta", "No replies yet."));
  for (const post of posts) {
    const item = el("li");
    item.append(
      el("div", "meta", `#${post.id} ${post.name || "Anonymous"} · ${formatDate(post.created_at)}`),
      el("p", "body", post.body),
    );
    list.append(item);
  }

  const view = panel("thread", op, list);
  view.classList.add("wide");
  return [view];
}

// #/tags  - all tags.
async function renderTags() {
  const tags = await api("GET", "/tags/");
  const list = el("ul", "list");
  if (!tags.length) list.append(el("li", "meta", "No tags yet."));
  for (const tag of tags) {
    const item = el("li");
    item.append(el("span", "tag", `#${tag.slug}`), el("span", "title", tag.title));
    list.append(item);
  }
  const view = panel("tags", list);
  view.classList.add("wide");
  return [view];
}

// Shown for unknown routes and for 404 answers from the API.
function renderNotFound(message) {
  const view = panel(
    "not found",
    el("p", "status error", message),
    link("#/", "<- back to all boards"),
  );
  view.classList.add("wide");
  return [view];
}
