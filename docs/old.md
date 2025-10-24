## E‑Wallet + Merchant Platform: End‑to‑End Explanation

This document explains how the project is structured and how each layer works together: database, backend (FastAPI), file uploads, auth/roles, and the frontend integration points. It also calls out a few path/environment mismatches and provides next steps.


## Stack and High‑Level Architecture

- Backend: FastAPI + SQLAlchemy ORM (runtime DB: SQLite via `api/database.py`).
- SQL reference: `dbms-backend/sql_implementation/*.sql` (PostgreSQL DDL, functions, triggers). Use as design spec when moving to Postgres.
- Frontend: React (see `dbms-frontend/src`), with API helpers in `src/api/` and routes in `src/routes/AppRoutes.js`.
- Media: Uploaded images saved under `uploads/` and served statically by FastAPI at `/uploads`.

Request flow (typical):
1) Frontend makes HTTP requests (with optional Bearer token).
2) FastAPI router validates auth via `api/auth_lib.py` dependencies.
3) Business logic uses SQLAlchemy models in `api/models.py` and DB sessions from `api/database.py`.
4) Responses are validated/serialized by Pydantic schemas in `api/schemas.py`.
5) Images are saved under `uploads` and referenced by URL paths.


## Mechanisms map (client vs server and fetch scope)

- Authentication: JWT in localStorage; sent as Authorization header per request. Server validates on demand. Fetch scope: only what’s needed per call.
- Authorization/roles: Client route guards + server role checks (admin/merchant). Fetch scope: minimal; blocked early.
- Products list: Server returns active products; client renders. Fetch scope: full list for now; search uses server pagination.
- Category filter: Server filters by category; client requests only that list.
- Featured products: Server computes subset; fetch only needed items.
- Product details: Server returns a single product by ID.
- Search: Server‑side via `/api/product/search` with pagination and filters (q/category/price/sort). Client fetches only a page.
- Pagination: Implemented for search; recommended for listing pages; admin logs/orders use pagination.
- Cart: Server owns cart; client mutates via API and fetches current snapshot with computed totals.
- Checkout/Orders: Server handles validation, stock, rewards, wallet, transactions, logs. Client sends intent and shows result.
- Order history: Server returns all for user (consider adding pagination). Client can filter in-memory.
- Rewards: Server computes/records points; redemption credited via transactions; one order flow auto‑converts.
- Wallet/balance: Server single source of truth; client shows current value.
- Dashboard: Server aggregates summary; client visualizes.
- Merchant CRUD: Server performs validations, file saves, stock/status updates; client sends forms.
- Admin logs/stats: Server composes; logs and orders are paginated.
- Images: Client uploads file; server saves under `/uploads/*` and returns URL. Browser fetches images on demand.
- Static serving: `/uploads` served by FastAPI; fetch only images that appear.
- Caching/state: Minimal client caching; token in localStorage; otherwise per‑view fetch.


## Database Layer

Runtime schema is defined by SQLAlchemy models in `dbms-backend/api/models.py` and created by `Base.metadata.create_all(bind=engine)` in `api/main.py` against a SQLite DB (`sqlite:///test.db`). Key entities:

- Users: roles (customer, admin, merchant, support), status, email, full_name, password_hash, optional profile_image.
- Account: one or more accounts per user (type: user/merchant), balance, created_at.
- Transactions: top-up, purchase, withdrawal, refund, reward_redemption with status and timestamps.
- RewardPoints: earned/redeemed/expired points joined to transactions.
- Merchants: linked to users; business_name, business_category, contact.
- Products: merchant_id, name, price/mrp, stock, business_category, image_url, status (active/inactive/out_of_stock).
- Cart/CartItems: per-user cart state.
- Orders/OrderItems: order history, totals, wallet_amount, reward_discount, payment_method, status.
- Logs: app activity records (user actions).

Important note about SQL files: `dbms-backend/sql_implementation/*.sql` defines a comprehensive Postgres schema with ENUMs, PL/pgSQL functions, and triggers (stock/status updates, reward awarding, logging, etc.). These are NOT executed by the current SQLite runtime automatically. Treat them as a design reference for a future Postgres deployment. Many of those behaviors are implemented in Python today (e.g., stock updates, reward handling in routers).


## Backend App Setup

File: `dbms-backend/api/main.py`
- Creates FastAPI app, sets up logging, CORS (allows `http://localhost:3000`).
- Creates DB tables from SQLAlchemy models.
- Includes all routers from `api/routers`.
- Ensures `uploads/`, `uploads/products`, `uploads/profiles` exist and mounts them: `app.mount("/uploads", StaticFiles(directory="uploads"))`.

Database session: `dbms-backend/api/database.py`
- Engine: `sqlite:///test.db` with pre-ping and recycle.
- `get_db()` yields a Session via `sessionmaker`.


## Auth and Roles

File: `dbms-backend/api/auth_lib.py`
- JWT signing with HS256; `create_access_token`, `get_current_user` (reads `sub`=email), and role guards:
  - `get_current_active_user` (status active),
  - `get_current_admin_user`, `get_current_merchant_user` (role checks).

File: `dbms-backend/api/routers/auth.py`
- POST `/api/auth/signup`: creates user (and default account), logs creation, returns token.
- POST `/api/auth/login`: verifies password, logs login, returns token and `user_id`.

User passwords are hashed with bcrypt (Passlib). Frontend should store and send Bearer token for protected routes.


## Media and File Uploads

File: `dbms-backend/api/file_upload.py`
- `save_uploaded_file(file) -> "/uploads/products/{uuid}{ext}"`: saves product images.
- `save_profile_image(file, user_id) -> "/uploads/profiles/profile_{user}_{uuid}{ext}"`.
- `delete_file(relative_path)` deletes an existing file (best‑effort).

