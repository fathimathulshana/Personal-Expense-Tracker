
# Personal Expense Tracker

## Project Overview

The Personal Expense Tracker is a web application that helps users
record, organize, and monitor personal income and expenses.

## Objectives

- Record income and expense transactions.
- Categorize financial transactions.
- Calculate total income, expenses, and remaining balance.
- Search and filter transaction history.
- Visualize expenses by category.
- Store records in a SQLite database.
- Demonstrate version control using Git and GitHub.

## Technologies Used

- HTML
- CSS
- JavaScript
- Node.js
- Express
- SQLite
- Chart.js
- Git and GitHub
- Visual Studio Code

## Requirements

- Node.js and npm
- Git
- Visual Studio Code
- An internet connection for the Chart.js CDN

## How to Run

1. Clone or download this repository.
2. Open the project folder in VS Code.
3. Open a terminal in the project folder.
4. Install dependencies:

   npm install

5. Start the server:

   npm start

6. Open http://localhost:3000 in your browser.

The SQLite database is created automatically on first launch.

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/transactions | List and filter transactions |
| POST | /api/transactions | Add a transaction |
| PUT | /api/transactions/:id | Update a transaction |
| DELETE | /api/transactions/:id | Delete a transaction |
| GET | /api/summary | Retrieve totals and chart data |

## Database

The application uses SQLite to store transactions.
Each transaction contains an ID, type, description, amount,
category, date, and creation timestamp.

## Future Enhancements

- User registration and login
- Monthly budgets and spending alerts
- Export transactions to CSV
- Monthly reports
- Multi-user data isolation

## Project Purpose

This project demonstrates frontend development, backend API
development, database operations, and version control.
## Key Features

- Add income and expense transactions.
- Edit and delete transactions.
- Categorize financial activities.
- View total income, expenses, and balance.
- Search and filter transactions.
- View transaction history.
- Monitor personal finances through the dashboard.

## Project Name
FinTrack – Personal Expense Tracker

## Version
1.0.0
## Project Completion

FinTrack is a personal expense tracking application developed to help users manage their income and expenses efficiently.

This project was developed as an academic project using HTML, CSS, JavaScript, Node.js, Express.js, and SQLite.

Thank you for using FinTrack!

## Deploying the application

This project is a Node.js/Express application with a SQLite database. GitHub Pages can only publish static files, so it cannot run the API or database. Deploy the repository as a Node web service instead (for example, on Render):

1. Create a new **Web Service** and connect this GitHub repository.
2. Set the build command to `npm install` and the start command to `npm start`.
3. Keep in mind that the free service uses temporary storage, so SQLite records may be lost when the service restarts or redeploys.

The included `render.yaml` provides free web-service settings when creating a Render service from the repository. Use the service URL as the published website URL; the GitHub repository URL displays the README. To keep SQLite data across restarts, switch to a paid plan with a persistent disk and set `DATABASE_PATH` to a location on that disk.
