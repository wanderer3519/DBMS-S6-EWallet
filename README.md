# E-Wallet Integration Project

An **end-to-end digital wallet system** with user accounts, transactions, refunds, rewards, and merchant support.
Built with **FastAPI + PostgreSQL + React** to demonstrate **DBMS design, secure payments, and full-stack integration**.

---

## Tech Stack

* **Backend:** FastAPI, SQLAlchemy, PostgreSQL
* **Frontend:** React.js
* **Tooling:** Poetry, Uvicorn, npm
* **Auth & Security:** JWT, Password Hashing
* **Other:** Makefile helpers

---

## Project Structure

```
e-wallet/
│── dbms-backend/   # FastAPI backend
│── dbms-frontend/  # React frontend
│── docs/           # ERD, diagrams, design notes
│── README.md
```

---

## Setup & Run

### 1. Backend Setup

```bash
cd dbms-backend                 # navigate to backend
python3 -m venv venv            # create a venv
source venv/bin/activate        # activate venv
pip install poetry              # install poetry
poetry install --no-root        # install all packages
```

### 2. Database Setup

* Configure `.env` file with DB credentials.

### 3. Start Backend Server

```bash
uvicorn api.main:app --reload   # or
make run
```

### 4. Frontend Setup

```bash
cd dbms-frontend
npm install      # install dependencies
npm start        # run frontend
```

App will be running at: **[http://localhost:3000](http://localhost:3000)**

---

## Features

* User & Merchant Accounts
* Wallet with balance tracking
* Transactions (top-up, purchase, refund, withdrawal, reward redemption)
* Products, Cart & Orders
* Reward Points with redemption
* Logging & audit trails
* JWT authentication & role-based access (customer, merchant, admin, support)

---

## Architecture & DBMS Focus

* **Relational Schema** with strong constraints (no negative balances, enum statuses).
* **Double-entry ledger** for auditability.
* **Transactions with row-level locking** to ensure consistency.
* **Enums for states** (transactions, refunds, rewards, orders).

📎 See [docs/](./docs) for ER diagrams & sequence diagrams.

---

## Development

* Lint & format:

```bash
make lint
```


## 📌 Notes

* Built as a **DBMS course project**, but designed with **production-ready best practices**.
* Can be extended with microservices, caching (Redis), or monitoring (Prometheus).