Static serving is configured in `main.py` so any path returned like `/uploads/products/...` or `/uploads/profiles/...` is fetchable by the browser.


## Routers and Key Endpoints

All routers live in `dbms-backend/api/routers/`. Below are the highlights and data flows.

### Account (`account.py`, prefix `/api/account`)
- POST ``/``: create an account for a user; logs `account_creation`.
- GET `/user/{user_id}`: list user’s accounts.
- POST `/{account_id}/top-up`: creates a completed `Transactions` record, increments `Account.balance`, logs `account_top_up`.
- GET `/user/profile`: current user profile (accounts included).
- PUT `/user/profile`: update profile fields; logs `profile_update`.
- POST `/add-funds`: current user adds funds; logs `wallet_top_up`.
- GET `/rewards`: totals current earned reward points and details.
- POST `/redeem-rewards/{points}`: convert points→wallet balance via `Transactions(reward_redemption)` and mark points as redeemed.
- POST `/upload-profile-image`: validate image, replace existing profile image, update `Users.profile_image`, log update.

Data shapes: see `api/schemas.py` (`UserProfileResponse`, `AccountResponse`, `TransactionResponse`).

### User (`user.py`, prefix `/api/user`)
- GET `/profile/{user_id}`: full user profile with accounts (public by ID).
- GET `/profile`: current user minimal info + account summary.
- GET `/balance`: current user wallet balance.
- PUT `/password`: verify current password, update to new.
- POST `/avatar`: validate size/type, save under `uploads/profiles/`, update `Users.profile_image` and return `url` for UI.
- GET `/dashboard`: aggregates data for the user dashboard (user info, balance, mocked recent transactions, rewards placeholder).

### Product (`product.py`, prefix `/api/product`)
- POST ``/``: create product for a merchant (expects `ProductCreate`; base64 image optional path); sets `Product.status` and timestamps.
- GET `/merchant/{merchant_id}`: list products for a merchant.
- POST `/upload-image`: merchant‑only image upload; returns `/uploads/{filename}`.
- GET `/featured`: heuristic (price<MRP, in stock) top 10.
- GET `/category/{category}`: active products by category.
- GET `/categories`: distinct category list.
- GET `/search`: server‑side search with pagination and sorting. See Search section.
- GET ``/``: all active products; GET `/{product_id}`: single product.

### Merchant (`merchant.py`, prefix `/api/merchant`)
- POST `/signup` and `/login`: merchant auth (role enforced); on signup creates `Users` and a `Merchants` row.
- GET `/product/all`: current merchant’s products.
- POST `/product/upload-image`: validate & save image; returns `image_url`.
- POST `/product`: create product via multipart Form fields + image; creates/ensures merchant row for category.
- PUT `/product/{id}`: partial update; optional image replace (deletes old image); logs `product_update`.
- DELETE `/product/{id}`: deletes the product and image.
- GET `/{merchant_id}/logs`: synthesized product creation/update logs for merchant.
- GET `/profile` and PUT `/profile`: view/update merchant profile.
- GET `/stats`: counts of total products and active listings.

### Cart (`cart.py`, prefix `/api/cart`)
- POST ``/``: add item to current user’s cart; creates cart if missing; checks stock; logs `cart_update`.
- GET `/user/{user_id}`: cart by user id.
- DELETE `/product/{product_id}`: remove item from current user’s cart; logs.
- GET ``/``: current user cart, with product details and computed total.
- PUT `/product/{product_id}`: set quantity after stock check; logs.

### Checkout and Orders

There are two closely related flows. Prefer one in your UI to avoid duplication.

- Checkout (`checkout.py`, prefix `/api/checkout`):
  - POST ``/``: reads cart, computes total, applies optional rewards and wallet, creates `orders` + `order_items`, records a purchase `transaction`, may award reward points (if not COD), updates stock, clears cart, logs.

- Orders (`order.py`, prefix `/api/order`):
  - POST ``/``: similar to checkout with a variant flow; auto‑converts earned points to wallet credits immediately (creates `reward_redemption` transaction and updates balance). Also clears cart and logs.
  - GET `/user/{user_id}`: orders for the user.
  - GET `/{order_id}`: order details with items and reward info.
  - GET ``/`` and `/user/current`: list orders for current user; enriches with item details and rewards.
  - POST `/{order_id}/cancel`: cancels an order, refunds wallet, writes refund transaction, logs.

Choose one of these as the canonical “place order” path in the frontend to keep behavior consistent.

### Admin (`admin.py`, prefix `/api/admin`)
- GET `/stats`: returns logs (schema `AdminStats` is present for a richer view; can be extended to use the SQL function `get_admin_stats()`).
- GET `/logs`: two variants exist (one protected with role check; one documented as public for testing); both return joined user/log data.
- GET `/orders`: returns orders joined with user names for dashboard.
- POST `/signup` and `/login`: admin user management with logging; enforces admin role on login.


## Reward Points Logic (today vs. SQL design)

In the Python routers:
- Earning: When a purchase transaction is created, points are added (often 5% of total). In `order.py`, points are immediately auto‑converted to wallet value and marked redeemed; in `checkout.py` they are recorded as earned (conversion commented out).
- Redemption: `account.py` exposes endpoints to compute and redeem points into wallet balance (`/rewards`, `/redeem-rewards/{points}`).

In the Postgres SQL reference (not active on SQLite):
- Triggers auto‑award points on purchase transactions and log status changes.
- Additional triggers ensure product status reflects stock, create default accounts and carts, validate stock on cart add, and more.


## Frontend Integration Points

Routes: `dbms-frontend/src/routes/AppRoutes.js`
- PrivateRoute wrapper checks auth and optional role guard.
- Routes configured for Login/Signup, Products (default), Dashboard, Cart, Merchant and Admin dashboards.

