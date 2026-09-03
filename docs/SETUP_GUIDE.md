# Leave Management Application — Setup & Installation Guide

## 1. Prerequisites

Before installing and running the application, ensure the following software is installed on your environment:
- **Node.js**: `v18.0.0` or higher (`node -v`)
- **npm**: `v9.0.0` or higher (`npm -v`)
- **PostgreSQL**: `v14.0` or higher (`psql --version`)

---

## 2. Environment Variables Configuration

### 2.1 Backend Environment Configuration
Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database Connection Settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leave_management_db
DB_USER=postgres
DB_PASSWORD=postgres

# Security Settings
JWT_SECRET=leave_management_jwt_secret_2026
```

### 2.2 Frontend Environment Configuration
Create a `.env` file in the `frontend/` directory (optional; defaults to `http://localhost:5001`):

```env
VITE_API_URL=http://localhost:5001
```

---

## 3. Database Setup & Migrations

### Step 1: Create Database
Open your PostgreSQL terminal (`psql`) or database management client (pgAdmin / DBeaver) and create the application database:

```sql
CREATE DATABASE leave_management_db;
```

### Step 2: Run Base Schema & Seed Scripts
Execute the SQL schema and seed files from the `backend/src/config/` directory:

```bash
# Navigate to backend directory
cd backend

# Execute Base Schema
psql -U postgres -d leave_management_db -f src/config/schema.sql

# Execute Migrations in sequence
psql -U postgres -d leave_management_db -f src/config/team_workflow_migration.sql
psql -U postgres -d leave_management_db -f src/config/auth_user_management_migration.sql
psql -U postgres -d leave_management_db -f src/config/configuration_management_migration.sql
psql -U postgres -d leave_management_db -f src/config/paycut_leave_migration.sql

# Execute Initial Seed Data
psql -U postgres -d leave_management_db -f src/config/seed.sql
```

---

## 4. Backend Setup & Local Server Execution

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Start development backend server (Runs on http://localhost:5001)
npm run dev
```

---

## 5. Frontend Setup & Execution

```bash
# 1. Open a new terminal and navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Run linting checks (Enforces 0 warnings & 0 errors)
npm run lint

# 4. Start frontend development server (Runs on http://localhost:5173 or http://localhost:3000)
npm run dev

# 5. Validate production build bundle
npm run build
```

---

## 6. Pre-Configured Demo Test Accounts

Default password for initial seeded test users: **`Password@123`**

| Username | Full Name | Role | Department | Default Redirect Route |
| :--- | :--- | :--- | :--- | :--- |
| `alex.morgan` | Alex Morgan | `employee` | Engineering | `/` (Dashboard) |
| `michael.chen` | Michael Chen | `employee` | Engineering | `/` (Dashboard) |
| `sarah.johnson` | Sarah Johnson | `employee` | Sales | `/` (Dashboard) |
| `priya.fernando` | Priya Fernando | `team_admin` | Engineering | `/admin` (Team Lead Portal) |
| `nadia.perera` | Nadia Perera | `superior_admin` | Executive | `/superior` (Superior Dashboard) |

---

## 7. Common Troubleshooting & Fixes

### Error 1: Database Connection Refused (`ECONNREFUSED 127.0.0.1:5432`)
- **Cause**: PostgreSQL service is not running locally.
- **Fix**: Start your PostgreSQL service (`brew services start postgresql` on macOS, or `sudo service postgresql start` on Linux).

### Error 2: `relation "leave_types" does not exist`
- **Cause**: Database migration scripts were skipped.
- **Fix**: Run `configuration_management_migration.sql` against `leave_management_db`.

### Error 3: CORS Blocked Preflight Error
- **Cause**: Frontend origin mismatch.
- **Fix**: Ensure backend `app.js` enables CORS with `app.use(cors())`.
