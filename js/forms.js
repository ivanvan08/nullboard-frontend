// Inline forms and buttons that change data through the API.
// After every successful change the current page is rendered again
// from the API (render() in app.js), we never patch the page by hand.

// Short status line under the top bar.
let flashTimer;
function flash(text, isError = false) {
  const node = document.getElementById("flash");
  node.textContent = text;
  node.classList.toggle("error", isError);
  clearTimeout(flashTimer);
  if (!isError) flashTimer = setTimeout(() => (node.textContent = ""), 5000);
}

// Build a form from a list of field descriptions:
//   { name: "title", label: "title", type: "text" | "textarea" | "select" | "checkboxes",
//     value: "...", options: [...] }   (options only for select / checkboxes)
// On submit: read the values, call send(values), which talks to the API and
// returns a success message; then show it and re-render the page.
function buildForm(fields, submitText, send) {
  const form = el("form", "form");
  for (const field of fields) {
    form.append(fieldRow(field));
  }
  const button = el("button", "", submitText);
  button.type = "submit";
  form.append(el("p", "status error form-error"), button);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    form.querySelector(".form-error").textContent = "";
    try {
      const message = await send(readForm(form, fields));
      flash(message);
      await render();
    } catch (error) {
      form.querySelector(".form-error").textContent = error.message;
    }
  });
  return form;
}

// One labelled input (or a group of checkboxes) for buildForm.
function fieldRow(field) {
  if (field.type === "checkboxes") {
    const row = el("div", "field");
    row.append(el("span", "field-label", field.label));
    const group = el("span", "checks");
    if (!field.options.length) group.append(el("span", "meta", "none"));
    for (const option of field.options) {
      const box = el("input");
      box.type = "checkbox";
      box.name = field.name;
      box.value = option;
      box.checked = (field.value || []).includes(option);
      const label = el("label");
      label.append(box, ` ${option}`);
      group.append(label);
    }
    row.append(group);
    return row;
  }

  const row = el("label", "field");
  let input;
  if (field.type === "textarea") {
    input = el("textarea");
    input.rows = 3;
  } else if (field.type === "select") {
    input = el("select");
    for (const option of field.options) {
      const item = el("option", "", option);
      item.value = option;
      input.append(item);
    }
  } else {
    input = el("input");
    input.type = "text";
  }
  input.name = field.name;
  input.value = field.value || "";
  row.append(el("span", "field-label", field.label), input);
  return row;
}

// Collect {name: value} from the form. Checkbox groups become arrays.
function readForm(form, fields) {
  const values = {};
  for (const field of fields) {
    if (field.type === "checkboxes") {
      const checked = form.querySelectorAll(`input[name="${field.name}"]:checked`);
      values[field.name] = [...checked].map((box) => box.value);
    } else {
      values[field.name] = form.elements[field.name].value;
    }
  }
  return values;
}

// A form hidden behind a clickable summary line, e.g. "[+] new board".
function foldout(summary, form) {
  const details = el("details", "foldout");
  details.append(el("summary", "", summary), form);
  return details;
}

// A small button that runs action() and re-renders the page.
// action returns a success message, or null when the user cancelled.
function actionButton(text, action, className = "") {
  const button = el("button", className, text);
  button.type = "button";
  button.addEventListener("click", async () => {
    try {
      const message = await action();
      if (message === null) return;
      flash(message);
      await render();
    } catch (error) {
      flash(error.message, true);
    }
  });
  return button;
}

// A delete button: asks window.confirm, sends DELETE, then optionally
// moves to another page (e.g. back to the board after deleting a thread).
function deleteButton(question, path, message, goTo) {
  return actionButton(
    "delete",
    async () => {
      if (!window.confirm(question)) return null;
      await api("DELETE", path);
      if (goTo) location.hash = goTo;
      return message;
    },
    "danger",
  );
}