API helpers:
- `src/api/auth.js`:
  - POST `/api/auth/login` and `/api/auth/signup` (matches backend). Stores `{ access_token, ... }` in localStorage.
  - `getAuthHeader()` builds `Authorization: Bearer <token>`.

- `src/api/products.js` (MISMATCHED PATHS):
  - Now aligned to backend: all endpoints under `/api/product/*` (singular). Includes `searchProducts(params)` that calls `/api/product/search` with query params. Add‑to‑cart corrected to `POST /api/cart`.

- `src/api/user.js` (MISMATCHED BASE):
  - Uses `http://127.0.0.1:8000` and `/user/...`; backend uses `/api/user/...`. Update to `${API_BASE_URL}/api/user/...` consistently and add auth header as needed.

Cart endpoints to use from frontend (see `cart.py`):
- Add: `POST /api/cart` with `{ product_id, quantity }`.
- Get current user cart: `GET /api/cart` (auth required).
- Remove item: `DELETE /api/cart/product/{product_id}`.
- Update quantity: `PUT /api/cart/product/{product_id}?quantity=...`.

Images in UI:
- Use `img src={urlFromAPI}` where `urlFromAPI` already starts with `/uploads/...`. The server serves them statically.


## Typical Data Flows (step‑by‑step)

1) Signup/Login
- Frontend calls `/api/auth/signup` or `/api/auth/login`.
- On success, stores `access_token` and (sometimes) `user_id` in localStorage.
- Subsequent requests include `Authorization: Bearer <token>`.

2) Browse Products
- Frontend calls `/api/product` (or category/featured variants) to list products.
- For search/filter use `/api/product/search?q=...&category=...&page=...&page_size=...`.
- Product images are URLs under `/uploads/products/...`.

3) Cart
- Add to cart calls `POST /api/cart` with product/quantity.
- Get cart calls `GET /api/cart` and displays computed total and items with product info.

4) Checkout/Order
- Frontend posts to one flow: `/api/checkout` or `/api/order` with payment options and reward usage.
- Backend validates stock, computes totals, applies wallet/rewards, creates order, updates stock, records transactions, awards points, clears cart, and logs.
- Order history displays via `GET /api/order` or `GET /api/order/user/current`.

5) Profile
- View/update profile with `GET/PUT /api/account/user/profile`.
- Change password with `PUT /api/user/password`.
- Upload avatar with `POST /api/user/avatar` → server returns `url` to display.

6) Merchant
- Signup/Login via `/api/merchant/signup|login`.
- Manage products with `/api/merchant/product*` endpoints; upload images; get stats and logs.

7) Admin
- Admin login via `/api/admin/login`.
- View logs `/api/admin/logs` and orders `/api/admin/orders`; stats via `/api/admin/stats`.


## Error Handling and Logging

Most endpoints wrap DB operations with try/except and return HTTP 4xx for user errors (not found, insufficient stock) and 5xx for unexpected failures. Significant mutations (account updates, cart changes, orders, admin actions) also create `Logs` entries with timestamps to support auditing and admin dashboards.


## Known Gaps and Mismatches (Actionable)

1) DB dialect mismatch
- Runtime uses SQLite; SQL files target Postgres and include ENUMs/functions/triggers. If you plan to use those DB‑level features, switch `DATABASE_URL` to a Postgres connection and run the SQL migrations. Otherwise, keep Python implementations as the source of truth.

2) Frontend API path inconsistencies
- Fixed: `src/api/products.js` and `src/api/user.js` now use a single base and correct routes.

3) Duplicate order flows
- Still open: Two order creation paths (`/api/order` and `/api/checkout`) differ in reward handling. Pick one to keep behavior consistent.

4) Admin stats schema vs. payload
- Fixed: `/api/admin/stats` now returns actual KPIs matching `AdminStats`.

5) Pagination for admin logs/orders
- Fixed: both endpoints accept `page` and `page_size` and return pagination meta.


## Where to Extend Next

- Search and filtering: Implement full‑text search and filtering (by category, price, merchant) on `/api/product` and expose in the frontend.
- Status: Basic search + pagination implemented at `/api/product/search`; wire into UI list page with controls.
- Order states: Add transitions (pending → processing → completed) and implement admin‑driven status updates.
- Reporting: Power `/api/admin/stats` using SQL functions or ORM queries for revenue, orders, merchants, top products.
- Notifications: Logically add email or UI alerts on order events.
- Postgres migration: If you need triggers/functions, migrate DB to Postgres and execute `sql_implementation/*.sql`; then simplify some Python logic that mirrors DB triggers.

## Search and Pagination API details

- Endpoint: `GET /api/product/search`
- Query params:
  - `q` (string, optional): text to search in name/description
  - `category` (string, optional): exact business_category
  - `min_price`, `max_price` (number, optional)
  - `sort` (created_at|price|mrp|stock|name), `order` (asc|desc)
  - `page` (int, default 1), `page_size` (int, default 12, max 100)
- Response:
  - `{ items: ProductResponse[], page, page_size, total, total_pages }`
- Frontend helper:
  - `searchProducts(params)` in `src/api/products.js` builds the query string and returns the response.


## File Index (pointers)

- Backend
  - `api/main.py` (app init, CORS, static mounts)
  - `api/database.py` (engine/session)
  - `api/models.py` (ORM entities and enums)
  - `api/schemas.py` (Pydantic models)
  - `api/auth_lib.py` (JWT + role guards)
  - `api/file_upload.py` (image save/delete helpers)
  - Routers: `api/routers/*.py` (auth, account, user, product, merchant, cart, checkout, order, admin)
- SQL reference: `sql_implementation/*.sql` (Postgres‑only DDL/functions/triggers)
- Frontend
  - `src/routes/AppRoutes.js` (private routes and dashboards)
  - `src/api/auth.js`, `src/api/products.js`, `src/api/user.js` (API helpers; update paths as noted)


