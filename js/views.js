// One function per page. Each one loads data from the API and returns
// the DOM nodes for that page; app.js puts them into <main id="app">.

// A tiled "window" with a small uppercase label on top.
function panel(label, ...children) {
  const section = el("section", "panel");
  section.append(el("h2", "label", label), ...children);
  return section;
}

// A row of small buttons / foldouts under an item.
function toolbar(...children) {
  const bar = el("div", "toolbar");
  bar.append(...children);
  return bar;
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

// "new thread" form. boardSlugs: boards to choose from; selected: preselected board.
function newThreadForm(boardSlugs, tagSlugs, selected) {
  const form = buildForm(
    [
      { name: "board", label: "board", type: "select", options: boardSlugs, value: selected },
      { name: "subject", label: "subject" },
      { name: "body", label: "body", type: "textarea" },
      { name: "name", label: "name (optional)" },
      { name: "tags", label: "tags", type: "checkboxes", options: tagSlugs },
    ],
    "create thread",
    async (values) => {
      const thread = await api("POST", "/threads/", values);
      return `thread #${thread.id} created`;
    },
  );
  return foldout("[+] new thread", form);
}

// #/  - boards list and the thread feed with the ordering selector.
async function renderHome() {
  const [boards, threads, tags] = await Promise.all([
    api("GET", "/boards/"),
    api("GET", `/threads/?ordering=${ordering}`),
    api("GET", "/tags/"),
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

  const newBoard = buildForm(
    [
      { name: "slug", label: "slug" },
      { name: "title", label: "title" },
      { name: "description", label: "description", type: "textarea" },
    ],
    "create board",
    async (values) => {
      const board = await api("POST", "/boards/", values);
      return `board /${board.slug}/ created`;
    },
  );

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
  const head = el("div", "panel-head");
  head.append(el("h2", "label", "threads"), orderLabel);

  const threadsPanel = el("section", "panel");
  threadsPanel.append(
    head,
    newThreadForm(boards.map((b) => b.slug), tags.map((t) => t.slug)),
    threadList(threads),
  );

  return [panel("boards", foldout("[+] new board", newBoard), boardList), threadsPanel];
}

// #/boards/{slug}  - one board and its threads.
async function renderBoard(slug) {
  const [board, threads, boards, tags] = await Promise.all([
    api("GET", `/boards/${slug}/`),
    api("GET", "/threads/?ordering=-bumped_at"),
    api("GET", "/boards/"),
    api("GET", "/tags/"),
  ]);
  // The API has no ?board= filter, so we load all threads and keep
  // only the ones that belong to this board on the client.
  const own = threads.filter((thread) => thread.board === board.slug);

  const editForm = buildForm(
    [
      { name: "title", label: "title", value: board.title },
      { name: "description", label: "description", type: "textarea", value: board.description },
    ],
    "save board",
    async (values) => {
      await api("PATCH", `/boards/${board.slug}/`, values);
      return `board /${board.slug}/ updated`;
    },
  );

  const info = el("div");
  info.append(
    el("span", "slug", `/${board.slug}/ `),
    el("span", "title", board.title),
    el("p", "body", board.description),
    el("div", "meta", `${board.thread_count} threads`),
    toolbar(
      foldout("edit", editForm),
      deleteButton(
        `Delete board /${board.slug}/? Its ${board.thread_count} thread(s) will be deleted too.`,
        `/boards/${board.slug}/`,
        `board /${board.slug}/ deleted`,
        "#/",
      ),
    ),
  );

  const threadsPanel = panel(
    "threads",
    newThreadForm(boards.map((b) => b.slug), tags.map((t) => t.slug), board.slug),
    threadList(own),
  );
  return [panel("board", info), threadsPanel];
}

// #/threads/{id}  - the opening post, all replies and the reply form.
async function renderThread(id) {
  const [thread, posts, tags] = await Promise.all([
    api("GET", `/threads/${id}/`),
    api("GET", `/threads/${id}/posts/`),
    api("GET", "/tags/"),
  ]);

  const editForm = buildForm(
    [
      { name: "subject", label: "subject", value: thread.subject },
      { name: "body", label: "body", type: "textarea", value: thread.body },
      { name: "name", label: "name (optional)", value: thread.name },
      { name: "tags", label: "tags", type: "checkboxes", options: tags.map((t) => t.slug), value: thread.tags },
    ],
    "save thread",
    async (values) => {
      await api("PATCH", `/threads/${thread.id}/`, values);
      return `thread #${thread.id} updated`;
    },
  );

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
  op.append(
    meta,
    el("p", "body", thread.body),
    toolbar(
      foldout("edit", editForm),
      actionButton(thread.is_pinned ? "unpin" : "pin", async () => {
        await api("PATCH", `/threads/${thread.id}/`, { is_pinned: !thread.is_pinned });
        return `thread #${thread.id} ${thread.is_pinned ? "unpinned" : "pinned"}`;
      }),
      actionButton(thread.is_locked ? "unlock" : "lock", async () => {
        await api("PATCH", `/threads/${thread.id}/`, { is_locked: !thread.is_locked });
        return `thread #${thread.id} ${thread.is_locked ? "unlocked" : "locked"}`;
      }),
      deleteButton(
        `Delete thread #${thread.id} and all its replies?`,
        `/threads/${thread.id}/`,
        `thread #${thread.id} deleted`,
        `#/boards/${thread.board}`,
      ),
    ),
  );

  const list = el("ul", "list");
  if (!posts.length) list.append(el("li", "meta", "No replies yet."));
  for (const post of posts) {
    const postForm = buildForm(
      [
        { name: "body", label: "body", type: "textarea", value: post.body },
        { name: "name", label: "name (optional)", value: post.name },
      ],
      "save post",
      async (values) => {
        await api("PATCH", `/posts/${post.id}/`, values);
        return `post #${post.id} updated`;
      },
    );
    const item = el("li");
    item.append(
      el("div", "meta", `#${post.id} ${post.name || "Anonymous"} · ${formatDate(post.created_at)}`),
      el("p", "body", post.body),
      toolbar(
        foldout("edit", postForm),
        deleteButton(`Delete post #${post.id}?`, `/posts/${post.id}/`, `post #${post.id} deleted`),
      ),
    );
    list.append(item);
  }

  const replyForm = buildForm(
    [
      { name: "body", label: "body", type: "textarea" },
      { name: "name", label: "name (optional)" },
    ],
    "reply",
    async (values) => {
      const post = await api("POST", `/threads/${thread.id}/posts/`, values);
      return `post #${post.id} created`;
    },
  );

  const view = panel("thread", op, list, el("h2", "label", "reply"), replyForm);
  view.classList.add("wide");
  return [view];
}

// #/tags  - all tags.
async function renderTags() {
  const tags = await api("GET", "/tags/");

  const newTag = buildForm(
    [
      { name: "slug", label: "slug" },
      { name: "title", label: "title" },
    ],
    "create tag",
    async (values) => {
      const tag = await api("POST", "/tags/", values);
      return `tag #${tag.slug} created`;
    },
  );

  const list = el("ul", "list");
  if (!tags.length) list.append(el("li", "meta", "No tags yet."));
  for (const tag of tags) {
    const editForm = buildForm(
      [{ name: "title", label: "title", value: tag.title }],
      "save tag",
      async (values) => {
        await api("PATCH", `/tags/${tag.slug}/`, values);
        return `tag #${tag.slug} updated`;
      },
    );
    const item = el("li");
    item.append(
      el("span", "tag", `#${tag.slug}`),
      el("span", "title", tag.title),
      toolbar(
        foldout("edit", editForm),
        deleteButton(`Delete tag #${tag.slug}?`, `/tags/${tag.slug}/`, `tag #${tag.slug} deleted`),
      ),
    );
    list.append(item);
  }
  const view = panel("tags", foldout("[+] new tag", newTag), list);
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
