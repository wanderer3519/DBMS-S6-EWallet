# E-Wallet & E-Commerce Platform: A Comprehensive Technical Explanation

## 1. Project Overview

This document provides a detailed technical breakdown of the E-Wallet & E-Commerce platform. The application is a full-stack solution combining a FastAPI backend with a React frontend, designed to provide a seamless online shopping and payment experience. It supports three user roles (User, Merchant, Admin), each with a distinct set of functionalities.

---

## 2. Technology Stack

- **Backend**:
  - **Framework**: FastAPI
  - **Database**: SQLite
  - **ORM**: SQLAlchemy
  - **Data Validation**: Pydantic
  - **Authentication**: JWT (JSON Web Tokens)
  - **Server**: Uvicorn

- **Frontend**:
  - **Library**: React 18
  - **Routing**: React Router v6
  - **Styling**: Custom CSS, Bootstrap 5, Font Awesome
  - **State Management**: React Context API
  - **API Communication**: Axios
  - **Charting**: Recharts
  - **Date Handling**: date-fns

- **Development & Tooling**:
  - **Language**: Python 3.12, JavaScript (ES6+)
  - **Package Management**: Poetry (backend), npm (frontend)
  - **Version Control**: Git

---

## 3. Database Schema & SQL Implementation

The database is the foundation of the application, designed using a relational model to ensure data integrity and efficient querying. The core logic is implemented directly in SQL through functions and triggers, which are then utilized by the backend.

**Location**: `dbms-backend/sql_implementation/`

### 3.1. SQL Files Breakdown

- **`01_create_tables.sql`**: Defines the schema for all tables in the database.
- **`02_user_functions.sql`**: Contains SQL functions related to user management (e.g., creating users, fetching user data).
- **`03_account_functions.sql`**: Manages wallet accounts, including creation, balance checks, and transactions.
- **`04_product_functions.sql`**: Handles all product-related operations like creation, updates, and search.
- **`05_cart_order_functions.sql`**: Implements the logic for shopping carts, order creation, and order management.
- **`06_triggers.sql`**: Contains automated procedures that fire in response to specific events (e.g., updating a timestamp when a row is modified).
- **`07_admin_functions.sql`**: Provides SQL functions for the admin dashboard, such as fetching platform-wide statistics.

### 3.2. Core Tables

| Table Name | Purpose | Key Columns |
| :--- | :--- | :--- |
| `users` | Stores user information and credentials. | `user_id`, `email`, `password_hash`, `role`, `status` |
| `account` | Manages user e-wallets. | `account_id`, `user_id`, `balance`, `account_type` |
| `products` | Stores all product information. | `product_id`, `merchant_id`, `name`, `price`, `stock` |
| `category` | Defines product categories. | `category_id`, `name` |
| `cart` | Manages items in a user's shopping cart. | `cart_id`, `user_id` |
| `cart_items` | Links products to a user's cart. | `cart_item_id`, `cart_id`, `product_id`, `quantity` |
| `orders` | Stores information about completed orders. | `order_id`, `user_id`, `total_amount`, `status` |
| `order_items` | Details the products included in an order. | `order_item_id`, `order_id`, `product_id`, `quantity` |
| `transactions`| Logs all financial movements (deposits, etc).| `transaction_id`, `account_id`, `amount`, `type` |
| `rewards` | Tracks user loyalty points. | `reward_id`, `user_id`, `points` |

### 3.3. How Triggers Work

Triggers are crucial for maintaining data integrity automatically. A key example is the `update_timestamp` trigger.

- **`update_products_updated_at` Trigger**:
  - **Event**: Fires automatically `AFTER UPDATE` on the `products` table.
  - **Action**: Sets the `updated_at` column of the modified product row to the current timestamp.
  - **Purpose**: This ensures we always have an accurate record of when a product's details were last changed, without needing the application to explicitly set the value. This is critical for auditing and data tracking.

---

## 4. Backend (FastAPI)

The backend is the application's brain, handling business logic, data processing, and secure communication with the database and frontend.

**Location**: `dbms-backend/`

### 4.1. Project Structure

- **`main.py`**: The entry point of the application. It initializes FastAPI, sets up CORS (Cross-Origin Resource Sharing) to allow the frontend to communicate with it, and includes all the API routers. It also mounts the `uploads/` directory to serve static files (like product and profile images).
- **`database.py`**: Manages the database connection using SQLAlchemy. The `get_db` function is a dependency that ensures each request gets a database session and that it's closed afterward.
- **`models.py`**: Contains the SQLAlchemy ORM models. These Python classes map directly to the database tables, allowing us to interact with the database using objects instead of raw SQL queries.
- **`schemas.py`**: Contains the Pydantic models. These define the shape of the data for API requests and responses. FastAPI uses them to validate incoming data, serialize outgoing data, and auto-generate API documentation.
- **`auth_lib.py`**: The heart of the authentication system.
- **`routers/`**: This directory contains the different API endpoints, neatly organized by functionality (e.g., `user.py`, `product.py`).