## Quick FAQ

- Where to find “how each directory works”?
  - See the next section “Repository Mechanics by Directory”.

## Repository Mechanics by Directory

- Root
  - `EXPLANATION.md`: This file; living docs for how things work.
  - `README.md`: High-level project intro.

- `dbms-backend/`
  - `api/`
    - `main.py`: App entrypoint; mounts routers, CORS, static uploads, creates tables.
    - `database.py`: SQLAlchemy engine/session; currently SQLite (`test.db`).
    - `models.py`: ORM models and enums. Defines runtime DB schema.
    - `schemas.py`: Pydantic models that shape API inputs/outputs.
    - `auth_lib.py`: JWT create/verify; role guards for admin/merchant.
    - `file_upload.py`: Save/delete uploads with deterministic paths under `/uploads`.
    - `routers/`: Feature modules; each prefixed route group:
      - `auth.py`: signup/login; creates default account; logs login.
      - `user.py`: profile, balance, change password, avatar upload, dashboard summary.
      - `account.py`: profile + accounts, add-funds, top-up, rewards and redemption, upload profile image.
      - `product.py`: public listing/detail, categories, featured, merchant products, product image upload, server-side search with pagination.
      - `merchant.py`: merchant signup/login; product CRUD (multipart with image); profile & stats; synthetic logs.
      - `cart.py`: add/update/remove/list current user’s cart; computes totals.
      - `checkout.py` and `order.py`: create order flows, items, wallet/rewards handling; order queries and cancel.
      - `admin.py`: admin login; stats (KPIs); logs and orders with pagination.
  - `config/`
    - `logging_config.py`: logger setup used by app.
  - `scripts/`
    - Data/init helpers (e.g., `init_db.py`, `populate_db.py`, `populate_products.py`, `create_test_users.py`, `download_sample_images.py`). Run them to seed or verify data locally.
  - `sql_implementation/`
    - Postgres DDL, functions, and triggers. These define an advanced DB layer (ENUMs, triggers for rewards, stock status, logs, etc.). Not executed in SQLite runtime; use when migrating to Postgres.
  - `uploads/`
    - `products/` and `profiles/`: where images are saved on disk; served at `/uploads/**`.

- `dbms-frontend/`
  - `public/`: index.html, manifest, assets (favicons, images).
  - `src/`
    - `routes/`
      - `AppRoutes.js`: React Router setup with PrivateRoute and role guards; routes for login/signup, products, dashboard, cart, merchant, admin.
    - `api/`
      - `auth.js`: login/signup, stores token in localStorage, builds auth header.
      - `products.js`: aligned to `/api/product/*`, includes `searchProducts(params)` and proper add-to-cart.
      - `user.js`: aligned to `/api/user/*` and `/api/account/*` with auth headers.
    - `context/`: `AuthContext.js` and `ThemeContext.js` for app-wide state.
    - `components/`: feature UIs by domain (dashboard, product, order, profile, merchant, admin, shared). Components fetch via the API helpers and render responsive UI with animations.
    - `styles/`: global and scoped CSS, including animation utilities and hover effects.
  - `scripts/`: e.g., `download-images.js` to fetch sample product images into the frontend’s public assets.

- `docs/`: design docs (ERD, PDFs) and diagrams.

## Frontend Module Mechanics (how they use data)

- AuthContext: holds `{ isAuthenticated, user }`; reads token from localStorage; PrivateRoute blocks unauth/unauthorized roles.
- Products list page: fetches `/api/product` or uses `searchProducts` for server-side filtering with pagination; renders cards, uses `/uploads/products/*` for images.
- Product details: fetches `/api/product/{id}`; add-to-cart posts to `/api/cart`.
- Cart: `GET /api/cart` returns current snapshot with product details and total; supports update/remove.
- Orders: uses `/api/order` or `/api/order/user/current` to show history; item expansion fetch already included in payload.
- Profile: gets/puts `/api/account/user/profile`; change password via `/api/user/password`; avatar upload via `/api/user/avatar` and shows returned URL.
- Dashboard (user): calls `/api/user/dashboard` (summary data) and may fetch additional resources like orders when needed.
- Merchant: after merchant login, manages products via `/api/merchant/product*`; image upload via `/api/merchant/product/upload-image`; views stats and synthetic logs.
- Admin: after admin login, gets KPIs from `/api/admin/stats`; paginated logs `/api/admin/logs` and orders `/api/admin/orders`.

## Backend Scripts & SQL Mechanics

- Scripts (`dbms-backend/scripts/*.py`):
  - Initialization and population helpers. Typical flow: initialize DB (tables are created automatically on app start), then run populate scripts to insert sample users/products and download images.
  - They interact directly with models and the filesystem (for images) to prepare a demo environment.

- SQL (`dbms-backend/sql_implementation/*.sql`):
  - Target Postgres. Includes: table DDL with ENUMs, functions for users/accounts/products/carts/orders/admin, and triggers for rewarding points, updating statuses, logging changes, creating default carts/accounts, and validating stock.
  - Use when migrating to Postgres; until then, similar behaviors are implemented in Python in the routers.

## Lightweight Runbook (how to run)

- Backend
  - Start the API: run the FastAPI app (e.g., with Uvicorn). It creates tables and mounts `/uploads` automatically.
  - Access: `http://localhost:8000/` (health), `http://localhost:8000/api/product` (products), images under `/uploads/...`.

- Frontend
  - Start the React app. It calls the backend at `http://localhost:8000` (set `REACT_APP_API_URL` if needed).
  - Access: `http://localhost:3000/`.

Tip: Use the admin endpoints for logs and orders with pagination to test dashboard performance with larger datasets.

