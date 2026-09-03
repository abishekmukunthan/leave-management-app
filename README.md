# Leave Management Web Application

A modern, enterprise-grade SaaS web application built with **React 18**, **Vite**, **Node.js**, **Express.js**, and **PostgreSQL** for streamlined employee leave management, substitute handover tracking, department availability scheduling, and executive workforce oversight.

---

## 🌟 Key Features

- 🔐 **Authentication & Authorization**: Secure username/password authentication with `bcryptjs` password hashing, stateless JWT session tokens, and a **Force Password Change Flow** for new accounts and temporary password resets.
- 👥 **Superior Admin User Provisioning**: Provision employees and team leads with auto-generated usernames and secure temporary passwords, reset passwords, and soft-deactivate user accounts.
- ⚙️ **Configuration Management**: Manage company Teams, Leave Types (*Annual, Sick, Casual, Emergency, Half Day, Time Permission*), and individual Employee Leave Entitlements/Quotas.
- 🤝 **Peer Substitute Handover Workflow**: Mandatory work assignment notes and substitute acceptance before requests advance to manager approval.
- 🛑 **Overlapping Absence Prevention**: Automated blocking of duplicate or overlapping leave applications across active statuses.
- ⚠️ **Paycut / No-Pay Leave Warning System**: Real-time quota calculation warning alert with a `confirm_paycut` override when an employee exceeds their allocated quota.
- 📅 **Interactive Availability Calendar**: 7-column monthly grid with unique employee availability counting, and a centered date-click popup modal for department attendance breakdown and handover notes.
- 📊 **Executive Superior Admin Dashboard**: Real-time snapshot grid (*Total Away Right Now*, *On Leave Today*, *Time Permission Today*, *Leave Calendar* shortcut), request summaries, and rejected leaves table.

---

## 🚀 Tech Stack

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 8, React Router DOM v6, Vanilla CSS3 (2026 SaaS Design Tokens), Lucide React |
| **Backend** | Node.js (ES Modules), Express.js 4.x, PostgreSQL (`pg` pool), JWT, BcryptJS, CORS |
| **Database** | PostgreSQL 14+ (UUIDs, Foreign Keys, Atomic Transactions, Triggers) |
| **Quality** | Oxlint (0 warnings, 0 errors enforced) |

---

## 📚 Complete Project Documentation

Explore the detailed documentation in the [`docs/`](./docs/) directory:

- 📋 [**Product Requirements Document (PRD)**](./docs/PRODUCT_REQUIREMENTS.md) — Problem statement, user roles, core features, functional & non-functional requirements.
- 🏗️ [**Technical Architecture Documentation**](./docs/TECHNICAL_DOCUMENTATION.md) — System architecture diagram, stack specifications, directory layout, design patterns.
- 🗄️ [**Database Design & Schema Documentation**](./docs/DATABASE_DESIGN.md) — Entity-Relationship Diagram (ERD), table definitions, constraints, indices, migrations.
- 🔌 [**Backend API Documentation**](./docs/API_DOCUMENTATION.md) — Endpoint reference for Auth, Leaves, Substitutes, Admin, Superior Admin, and Calendar modules.
- 🔄 [**User Roles & Business Workflows**](./docs/USER_ROLES_AND_WORKFLOWS.md) — End-to-end sequence diagrams, role responsibilities, calendar access rules, force password change flow.
- 🛠️ [**Setup & Installation Guide**](./docs/SETUP_GUIDE.md) — Prerequisites, database setup, environment variables, test account credentials, troubleshooting.

---

## ⚡ Quick Start Guide

### 1. Backend Server
```bash
cd backend
npm install
npm run dev
# Server running at http://localhost:5001
```

### 2. Frontend Web Portal
```bash
cd frontend
npm install
npm run dev
# Portal running at http://localhost:5173
```

---

## 🔑 Pre-Configured Demo Test Credentials

Default Password for initial seeded accounts: **`Password@123`**

| Username | Role | Department | Default Portal Access |
| :--- | :--- | :--- | :--- |
| `alex.morgan` | Employee | Engineering | `/` (Employee Dashboard & Leave Portal) |
| `priya.fernando` | Team Admin | Engineering | `/admin` (Team Lead Approval Portal) |
| `nadia.perera` | Superior Admin | Executive | `/superior` (Superior Admin Dashboard) |

---

## 📄 License & Attribution
Designed & developed for enterprise workforce management.
