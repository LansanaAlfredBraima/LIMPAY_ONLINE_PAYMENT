# LIMPAY - Online Payment System Documentation

## 1. Introduction
LIMPAY is a robust online payment system designed for university fee management. It allows students to view their outstanding fees, make secure payments using credit/debit cards, and track their transaction history. The system is built with a focus on security, usability, and data integrity.

## 2. Software Principles & Architecture

### 2.1 Architecture
LIMPAY follows a **Client-Server Architecture**:
- **Client (Frontend)**: Built with HTML, CSS, and Vanilla JavaScript. It handles user interactions, displays data, and communicates with the server via RESTful APIs.
- **Server (Backend)**: Built with Node.js and Express. It processes API requests, handles business logic, interacts with the database, and integrates with the Stripe payment gateway.
- **Database**: SQLite is used for persistent storage of user data, fees, and transactions.

### 2.2 Design Patterns
- **REST API**: The backend exposes RESTful endpoints (GET, POST, PUT) for resources like Users, Payments, and Transactions.
- **Middleware Pattern**: Express middleware is used for request validation (`express-validator`), authentication (`authenticateToken`), and error handling.
- **Service-Oriented Logic**: Payment processing is decoupled into specific routes that handle interaction with external services (Stripe).

### 2.3 Security Principles
- **Authentication**: JSON Web Tokens (JWT) are used for stateless authentication.
- **Password Security**: User passwords are hashed using `bcrypt` before storage.
- **Payment Security**: Sensitive card data is never stored on the server. Stripe Elements are used on the frontend to securely transmit card data directly to Stripe.

---

## 3. Technologies Used

### Frontend
- **HTML5**: Structure of the web pages.
- **CSS3**: Styling and layout (custom CSS).
- **JavaScript (ES6+)**: Client-side logic and API integration.
- **Stripe.js**: Client-side library for Stripe integration.

### Backend
- **Node.js**: Runtime environment.
- **Express.js**: Web framework for routing and middleware.
- **SQLite3**: Relational database engine.
- **Stripe SDK**: Server-side library for payment processing.
- **JWT (jsonwebtoken)**: For secure user sessions.
- **Bcrypt**: For password hashing.
- **Dotenv**: For environment variable management.

---

## 4. Database Schema Design

The database consists of four main tables designed to ensure data integrity and efficient querying.

### 4.1 Users Table (`users`)
Stores student and admin information.
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique Student ID or Admin ID |
| `name` | TEXT | Full Name |
| `email` | TEXT | Unique Email Address |
| `password_hash` | TEXT | Bcrypt hashed password |
| `role` | TEXT | 'student' or 'admin' |
| `faculty` | TEXT | Faculty name |
| `created_at` | DATETIME | Timestamp of registration |

### 4.2 Fees Table (`fees`)
Defines the types of fees available in the system.
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique Fee ID (e.g., 'fee_tuition_24') |
| `type` | TEXT | Fee Type (e.g., 'Tuition Fee') |
| `description` | TEXT | Detailed description |
| `amount` | REAL | Standard amount for the fee |
| `session` | TEXT | Academic Session (e.g., '2024/2025') |

### 4.3 User Fees Table (`user_fees`)
Tracks the fee status for individual students (Many-to-Many relationship between Users and Fees).
| Column | Type | Description |
|--------|------|-------------|
| `user_id` | TEXT (FK) | Reference to `users.id` |
| `fee_id` | TEXT (FK) | Reference to `fees.id` |
| `total_amount` | REAL | Total amount assigned to student |
| `paid_amount` | REAL | Amount paid so far |
| `balance` | REAL | Remaining balance (`total_amount - paid_amount`) |
| `updated_at` | DATETIME | Last update timestamp |

### 4.4 Transactions Table (`transactions`)
Records every payment attempt and its status.
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Stripe Payment Intent ID |
| `user_id` | TEXT (FK) | Reference to `users.id` |
| `fee_id` | TEXT (FK) | Reference to `fees.id` |
| `amount` | REAL | Amount paid |
| `status` | TEXT | Payment status (e.g., 'Success') |
| `description` | TEXT | Payment description |
| `card_last4` | TEXT | Last 4 digits of the card used |
| `created_at` | DATETIME | Timestamp of transaction |

---

## 5. Database Creation and Setup

### Prerequisites
- Node.js and npm installed.