- Where are images stored and how does the browser access them?
  - On upload, the server saves files under `uploads/products` or `uploads/profiles`. It returns a URL like `/uploads/products/<file>`. `main.py` mounts `/uploads`, so the browser can fetch the image directly.

- How do role checks work?
  - Protected endpoints depend on `get_current_user` (JWT). For merchants/admins, routes use `get_current_merchant_user`/`get_current_admin_user` to enforce roles.

- How are reward points computed and applied?
  - On orders, points are typically 5% of the spent amount (configurable in code). They’re stored in `reward_points`. Some flows auto‑convert to wallet; others record earned points for later redemption.

- Do SQL triggers run today?
  - Not on SQLite. They’re defined for Postgres in `sql_implementation`. Similar behavior is handled in Python code paths for the SQLite runtime.


---
Completion summary: This EXPLANATION.md documents architecture, models, routers, media pipeline, rewards, and frontend integration. It highlights DB and path mismatches and lists concrete next steps to align and extend the system.


## Narrative overview (plain prose)

Your app is a classic client–server e‑wallet with a merchant layer. The React frontend keeps a JWT token in local storage and attaches it to each API call; route guards block unauthenticated users and enforce roles for merchant and admin sections. The FastAPI backend validates the token on every protected request, runs business logic using SQLAlchemy models backed by a SQLite database, and shapes responses with Pydantic. Screens load only the data they need when they need it; there’s no heavy prefetch or global caching beyond the token, so network usage stays tight and intentional.

On the backend, each domain is handled by its own router. Authentication creates a user and a default account and logs sign‑ins. User and account endpoints provide profile data, wallet balance, password change with server verification, add‑funds, reward totals and redemption, and profile image uploads. Product endpoints return active products, featured items, categories, and single product details, and include a server‑side search with pagination and sorting so the client requests one page at a time. Merchant endpoints manage product create/update/delete through multipart image uploads, keep stock and status in sync, and expose merchant profile and basic stats. The cart is server‑authoritative: adding, updating, removing, and listing always round‑trip to the server and totals are computed there. Checkout and order endpoints create orders, update stock, apply wallet and reward logic, record transactions, clear the cart, and log activity; order history is returned for the user. Admin endpoints expose real KPIs and provide paginated logs and orders for dashboards. Uploaded media is stored under the uploads directory and served directly by the backend; the client only downloads the images it renders.

On the frontend, small API helpers power each feature. The products page fetches the catalog or uses server‑side search with query parameters and pagination; product details load only the selected item. The cart page pulls the current cart snapshot from the server and shows computed totals; add and update actions post to the server and reflect back the new state. The dashboard reads a compact server‑computed summary rather than assembling data on the client. The profile screen reads and writes profile fields, changes the password via a server check, and uploads avatars that the server stores and returns as a URL. Merchant and admin screens are protected by role guards and call their respective endpoints; admin lists are paginated so the UI never loads everything at once.

The repository layout mirrors these mechanics. The backend contains the app entrypoint, database setup, ORM models, request and response schemas, JWT utilities, file‑upload helpers, and routers grouped by feature. Local scripts seed and verify data; a Postgres SQL reference (DDL, functions, triggers) documents an advanced path if you migrate away from SQLite. The frontend holds route definitions with role guards, API helpers for each domain, contexts for auth and theme, and components grouped by feature, along with CSS for global animations and hover effects. The uploads folder stores product and profile images that the server serves statically.

In day‑to‑day use, data moves narrowly and on demand: authentication is stateless per call; product search returns only a page; categories and featured fetch just needed subsets; cart and checkout always trust the server as source of truth; images are uploaded once and referenced by URL; admin lists use pagination. One open decision remains: unifying the two order creation paths so reward handling is consistent across flows, and optionally adding pagination to the user’s order history to keep responses small.

## Frontend: Step-by-step implementation

This section walks through every major frontend feature, how it’s wired, which files own the logic, and the exact flow of state and network calls.

### 1) App boot and providers

- Files: `dbms-frontend/src/index.js`, `dbms-frontend/src/App.js`, `dbms-frontend/src/layout/AppLayout.js`, `dbms-frontend/src/routes/Navbar.js`.
- What happens:
  - index.js mounts React and imports global styles (`index.css`, `styles/theme.css`, Bootstrap, FontAwesome).
  - App.js wraps the app with `ThemeProvider` and `AuthProvider`, then sets up `react-router-dom` routes inside `<Router>`.
  - AppLayout renders the shared frame: `Navbar` at top, `<Outlet />` for current page, and `Footer` at bottom within a styled container.
- Outcome: The app has global theme and auth context available everywhere, with a consistent layout and routing skeleton.

### 2) Theme system (dark/light)

- Files: `src/context/ThemeContext.js`, `src/styles/theme.css` (and any CSS using `[data-theme]`).
- How it works:
  - On start, ThemeProvider picks theme from localStorage or system preference, defaults to dark.
  - It sets `document.documentElement` attribute `data-theme` and adds `theme-dark`/`theme-light` classes.
  - The Navbar exposes a toggle that calls `toggleTheme()`. CSS variables/classes drive colors and transitions.
- Outcome: Instant, persistent theme switching across the app.

### 3) Authentication lifecycle (user, merchant, admin)

- Files: `src/context/AuthContext.js`, `src/api/auth.js`.
- Login/signup flow:
  - UI calls the relevant login endpoint:
    - User: `POST /api/auth/login`
    - Merchant: `POST /api/merchant/login`
    - Admin: `POST /api/admin/login`
  - On success, `AuthContext` stores the `access_token` in localStorage (`token`) and sets `axios.defaults.headers.common.Authorization = Bearer <token>`.
  - A compact `user` object is stored in localStorage (id, email, name, role), and state is set in context (`setUser`).
  - On app reload, `AuthContext` tries to validate stored credentials by calling `GET /api/account/user/profile` and merges profile info into `user`.
