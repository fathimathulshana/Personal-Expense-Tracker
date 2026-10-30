
const form = document.getElementById("transactionForm");
const typeInput = document.getElementById("type");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");

const formTitle = document.getElementById("formTitle");
const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");
const formMessage = document.getElementById("formMessage");

const searchInput = document.getElementById("search");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");
const transactionList = document.getElementById("transactionList");
const listMessage = document.getElementById("listMessage");
const themeSelect = document.getElementById("themeSelect");
const modeToggle = document.getElementById("modeToggle");
const modeLabel = document.getElementById("modeLabel");

const categories = {
  income: ["Salary", "Freelance", "Investment", "Gift", "Other"],
  expense: [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Health",
    "Education",
    "Entertainment",
    "Other"
  ]
};

let editingId = null;
let chart = null;
let searchTimer = null;

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

function formatMoney(amount) {
  return currency.format(Number(amount) || 0);
}

function todayString() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 10);
}

function showFormMessage(message, success = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("success", success);
}

function applyTheme(theme) {
  const allowedThemes = ["pink", "lavender", "peach", "berry"];
  const selectedTheme = allowedThemes.includes(theme) ? theme : "pink";
  document.body.dataset.theme = selectedTheme;
  themeSelect.value = selectedTheme;
  localStorage.setItem("fintrack.theme", selectedTheme);
}

themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
applyTheme(localStorage.getItem("fintrack.theme") || "pink");

function applyMode(mode) {
  const selectedMode = mode === "dark" ? "dark" : "light";
  document.body.dataset.mode = selectedMode;
  const isDark = selectedMode === "dark";
  modeToggle.setAttribute("aria-pressed", String(isDark));
  modeLabel.textContent = isDark ? "Light mode" : "Dark mode";
  modeToggle.querySelector("[aria-hidden]").textContent = isDark ? "☀" : "☾";
  localStorage.setItem("fintrack.mode", selectedMode);
}

modeToggle.addEventListener("click", () => {
  applyMode(document.body.dataset.mode === "dark" ? "light" : "dark");
  refreshDashboard();
});
applyMode(localStorage.getItem("fintrack.mode") || "light");

async function apiRequest(url, options = {}) {
  const transactions = JSON.parse(localStorage.getItem("fintrack.transactions") || "[]");
  const method = options.method || "GET";
  const parsedUrl = new URL(url, window.location.href);
  const transactionPath = parsedUrl.pathname.match(/\/api\/transactions(?:\/(\d+))?$/);

  if (method === "GET" && parsedUrl.pathname.endsWith("/api/summary")) {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const expenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const grouped = new Map();
    transactions.filter((item) => item.type === "expense").forEach((item) => {
      grouped.set(item.category, (grouped.get(item.category) || 0) + Number(item.amount));
    });

    return {
      income,
      expenses,
      balance: income - expenses,
      categories: [...grouped].map(([category, total]) => ({ category, total }))
    };
  }

  if (method === "GET" && transactionPath) {
    const search = (parsedUrl.searchParams.get("search") || "").toLowerCase();
    const type = parsedUrl.searchParams.get("type") || "";
    const category = parsedUrl.searchParams.get("category") || "";
    return transactions
      .filter((item) => item.description.toLowerCase().includes(search))
      .filter((item) => !type || item.type === type)
      .filter((item) => !category || item.category === category)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }

  if (!transactionPath) throw new Error("Unsupported action.");

  const id = transactionPath[1] ? Number(transactionPath[1]) : null;
  if (method === "DELETE") {
    const remaining = transactions.filter((item) => item.id !== id);
    if (remaining.length === transactions.length) throw new Error("Transaction not found.");
    localStorage.setItem("fintrack.transactions", JSON.stringify(remaining));
    return { message: "Transaction deleted successfully." };
  }

  const transaction = JSON.parse(options.body || "{}");
  if (
    !["income", "expense"].includes(transaction.type) ||
    !transaction.description?.trim() ||
    !Number.isFinite(Number(transaction.amount)) || Number(transaction.amount) <= 0 ||
    !categories[transaction.type]?.includes(transaction.category) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)
  ) {
    throw new Error("Please enter valid transaction details.");
  }

  if (method === "POST") {
    const created = { ...transaction, id: Date.now() * 1000 + Math.floor(Math.random() * 1000) };
    localStorage.setItem("fintrack.transactions", JSON.stringify([...transactions, created]));
    return created;
  }

  if (method === "PUT") {
    const index = transactions.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Transaction not found.");
    transactions[index] = { ...transaction, id };
    localStorage.setItem("fintrack.transactions", JSON.stringify(transactions));
    return transactions[index];
  }

  throw new Error("Unsupported action.");
}

