
# FinTrack — Personal Expense Tracker

A static personal finance dashboard for recording and reviewing income and expenses.

## Features

- Add, edit, and delete income and expense transactions.
- See income, expenses, remaining balance, and a category chart.
- Search and filter transaction history.
- Works as a static website; no server or account is required.

## Data storage

Transactions are saved in this browser on this device using local storage. They are not synced to other devices or browsers. Clearing this browser's site data will erase the saved transactions, so export or back them up separately if needed.

## Publish with GitHub Pages

The GitHub Actions workflow publishes the `public` folder automatically whenever changes are pushed to `main`.

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Wait for the **Deploy static site to GitHub Pages** workflow to finish in the **Actions** tab.
4. Open `https://fathimathulshana.github.io/Personal-Expense-Tracker/`.

The chart uses Chart.js from jsDelivr, so the chart needs an internet connection.