- Logout: Clears localStorage token and user, removes axios default header, resets context.
- Outcome: All subsequent API calls automatically include the bearer token, and route guards know who you are.

### 4) Routing and route guards

- Files: `src/App.js` (PrivateRoute), `src/routes/AppRoutes.js` (if used), domain route components under `src/components/**`.
- How it works:
  - `PrivateRoute` checks for `user` in `AuthContext`. If absent, it redirects to `/login`, `/merchant/login`, or `/admin/login` based on the attempted path.
  - If the route declares `roles`, `PrivateRoute` verifies `user.role` and redirects to the appropriate dashboard if mismatched.
  - Routes:
    - Public: login/signup (user/merchant/admin) and read-only catalog pages.
    - Protected: dashboard, cart, checkout, orders, profile (user); merchant dashboard/tools; admin dashboard.
- Outcome: Only the right users can access the right pages, and unauthenticated users are redirected cleanly.

### 5) Navbar and layout

- Files: `src/routes/Navbar.js`, `src/layout/AppLayout.js`.
- Behavior:
  - Navbar shows links conditionally by role: Products for everyone, Cart for users, Merchant/Admin dashboards for their roles.
  - Theme toggle button switches dark/light.
  - If authenticated, shows greeting and Logout; otherwise, provides Login/Signup dropdowns for User/Merchant/Admin.
  - AppLayout wraps every page in a consistent shell with Container and Footer.
- Outcome: A role-aware, responsive shell for navigation and theming.

### 6) Catalog: list, categories, and search with pagination

- Files: `src/components/product/Products.jsx` (UI), `src/api/products.js` (fetch), `src/routes/Navbar.js` (entry link).
- Server endpoints used:
  - GET `/api/product` for active products (basic list).
  - GET `/api/product/categories` for available categories.
  - GET `/api/product/category/:category` to filter by category.
  - GET `/api/product/search?q=&category=&min_price=&max_price=&sort=&order=&page=&page_size=` for server-side search and pagination.
- UI flow (recommended):
  1. Read query params from URL (q, category, page, page_size, sort/order).
  2. Call `searchProducts(params)`; render `data.items` and build pagination UI from `data.page`, `data.total_pages`.
  3. When the user changes filters or page, update the URL query params and re-fetch.
  4. Use product `image_url` directly in `<img src="/uploads/..." />`.
- Outcome: Efficient browsing that only loads one page of results at a time.

### 7) Product details and add-to-cart

- Files: `src/components/product/ProductDetails.jsx`, `src/api/products.js`.
- Server endpoints used:
  - GET `/api/product/:productId` for details.
  - POST `/api/cart` with `{ product_id, quantity }` to add item (auth required).
- UI flow:
  1. Read `:productId` from URL; fetch details on mount.
  2. Show price, stock, image, and Add to Cart button with quantity controls.
  3. On add, call `addToCart(productId, qty)`; on success, notify and optionally redirect to Cart.
- Outcome: A clear path from discovery to cart, with server as the source of truth.

### 8) Cart: view, update, remove

- Files: `src/components/cart/Cart.jsx`, `src/api/products.js` (only add), `src/api` for cart helpers (or inline fetches if present).
- Server endpoints used (from backend `cart.py`):
  - GET `/api/cart` (current user cart snapshot with computed totals).
  - PUT `/api/cart/product/:productId?quantity=...` to set a quantity.
  - DELETE `/api/cart/product/:productId` to remove an item.
- UI flow:
  1. On mount, fetch `GET /api/cart` and render items plus server-computed `total`.
  2. On quantity change, send PUT; on remove, send DELETE; then re-fetch or reconcile locally.
  3. Provide a CTA to proceed to Checkout.
- Outcome: Cart state always matches server calculation; no client-side drift.

### 9) Checkout and order confirmation

- Files: `src/components/cart/Checkout.jsx`, `src/components/order/OrderConfirmation.jsx`.
- Server endpoints used (pick one canonical flow):
  - Option A: POST `/api/checkout`
  - Option B: POST `/api/order` (auto-converts rewards).
- UI flow:
  1. Prefill from cart snapshot and let user choose payment method and reward usage.
  2. Submit to the chosen endpoint; backend validates stock, applies wallet/rewards, creates order, records transactions, and clears cart.
  3. Navigate to `/order-confirmation/:orderId` and show a receipt, including reward outcomes.
- Outcome: Orders are placed server-side with consistent accounting and a clear confirmation screen.

### 10) Orders: listing and detail

- Files: `src/components/user/MyOrders.jsx`.
- Server endpoints used:
  - GET `/api/order` or `/api/order/user/current` for current user orders.
  - GET `/api/order/:orderId` for details if needed.
- UI flow:
  1. On mount, fetch orders; optionally add client-side filters (status, date).
  2. Link to details or show inline expansion with items and reward info.
- Outcome: Users can audit their purchases and reward history.

### 11) Profile: view/edit, change password, avatar upload

- Files: `src/components/user/UserProfile.jsx`, `src/api/user.js`.
- Server endpoints used:
  - GET `/api/account/user/profile` to view profile and accounts.
  - PUT `/api/account/user/profile` to edit profile fields.
  - PUT `/api/user/password` to change password (verifies current password server-side).
  - POST `/api/user/avatar` with multipart form to upload profile image; response includes `url`.
- UI flow:
  1. Load profile into form; allow edits with client-side validation.
  2. For password change, collect current/new and submit; show success/error.
  3. For avatar, submit `FormData` and update the displayed avatar with returned URL.
- Outcome: A secure, full-profile management area tied to server validation.

### 12) Wallet top-up and rewards conversion

