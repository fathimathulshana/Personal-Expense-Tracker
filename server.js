
const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

// Create or open the SQLite database.
const db = new Database(
  process.env.DATABASE_PATH || path.join(__dirname, "expenses.db")
);

db.pragma("journal_mode = WAL");

// Create the transactions table if it does not exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const allowedTypes = ["income", "expense"];

const allowedCategories = {
  income: [
    "Salary",
    "Freelance",
    "Investment",
    "Gift",
    "Other"
  ],
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

function validateTransaction(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Invalid request body.";
  }

  const { type, description, amount, category, date } = body;

  if (!allowedTypes.includes(type)) {
    return "Type must be income or expense.";
  }

  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 100
  ) {
    return "Description must contain 1–100 characters.";
  }

  const numericAmount =
    typeof amount === "number" ? amount :
    typeof amount === "string" && amount.trim() !== "" ? Number(amount) :
    NaN;

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0 ||
    numericAmount > 1000000000
  ) {
    return "Enter a valid positive amount.";
  }

  if (
    typeof category !== "string" ||
    !allowedCategories[type].includes(category)
  ) {
    return "Choose a valid category for this transaction type.";
  }

  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return "Date must be in YYYY-MM-DD format.";
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    return "Enter a valid calendar date.";
  }

  return null;
}

// GET all transactions, with optional search and filters.
app.get("/api/transactions", (req, res) => {
  const { search = "", type = "", category = "" } = req.query;

  if (
    typeof search !== "string" ||
    typeof type !== "string" ||
    typeof category !== "string"
  ) {
    return res.status(400).json({ error: "Invalid filters." });
  }

  if (type && !allowedTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid transaction type." });
  }

  if (category && !Object.values(allowedCategories).flat().includes(category)) {
    return res.status(400).json({ error: "Invalid category." });
  }

  const transactions = db.prepare(`
    SELECT id, type, description, amount, category, date
    FROM transactions
    WHERE description LIKE ?
      AND (? = '' OR type = ?)
      AND (? = '' OR category = ?)
    ORDER BY date DESC, id DESC
  `).all(
    `%${search.trim().slice(0, 100)}%`,
    type, type,
    category, category
  );

  res.json(transactions);
});

// GET dashboard totals and category chart data.
app.get("/api/summary", (req, res) => {
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income'
        THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense'
        THEN amount ELSE 0 END), 0) AS expenses
    FROM transactions
  `).get();

  const categories = db.prepare(`
    SELECT category, ROUND(SUM(amount), 2) AS total
    FROM transactions
    WHERE type = 'expense'
    GROUP BY category
    ORDER BY total DESC
  `).all();

  res.json({
    income: totals.income,
    expenses: totals.expenses,
    balance: totals.income - totals.expenses,
    categories
  });
});

// CREATE a transaction.
app.post("/api/transactions", (req, res) => {
  const error = validateTransaction(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const { type, description, amount, category, date } = req.body;

  const result = db.prepare(`
    INSERT INTO transactions
      (type, description, amount, category, date)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    type,
    description.trim(),
    Number(amount),
    category,
    date
  );

  const transaction = db.prepare(`
    SELECT id, type, description, amount, category, date
    FROM transactions WHERE id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(transaction);
});

// UPDATE an existing transaction.
app.put("/api/transactions/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid transaction ID." });
  }

  const error = validateTransaction(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const { type, description, amount, category, date } = req.body;

  const result = db.prepare(`
    UPDATE transactions
    SET type = ?, description = ?, amount = ?,
        category = ?, date = ?
    WHERE id = ?
  `).run(
    type,
    description.trim(),
    Number(amount),
    category,
    date,
    id
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: "Transaction not found." });
  }

  const transaction = db.prepare(`
    SELECT id, type, description, amount, category, date
    FROM transactions WHERE id = ?
  `).get(id);

  res.json(transaction);
});

// DELETE a transaction.
app.delete("/api/transactions/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid transaction ID." });
  }

  const result = db.prepare(
    "DELETE FROM transactions WHERE id = ?"
  ).run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Transaction not found." });
  }

  res.json({ message: "Transaction deleted successfully." });
});

// Handle malformed JSON requests.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON request." });
  }

  console.error(err);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

const server = app.listen(PORT, () => {
  console.log(`Expense Tracker running at http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