### 4.2. Authentication (JWT)

Authentication is handled using JSON Web Tokens (JWT), a stateless and secure method.

**How it works (`auth_lib.py`):**
1.  **Login**: When a user logs in with the correct email and password, the backend generates a JWT (`access_token`). This token contains the user's ID and an expiration time.
2.  **Token Storage**: The token is sent to the frontend, which stores it in `localStorage`.
3.  **Authenticated Requests**: For any subsequent request to a protected endpoint, the frontend includes this token in the `Authorization` header (`Bearer <token>`).
4.  **Token Verification**: The backend uses the `get_current_user` dependency on protected routes. This function:
    - Extracts the token from the header.
    - Decodes and validates it.
    - Fetches the corresponding user from the database.
    - Makes the user object available to the endpoint logic.
    - If the token is invalid or expired, it raises an `HTTPException`, denying access.

### 4.3. Image Uploads

**How it works (`routers/user.py` and `routers/merchant.py`):**
1.  **Endpoint**: A dedicated `POST` (or `PUT`) endpoint is created (e.g., `/api/user/avatar`). It uses FastAPI's `UploadFile` to handle file data.
2.  **Validation**: The backend first validates the file's `content_type` (e.g., `image/jpeg`, `image/png`) and size to ensure it's a valid image and not too large.
3.  **File Storage**:
    - A unique filename is generated (e.g., `user_{user_id}.png`).
    - The file is saved to a designated static directory on the server (`uploads/profiles/` or `uploads/products/`).
4.  **Database Update**: The path to the saved image (e.g., `uploads/profiles/user_123.png`) is stored in the corresponding database record (e.g., the `profile_image` column in the `users` table).
5.  **Serving Images**: The `main.py` file has a line `app.mount("/uploads", StaticFiles(directory="uploads"))`. This tells FastAPI to serve any file in the `uploads` directory as a static file. When the frontend requests `http://localhost:8000/uploads/profiles/user_123.png`, the backend directly serves the image file.

### 4.4. API Routers Explained

#### `routers/product.py`
- **`GET /api/product`**: Fetches all products. This is used on the homepage to display the product grid. It supports filtering by `category` and searching by `q` (query string).
- **`GET /api/product/{product_id}`**: Retrieves the details for a single product, used on the Product Details page.

#### `routers/user.py`
- **`GET /api/user/dashboard`**: A powerful endpoint that aggregates all data needed for the user dashboard: wallet balance, recent transactions, and rewards points.
- **`PUT /api/user/password`**: Allows an authenticated user to change their password after verifying their current one.
- **`POST /api/user/avatar`**: Handles the profile picture upload as described above.

#### `routers/account.py`
- **`GET /api/account/user/profile`**: Fetches the profile information for the currently logged-in user.
- **`PUT /api/account/user/profile`**: Allows a user to update their profile information (name, email, phone).

#### `routers/merchant.py`
- **`GET /api/merchant/products`**: Fetches all products belonging to the currently logged-in merchant.
- **`POST /api/merchant/product`**: Allows a merchant to create a new product.
- **`PUT /api/merchant/product/{product_id}`**: Allows a merchant to update the details of one of their products.
- **`PUT /api/merchant/product/{product_id}/image`**: Handles image uploads for a specific product, working similarly to the avatar upload.

#### `routers/admin.py`
- **`GET /api/admin/stats`**: Fetches platform-wide statistics for the admin dashboard, such as total users, total orders, and total revenue.
- **`GET /api/admin/users`**: Retrieves a list of all users on the platform.

---

## 5. Frontend (React)

The frontend is a dynamic Single-Page Application (SPA) built with React, providing a rich and responsive user interface.

**Location**: `dbms-frontend/`

### 5.1. Project Structure

- **`index.js`**: The main entry point. It renders the `App` component and wraps it with the `AuthProvider` and `ThemeProvider`.
- **`App.js`**: The root component that sets up the application's routing.
- **`routes.js`**: Defines all application routes using `react-router-dom`, including the `PrivateRoute` component for role-based access.
- **`context/`**: Contains the React Context providers for global state management.
- **`components/`**: The core of the application, containing all the UI components, organized by feature (e.g., `product`, `dashboard`, `profile`).
- **`api/`**: Contains functions that use `axios` to communicate with the backend API, centralizing all API calls.
- **`styles/`**: Contains global and theme-related CSS files.
- **`index.css`**: Includes global styles and all the animation classes.

### 5.2. State Management (Context API)

Instead of passing props down through many levels, we use the Context API for global state.