- Files: `src/components/account/Topup.jsx`, `src/components/account/RewardsConversion.jsx`, `src/api/user.js`.
- Server endpoints used:
  - POST `/api/account/{account_id}/top-up?amount=` to increase balance.
  - GET `/api/account/rewards` to see earned points; POST `/api/account/redeem-rewards/{points}` to convert to wallet.
- UI flow:
  1. Top-up: pick an account and amount, submit, then refresh balance via `GET /api/user/balance`.
  2. Rewards: fetch totals, let user choose a conversion amount, submit, refresh wallet and points.
- Outcome: Clear money-in and points-to-money flows backed by transactions.

### 13) Merchant area

- Files: `src/components/merchant/*`, `src/context/AuthContext.js` (merchantLogin).
- Server endpoints used: `/api/merchant/*` for login/signup, product CRUD, image upload, profile and stats; `GET /api/merchant/{id}/logs` for activity.
- UI flow:
  1. Merchant logs in; role-guarded routes become available.
  2. Manage products via forms (multipart image upload to get an `image_url`), update/delete as needed.
  3. View synthetic logs and basic stats to monitor catalog health.
- Outcome: A contained workspace for sellers with proper access control.

### 14) Admin dashboard

- Files: `src/components/admin/*`, `src/context/AuthContext.js` (adminLogin).
- Server endpoints used: `/api/admin/stats`, `/api/admin/logs?page=&page_size=`, `/api/admin/orders?page=&page_size=`.
- UI flow:
  1. Admin logs in; role-guarded admin pages unlock.
  2. KPIs render from `/stats`; logs and orders load with pagination to keep lists fast.
  3. Optional filters or detail drawers can be added atop the paginated data.
- Outcome: Lightweight but real admin oversight with scalable lists.

### 15) API helper usage and error handling

- Files: `src/api/auth.js`, `src/api/products.js`, `src/api/user.js`.
- Contract:
  - Base URL: `process.env.REACT_APP_API_URL || http://localhost:8000`.
  - Auth header: Prefer axios default from `AuthContext` after login; helpers also fall back to `localStorage.user.access_token`.
  - Responses: All functions return `response.data`; errors throw `error.response?.data` with a `detail` when available.
- Typical usage:
  - Products page: `searchProducts({ q, category, page, page_size, sort, order })` → render items + pagination from `items/total_pages`.
  - Product details: `getProductById(id)`; on Add: `addToCart(id, qty)`.
  - Profile: `getAccountBalance()`, `updateProfile(profile)`, `changePassword(curr, next)`, `uploadAvatar(file)`.
  - Admin: fetch `/api/admin/*` endpoints with token.
- Outcome: A small, predictable API surface that mirrors backend routes and keeps network code centralized.

### 16) Animations and hover polish

- Files: `src/styles/*.css` (including `App.css`, page-specific CSS), components.
- Approach:
  - Subtle hover states on clickable cards, buttons, and nav links.
  - Page transitions via CSS classes applied on route change (kept minimal for snappy UX).
  - Respect the theme variables for color/contrast.
- Outcome: A professional feel without heavy client-side JS.

### 17) Edge cases and recommendations

- Handle expired tokens: if any API call returns 401, auto-logout and redirect to login.
- Loading and error states: show spinners and inline `detail` messages from server.
- Canonicalize order flow: pick `/api/order` or `/api/checkout` and use it everywhere for consistency.
- Paginate user order history if it grows large (same pattern as admin lists).
- Keep query state in the URL on the products page so refresh/bookmark works.

---
Frontend coverage summary: The guide above details boot, theme, auth, guards, navbar, catalog/search, product details, cart, checkout/orders, profile, top-up/rewards, merchant, admin, API helpers, and UX polish, with explicit file references and server endpoints.

## Frontend mechanics (how it works)

This section focuses strictly on how each piece operates (events → state → API → UI), without restating features.

- App initialization
  - index.js mounts root; App.js wraps providers; axios Authorization header is set by AuthContext post-login.
  - ThemeContext writes `data-theme` on `<html>`; CSS consumes it via variables/selectors.

- Auth flow
  - Login submit → POST to `/api/auth|merchant|admin/login` → store `access_token` in localStorage → set axios default Authorization.
  - On reload → AuthContext reads token → GET `/api/account/user/profile` to validate → merges profile into `user` state.
  - Logout → clear localStorage + axios header → user state null.

- Route guarding
  - On protected route render → `PrivateRoute` checks `user`; if absent, redirects to login path based on pathname.
  - If roles provided → compare `user.role` against allowlist → redirect accordingly.

- URL-driven search and filters
  - UI changes (typing, selecting category, pager click) update query string.
  - Effect hook reads URL params → calls `searchProducts(params)` → response `{ items, page, total_pages }` updates component state.
  - Pagination controls compute next `page` and push URL; component re-fetches based on URL.

- Category facet
  - Category button click → set `category` in query string → same search pipeline runs; no separate client filter.
  - Optional: direct link to `/api/product/category/:category` uses a lightweight fetch path.

- Product details → cart add
  - Route load with `:productId` → GET `/api/product/:id` into local state.
  - Add click → POST `/api/cart` with `{ product_id, quantity }` → success → UI badge/toast; cart page re-fetches snapshot when opened.

- Cart state
  - Page load → GET `/api/cart` returns normalized items and server-computed totals → render from response.
  - Quantity change → PUT `/api/cart/product/:id?quantity=`; Remove → DELETE `/api/cart/product/:id` → then re-fetch or patch state.

- Checkout → order confirmation
  - Submit → POST to `/api/order` or `/api/checkout` with selected options → response contains order id and amounts → navigate to confirmation route.

- Orders list/detail
  - On mount → GET `/api/order` or `/api/order/user/current` → set table/list state → optional per-item expand from same payload.