function populateCategories() {
  const selectedType = typeInput.value;
  const previousCategory = categoryInput.value;

  categoryInput.replaceChildren();

  categories[selectedType].forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });

  if (categories[selectedType].includes(previousCategory)) {
    categoryInput.value = previousCategory;
  }

  populateFilterCategories();
}

function populateFilterCategories() {
  const previousCategory = filterCategory.value;
  const selectedType = filterType.value;

  const availableCategories = selectedType
    ? categories[selectedType]
    : [...new Set([...categories.income, ...categories.expense])];

  filterCategory.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All categories";
  filterCategory.appendChild(allOption);

  availableCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    filterCategory.appendChild(option);
  });

  if (availableCategories.includes(previousCategory)) {
    filterCategory.value = previousCategory;
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  typeInput.value = "expense";
  dateInput.value = todayString();

  populateCategories();

  formTitle.textContent = "Add transaction";
  saveButton.textContent = "Save transaction";
  cancelButton.classList.add("hidden");
  showFormMessage("");
}

function editTransaction(transaction) {
  editingId = transaction.id;

  typeInput.value = transaction.type;
  populateCategories();

  descriptionInput.value = transaction.description;
  amountInput.value = transaction.amount;
  categoryInput.value = transaction.category;
  dateInput.value = transaction.date;

  formTitle.textContent = "Edit transaction";
  saveButton.textContent = "Update transaction";
  cancelButton.classList.remove("hidden");
  showFormMessage("");

  document.getElementById("formPanel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  descriptionInput.focus({ preventScroll: true });
}

function renderTransactions(transactions) {
  transactionList.replaceChildren();

  document.getElementById("transactionCount").textContent =
    `${transactions.length} ${transactions.length === 1 ? "record" : "records"}`;

  if (transactions.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 6;
    cell.className = "empty-state";
    cell.textContent = "No transactions found. Add one to get started.";

    row.appendChild(cell);
    transactionList.appendChild(row);
    return;
  }

  transactions.forEach((transaction) => {
    const row = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = transaction.date;

    const descriptionCell = document.createElement("td");
    descriptionCell.textContent = transaction.description;

    const categoryCell = document.createElement("td");
    categoryCell.textContent = transaction.category;

    const typeCell = document.createElement("td");
    const pill = document.createElement("span");

    pill.className = `type-pill type-${transaction.type}`;
    pill.textContent =
      transaction.type === "income" ? "Income" : "Expense";

    typeCell.appendChild(pill);

    const amountCell = document.createElement("td");
    amountCell.className =
      transaction.type === "income" ? "income-text" : "expense-text";

    amountCell.textContent =
      `${transaction.type === "income" ? "+" : "-"}${formatMoney(transaction.amount)}`;

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "small-button";
    editButton.textContent = "Edit";
    editButton.setAttribute(
      "aria-label",
      `Edit ${transaction.description}`
    );

    editButton.addEventListener("click", () => {
      editTransaction(transaction);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "small-button delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${transaction.description}`
    );

    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(
        `Delete "${transaction.description}"? This cannot be undone.`
      );

      if (!confirmed) return;

      try {
        await apiRequest(`/api/transactions/${transaction.id}`, {
          method: "DELETE"
        });

        if (editingId === transaction.id) {
          resetForm();
        }

        await refreshDashboard();
      } catch (error) {
        listMessage.textContent = error.message;
      }
    });

    actions.append(editButton, deleteButton);
    actionsCell.appendChild(actions);

    row.append(
      dateCell,
      descriptionCell,
      categoryCell,
      typeCell,
      amountCell,
      actionsCell
    );

    transactionList.appendChild(row);
  });
}