#### `AuthContext.js`
This is the most critical context.
- **Purpose**: To manage authentication state across the entire application.
- **How it Works**:
  1.  It creates a context that holds the `user` object and the `token`.
  2.  It provides `login` and `logout` functions that update this state and also interact with `localStorage`.
  3.  **`useEffect` Hook**: A `useEffect` hook runs when the app first loads. It checks `localStorage` for an existing user and token. If found, it initializes the context's state with this data. This is how your login session is persisted even after you refresh the page.
  4.  Any component wrapped within `AuthProvider` can access the user's authentication status and the login/logout functions using the `useAuth` hook.

#### `ThemeContext.js`
- **Purpose**: To manage the dark/light theme.
- **How it Works**: It holds the current theme state (`'light'` or `'dark'`) and a function to toggle it. When toggled, it updates a `data-theme` attribute on the `<body>` tag, and the CSS variables in `theme.css` automatically apply the new color scheme.

### 5.3. Routing & Private Routes

**How it works (`routes.js`):**
- We use `react-router-dom` to define paths and the components they should render.
- **`PrivateRoute` Component**: This is a custom wrapper component that enforces role-based access control.
  - It checks if a user is logged in (by checking `localStorage` or `AuthContext`). If not, it redirects to `/login`.
  - It optionally checks if the user's role (e.g., `'admin'`) is in the `allowedRoles` prop. If the role doesn't match, it redirects the user to a safe page like the dashboard.
  - This prevents users from accessing pages they are not authorized to see simply by typing the URL.

### 5.4. Displaying Images from the Backend

**How it works:**
1.  When the frontend fetches data (e.g., a product or user profile), the backend sends the image path (e.g., `uploads/products/laptop.jpg`).
2.  In the React component, we construct the full URL to the image:
    ```jsx
    const API_BASE_URL = 'http://localhost:8000';
    <img src={`${API_BASE_URL}/${product.image_url}`} alt={product.name} />
    ```
3.  The browser then makes a `GET` request to `http://localhost:8000/uploads/products/laptop.jpg`.
4.  Because we mounted the `uploads` directory as a static folder in `main.py`, the FastAPI backend directly serves the image file, and it appears in the browser.

### 5.5. Animations & Styling

- **Global Animations (`index.css`)**: A rich library of CSS keyframe animations (`fadeInUp`, `pulse`, `float`, etc.) and utility classes are defined here. This allows for consistent and reusable animations across the application.
- **Page Transitions**: The `Page.js` component is wrapped in a `div` with the class `page-transition`, which applies a smooth slide-in effect to every page.
- **Component-Specific Effects**: Each component's CSS file (e.g., `Products.css`, `QuickActions.css`) contains highly-styled hover and interaction effects. For example, the product cards use a combination of `transform: translateY`, `scale`, and `box-shadow` transitions to create a "lift" effect. The icons on the dashboard use `rotate` and `bounce` animations to feel more alive.
- **Theme Support (`theme.css`)**: The application uses CSS variables for all colors. The `ThemeContext` toggles a `data-theme` attribute, and this file defines the color values for both `[data-theme='light']` and `[data-theme='dark']`, allowing for instant theme switching.

---

## 6. How It All Works Together: Feature Walkthrough

### User Login
1.  **User**: Enters email/password in `Login.js`.
2.  **Frontend**: On submit, calls the `login` function from `AuthContext`.
3.  **`AuthContext`**: Makes a `POST` request to `/api/auth/login` with the credentials.
4.  **Backend**: Verifies credentials. If correct, generates a JWT and returns it with user data.
5.  **`AuthContext`**: Stores the token and user data in `localStorage` and updates its state.
6.  **React**: The app re-renders. Components that use `useAuth` now see the logged-in user, and the user is redirected to the dashboard.

### Merchant Updating a Product Image
1.  **Merchant**: On the merchant dashboard, selects a product and chooses a new image file.
2.  **Frontend**: An `onChange` event on the file input triggers. The component stores the selected file in its state and displays a preview.
3.  **Merchant**: Clicks "Upload Image".
4.  **Frontend**: Makes a `PUT` request to `/api/merchant/product/{product_id}/image`. The request body is `FormData` containing the image file.
5.  **Backend**: The endpoint receives the file, validates it, saves it to `uploads/products/`, and updates the `image_url` in the `products` table for that `product_id`.
6.  **Frontend**: On success, it shows a confirmation message and re-fetches the product data to display the new image.

### Admin Viewing Dashboard
1.  **Admin**: Logs in and navigates to `/admin-dashboard`. The `PrivateRoute` component verifies the `'admin'` role.
2.  **Frontend**: The `AdminDashboard.js` component mounts and its `useEffect` hook fires.
3.  **Frontend**: It makes a `GET` request to `/api/admin/stats`. The request includes the admin's JWT.
4.  **Backend**: The `get_current_user` dependency verifies the token and role. The endpoint then runs queries to calculate total users, orders, revenue, etc.
5.  **Backend**: Returns a JSON object with all the statistics.
6.  **Frontend**: The component receives the data, stores it in its state, and renders the stat cards and charts.