### Setup Steps
1.  **Navigate to the server directory**:
    ```bash
    cd server
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Initialize Database**:
    Run the initialization script to create the `limpay.db` file and seed it with default data (Admin user, default fees).
    ```bash
    npm run init-db
    ```
    *Output should confirm: "Tables created successfully", "Admin user seeded", "Default fees seeded".*

---

## 6. Payment Handling (Stripe Integration)

The payment flow is a two-step process involving both the client and the server to ensure security.

### Step 1: Payment Intent Creation (Server)
- **Endpoint**: `POST /api/payments/create-payment-intent`
- **Process**:
    1.  Client sends the payment amount.
    2.  Server authenticates the user.
    3.  Server calls Stripe API `stripe.paymentIntents.create` with the amount and currency.
    4.  Stripe returns a `clientSecret`.
    5.  Server sends `clientSecret` back to the client.

### Step 2: Payment Confirmation (Client)
- **Process**:
    1.  Client uses `stripe.confirmPayment` with the `clientSecret` and card details collected via Stripe Elements.
    2.  Stripe processes the transaction.
    3.  If successful, Stripe returns a `paymentIntent` object with status `succeeded`.

### Step 3: Transaction Recording (Server)
- **Endpoint**: `POST /api/payments/record`
- **Process**:
    1.  Client sends `paymentIntentId`, `feeId`, and `amount` to the server.
    2.  Server verifies the payment status directly with Stripe using `stripe.paymentIntents.retrieve`.
    3.  **Atomic Transaction**:
        -   Insert record into `transactions` table.
        -   Update `paid_amount` and `balance` in `user_fees` table.
    4.  Server commits the transaction and returns success response.

---

## 7. User Manual

### 7.1 Registration
1.  Open the application and navigate to the **Register** page.
2.  Enter your **Student ID**, **Full Name**, **Email Address**, and **Password**.
3.  Click **Register**.
4.  Upon success, you will be redirected to the Login page.
    *Note: New students are automatically assigned default fees (Tuition, Departmental, Accommodation).*

### 7.2 Login
1.  Navigate to the **Login** page.
2.  Enter your **Student ID** (or Email) and **Password**.
3.  Click **Login**.
4.  You will be redirected to your **Dashboard**.

### 7.3 Dashboard Overview
- **Student Profile**: Shows your name, ID, and faculty.
- **Fee Summary**: Displays cards for each fee type with:
    -   Total Amount
    -   Paid Amount
    -   **Outstanding Balance**
- **Pay Now**: Button to initiate payment for a specific fee.

### 7.4 Making a Payment
1.  On the Dashboard, click **Pay Now** on the fee card you wish to pay.
2.  You will be redirected to the **Payment Page**.
3.  Review the payment details.
4.  Enter your **Card Number**, **Expiry Date**, and **CVC** in the secure Stripe input field.
5.  Click **Pay [Amount]**.
6.  Wait for processing. Do not close the window.
7.  On success, you will see a **Payment Success** screen and be redirected to the Receipt page.

### 7.5 Viewing History
1.  Click on **History** in the navigation menu.
2.  You will see a table of all your past transactions, including Date, Description, Amount, Status, and Card used.

### 7.6 Admin Access
The system includes a comprehensive Admin Dashboard for managing students and monitoring transactions.

#### Accessing the Admin Panel
- **Login URL**: `/login.html` (Same as students)
- **Default Credentials**:
    -   **ID**: `admin`
    -   **Password**: `admin123`
    -   *Note: It is recommended to change this password immediately after deployment.*

#### Admin Features

**1. Student Management**
Admins have full control over student accounts.
-   **View Students**: The dashboard displays a list of all registered students with their ID, Name, Email, and Faculty.
-   **Add Student**:
    1.  Click **Add Student**.
    2.  Enter Student ID, Name, Email, Password, and Faculty.
    3.  Click **Save**.
    4.  *System Action*: The new student is automatically assigned the default fee structure (Tuition, Departmental, Accommodation).
-   **Update Student**:
    1.  Click the **Edit** (Pencil) icon next to a student.
    2.  Modify the details (Name, Email, Faculty, or reset Password).
    3.  Click **Update**.
-   **Delete Student**:
    1.  Click the **Delete** (Trash) icon.
    2.  Confirm the action.
    3.  *System Action*: This performs a **Cascading Delete**, removing the student's account, all their fee records, and all their transaction history to maintain database integrity.

**2. Transaction Monitoring**
-   Navigate to the **Transactions** tab.
-   View a system-wide history of all payments made by all students.
-   Details include: Transaction ID, Student Name, Amount, Date, and Status.