async function loadTransactions() {
  const params = new URLSearchParams();

  if (searchInput.value.trim()) {
    params.set("search", searchInput.value.trim());
  }

  if (filterType.value) {
    params.set("type", filterType.value);
  }

  if (filterCategory.value) {
    params.set("category", filterCategory.value);
  }

  const query = params.toString();
  const url = query
    ? `/api/transactions?${query}`
    : "/api/transactions";

  try {
    const transactions = await apiRequest(url);
    renderTransactions(transactions);
    listMessage.textContent = "";
  } catch (error) {
    transactionList.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "empty-state";
    cell.textContent = "Could not load transactions from this browser.";
    row.appendChild(cell);
    transactionList.appendChild(row);

    listMessage.textContent = error.message;
  }
}

function renderChart(categoryData) {
  const chartMessage = document.getElementById("chartMessage");
  const context = document.getElementById("expenseChart");

  if (chart) {
    chart.destroy();
    chart = null;
  }

  if (categoryData.length === 0) {
    chartMessage.classList.remove("hidden");
    context.classList.add("hidden");
    return;
  }

  chartMessage.classList.add("hidden");
  context.classList.remove("hidden");

  const styles = getComputedStyle(document.body);
  const chartColors = Array.from({ length: 8 }, (_, index) =>
    styles.getPropertyValue(`--chart-${index + 1}`).trim()
  );

  chart = new Chart(context, {
    type: "doughnut",
    data: {
      labels: categoryData.map((item) => item.category),
      datasets: [{
        label: "Expenses",
        data: categoryData.map((item) => item.total),
        backgroundColor: chartColors,
        borderColor: styles.getPropertyValue("--surface").trim(),
        borderWidth: 3,
        hoverOffset: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: getComputedStyle(document.body).getPropertyValue("--text-soft").trim()
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.label}: ${formatMoney(context.raw)}`;
            }
          }
        }
      }
    }
  });
}

async function loadSummary() {
  const summary = await apiRequest("/api/summary");

  document.getElementById("totalIncome").textContent =
    formatMoney(summary.income);

  document.getElementById("totalExpenses").textContent =
    formatMoney(summary.expenses);

  document.getElementById("balance").textContent =
    formatMoney(summary.balance);

  document.getElementById("balance").classList.toggle(
    "expense-text",
    summary.balance < 0
  );

  document.getElementById("balance").classList.toggle(
    "income-text",
    summary.balance >= 0
  );

  renderChart(summary.categories);
}

async function refreshDashboard() {
  listMessage.textContent = "";

  await Promise.all([
    loadTransactions(),
    loadSummary()
  ]);
}

typeInput.addEventListener("change", populateCategories);

filterType.addEventListener("change", () => {
  populateFilterCategories();
  loadTransactions();
});

filterCategory.addEventListener("change", loadTransactions);

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    loadTransactions();
  }, 250);
});

document.getElementById("clearFilters").addEventListener("click", () => {
  searchInput.value = "";
  filterType.value = "";
  filterCategory.value = "";

  populateFilterCategories();
  loadTransactions();
});

document.getElementById("addButton").addEventListener("click", () => {
  resetForm();

  document.getElementById("formPanel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  descriptionInput.focus({ preventScroll: true });
});

cancelButton.addEventListener("click", resetForm);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const transaction = {
    type: typeInput.value,
    description: descriptionInput.value.trim(),
    amount: Number(amountInput.value),
    category: categoryInput.value,
    date: dateInput.value
  };

  if (
    !transaction.description ||
    !Number.isFinite(transaction.amount) ||
    transaction.amount <= 0 ||
    !transaction.date
  ) {
    showFormMessage("Please enter valid transaction details.");
    return;
  }

  const isEditing = editingId !== null;
  const url = isEditing
    ? `/api/transactions/${editingId}`
    : "/api/transactions";

  const method = isEditing ? "PUT" : "POST";

  saveButton.disabled = true;
  saveButton.textContent = isEditing ? "Updating..." : "Saving...";

  try {
    await apiRequest(url, {
      method,
      body: JSON.stringify(transaction)
    });

    resetForm();
    showFormMessage(
      isEditing
        ? "Transaction updated successfully."
        : "Transaction added successfully.",
      true
    );

    await refreshDashboard();
  } catch (error) {
    showFormMessage(error.message);
  } finally {
    saveButton.disabled = false;

    if (editingId !== null) {
      saveButton.textContent = "Update transaction";
    } else {
      saveButton.textContent = "Save transaction";
    }
  }
});

// Initialize the application.
resetForm();
refreshDashboard().catch((error) => {
  listMessage.textContent = `Unable to load dashboard: ${error.message}`;
});