- Profile and password
  - Profile form submit → PUT `/api/account/user/profile` → optimistic UI or re-fetch profile.
  - Password form submit → PUT `/api/user/password` with current/new → show success/error only (no token rotation implied).

- Avatar upload
  - File select → build `FormData` → POST `/api/user/avatar` → response contains `url` → set image `src` to URL.

- Wallet and rewards
  - Top-up submit → POST `/api/account/:id/top-up?amount=` → then GET `/api/user/balance` to refresh.
  - Rewards convert → POST `/api/account/redeem-rewards/:points` → then refresh balance and points via GETs.

- Merchant area
  - After merchant login → axios header persists → multipart image upload returns `image_url` → include in product create/update payloads.

- Admin area
  - On view mount → GET `/api/admin/stats` for KPIs → paginated GET `/api/admin/logs|orders?page=` for tables.

- Static media
  - API returns absolute `/uploads/...` paths → components bind directly to `<img src>`; browser fetches from backend static mount.

## Interview summaries: Frontend mechanisms

Use these concise, mechanism-focused blurbs in interviews. Each item includes a mechanism name, how it works (backend + frontend), and a one-liner.

### Authentication (JWT session)
- Mechanism: Stateless JWT auth, axios default header, localStorage persistence.
- Backend: `/api/auth/login|signup` issue HS256 tokens; protected routes validate per request.
- Frontend: `AuthContext` saves token, sets axios Authorization, restores on reload.
- One-liner: “Stateless JWT with axios default header and context; token persisted and revalidated on boot.”

### Route guards and roles
- Mechanism: PrivateRoute with role allowlist.
- Backend: Role checks on protected endpoints.
- Frontend: `PrivateRoute` redirects unauthenticated; enforces roles (`user|merchant|admin`).
- One-liner: “Route guard checks auth and role; unauthorized users are redirected to their login/dashboard.”

### Products and categories (faceted list)
- Mechanism: Faceted category filter with server-side fetch.
- Backend: `/api/product`, `/api/product/categories`, `/api/product/category/:category`.
- Frontend: Products page links/category chips set category filter and refetch.
- One-liner: “Categories act as facets; we fetch only the filtered subset from the server.”

### Search + pagination
- Mechanism: Server-side filtering + offset/limit pagination; URL-driven state.
- Backend: `/api/product/search` with q/category/price/sort/page/page_size; returns `{ items, total, total_pages }`.
- Frontend: Read/write URL query params; call `searchProducts(params)`; render items + pager.
- One-liner: “Query-param search with paginated API results to avoid overfetching.”

### Product details and cart add
- Mechanism: Detail fetch + server-authoritative cart mutation.
- Backend: GET `/api/product/:id`; POST `/api/cart`.
- Frontend: Detail page loads once; Add to Cart posts then reflects server state.
- One-liner: “Details are fetched on demand; cart writes go to server to remain the source of truth.”

### Cart management
- Mechanism: Server-computed totals; idempotent set-quantity and remove.
- Backend: GET `/api/cart`, PUT `/api/cart/product/:id?quantity=`, DELETE `/api/cart/product/:id`.
- Frontend: Fetch snapshot; update/remove triggers re-fetch or local reconcile.
- One-liner: “Cart total is computed server-side; UI mirrors the canonical snapshot.”

### Checkout and Orders
- Mechanism: Canonical order creation endpoint with reward/wallet application.
- Backend: POST `/api/order` or `/api/checkout` (choose one), then order queries.
- Frontend: Checkout submits once, then routes to confirmation; orders list fetches paginated history (optional).
- One-liner: “Submit once to the server; it validates, creates the order, updates stock, and returns a receipt.”

### Profile and password change
- Mechanism: Server-validated updates and password change.
- Backend: GET/PUT `/api/account/user/profile`, PUT `/api/user/password`.
- Frontend: Forms call API; password requires current+new.
- One-liner: “Profile writes and password updates are validated on the server.”

### Avatar upload
- Mechanism: Multipart upload with server-stored media and returned URL.
- Backend: POST `/api/user/avatar` → `/uploads/profiles/...` URL.
- Frontend: `FormData` upload; image `src` updates from response.
- One-liner: “Upload once; server stores and serves via /uploads; UI swaps in returned URL.”

### Wallet top-up and rewards
- Mechanism: Transactional wallet credits and points redemption.
- Backend: POST `/api/account/:id/top-up`, GET/POST `/api/account/rewards|redeem-rewards/:points`.
- Frontend: Top-up and convert flows; refresh balance and points after actions.
- One-liner: “Money-in and points-to-money flows are transactions logged on the server.”

### Merchant workspace
- Mechanism: Role-gated CRUD with multipart image upload.
- Backend: `/api/merchant/*` login, product CRUD, profile/stats, logs.
- Frontend: Merchant routes unlock on login; forms call multipart upload then product create/update.
- One-liner: “Merchants manage catalog via role-gated routes and multipart uploads.”

### Admin dashboard
- Mechanism: KPIs + paginated logs/orders.
- Backend: `/api/admin/stats`, `/api/admin/logs|orders?page=`.
- Frontend: Tables/charts render; pagination keeps responses small.
- One-liner: “Admin views are server-paginated for scale; KPIs are computed server-side.”

### Theming
- Mechanism: Context-driven theme with root data-theme and CSS variables.
- Backend: N/A.
- Frontend: `ThemeContext` toggles and persists; CSS reads `[data-theme]`.
- One-liner: “Theme flips at the root via data-theme; styles react instantly.”

### Static images (/uploads)
- Mechanism: Backend-mounted static directory, URL-first image references.
- Backend: `app.mount("/uploads", StaticFiles(...))` returns absolute URL paths.
- Frontend: Use `image_url` directly in `<img src>`; no client storage.
- One-liner: “Images are served at /uploads; UI just uses the URL returned by the API.”
