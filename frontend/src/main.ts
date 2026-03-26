type Contact = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

const API_BASE = import.meta.env.VITE_API_BASE;
console.log("ENV:", import.meta.env);

const form = document.getElementById("contact-form") as HTMLFormElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const emailInput = document.getElementById("email") as HTMLInputElement;
const formError = document.getElementById("form-error") as HTMLParagraphElement;
const formSuccess = document.getElementById(
  "form-success",
) as HTMLParagraphElement;

const refreshBtn = document.getElementById("refresh-btn") as HTMLButtonElement;
const listStatus = document.getElementById(
  "list-status",
) as HTMLParagraphElement;
const tbody = document.getElementById(
  "contacts-tbody",
) as HTMLTableSectionElement;

function setFormMessage(
  type: "error" | "success" | "none",
  message = "",
) {
  formError.hidden = type !== "error";
  formSuccess.hidden = type !== "success";
  if (type === "error") {
    formError.textContent = message;
  }
  if (type === "success") {
    formSuccess.textContent = message;
  }
}

function setListStatus(message: string) {
  listStatus.textContent = message;
}

async function fetchContacts() {
  setListStatus("Loading contacts...");
  tbody.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/contacts`);
    if (!res.ok) {
      throw new Error(`Failed to load contacts (status ${res.status})`);
    }
    const data = (await res.json()) as { contacts: Contact[] };

    if (!data.contacts.length) {
      setListStatus("No contacts yet. Add one above!");
      return;
    }

    setListStatus(`${data.contacts.length} contact(s) loaded.`);
    for (const c of data.contacts) {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.textContent = c.name;

      const emailTd = document.createElement("td");
      emailTd.textContent = c.email;

      const createdTd = document.createElement("td");
      const date = new Date(c.createdAt);
      createdTd.textContent = date.toLocaleString();

      const actionsTd = document.createElement("td");
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.classList.add("secondary");
      deleteBtn.addEventListener("click", () => handleDelete(c.id));
      actionsTd.appendChild(deleteBtn);

      tr.appendChild(nameTd);
      tr.appendChild(emailTd);
      tr.appendChild(createdTd);
      tr.appendChild(actionsTd);

      tbody.appendChild(tr);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    setListStatus("Failed to load contacts. Is the API running?");
  }
}

async function handleDelete(id: number) {
  if (!window.confirm("Delete this contact?")) return;

  try {
    const res = await fetch(`${API_BASE}/contacts/${id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      throw new Error("Failed to delete");
    }
    await fetchContacts();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    window.alert("Failed to delete contact.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormMessage("none");

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();

  if (!name || !email) {
    setFormMessage("error", "Name and email are required.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      const msg =
        data.error ?? `Failed to create contact (status ${res.status})`;
      setFormMessage("error", msg);
      return;
    }

    setFormMessage("success", "Contact created!");
    nameInput.value = "";
    emailInput.value = "";

    await fetchContacts();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    setFormMessage("error", "Failed to reach API server.");
  }
});

refreshBtn.addEventListener("click", () => {
  void fetchContacts();
});

void fetchContacts();

