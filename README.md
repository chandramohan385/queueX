# QueueX — Smart Service & Order Management Platform
> Express Xerox, Printing, & Counter Operations POS with Real-Time Telemetry

![QueueX Banner](https://img.shields.io/badge/QueueX-PRO-0284c7?style=for-the-badge)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## 📌 Overview

**QueueX** is an end-to-end service and queue management system engineered for high-volume commercial print and photocopy shops. It replaces manual paper slips, crowded pickup counters, and pricing errors with real-time digital ticket stubs, automated price calculation shields, native Web Audio chimes, browser push notifications, interactive document inspection, and direct 80mm continuous thermal POS receipt printing.

---

## ✨ Key Features

### 👤 Customer Experience (Zero Signup Friction)
- **Instant Price Estimator:** Multi-service ordering (B&W Xerox, Color Print, Photo Glossy, Card Printing, Spiral Binding) with dynamic real-time price calculations.
- **Multi-Document Upload:** Attach source PDFs and images with automatic metadata (page counts, file size).
- **Daily Sequential Token Generator:** Clean verbal counter tokens (e.g., `#PX-001`, `#PX-002`) that reset daily.
- **Frictionless "My Orders" Hub:** Remembers the customer's mobile number in `localStorage`—no passwords or account creation needed. Displays active counter jobs and past 30-day order history.
- **Server-Sent Events (SSE) Live Tracking:** Instant zero-polling status advancement (`QUEUED` → `PROCESSING` → `READY` → `COMPLETED`).
- **Web Audio Chimes & Push Notifications:** Native browser Web Audio API dual-harmonic chime ($D_5 \rightarrow A_5$), phone vibration, and push notifications when your order is marked `READY`.
- **1-Tap WhatsApp Token Sharing:** Pre-formatted WhatsApp share link to forward tokens and live tracking URLs.

### 🖥️ Counter Operations POS (Operators)
- **High-Density Dispatch Queue:** Filter by status (`ALL`, `QUEUED`, `PROCESSING`, `READY`, `COMPLETED`) with search.
- **In-Browser Document Previewer:** Inspect PDFs and zoom images (50% to 250%) inside the app without opening separate windows.
- **Direct 80mm Thermal Receipt Printing:** Native `@media print` 80mm continuous thermal slip dialog via `window.print()` and downloadable PDF slips.
- **Single-Tap Status Advancement:** Quick status toggling with atomic transition guards.

### 📊 Shop Owner Intelligence & Settlement
- **Owner Analytics Command Center:** Settled gross revenue, total tickets processed, average order value, and completion rates.
- **Peak Hours Distribution (8 AM – 8 PM):** Visual bar chart identifying customer rush density for staff allocation.
- **Top 8 Services Leaderboard:** Real-time volume and revenue rankings with percentage share bars.
- **Daily Revenue Timeline:** Day-by-day revenue trends across custom timeframes (`7d`, `30d`, `90d`, `all`).
- **End-of-Day Settlement & Reconciliation:** Reconcile settled cash/UPI against pending counter dues.
- **1-Tap CSV Export:** Download structured settlement reports (`QueueX_Settlement_YYYY-MM-DD.csv`) for accounting/Tally.
- **80mm Daily Settlement Sheet:** Print physical register closure slips with cashier and owner verification signatures.

---

## 🛠️ Architecture & Tech Stack

```
                          ┌────────────────────────────┐
                          │      QueueX Platform       │
                          └────────────────────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
┌─────────────────────────┐                               ┌─────────────────────────┐
│     Customer Portal     │                               │      Operator POS       │
│  http://localhost:5173  │                               │ http://localhost:5173/  │
│ - Pricing Calculator    │                               │        admin            │
│ - Document Attachment   │                               │ - High-Density Queue    │
│ - "My Orders" Hub       │                               │ - Document Previewer    │
│ - Web Audio Chime       │                               │ - Direct 80mm Print     │
│ - WhatsApp Share        │                               │ - Owner Analytics       │
└─────────────────────────┘                               └─────────────────────────┘
             │                                                     │
             └──────────────────────────┬──────────────────────────┘
                                        ▼ (REST + SSE)
                       ┌─────────────────────────────────┐
                       │   Node.js + Express (TS)        │
                       │     http://localhost:5000       │
                       │ - Zod Validation Engine         │
                       │ - Server-Side "Price Shield"    │
                       │ - Finite State Machine (FSM)    │
                       │ - SSE Broadcast Manager         │
                       │ - JWT & Role-Based Auth         │
                       └─────────────────────────────────┘
                                        │
                                        ▼ (Pooler SSL)
                       ┌─────────────────────────────────┐
                       │   Supabase Cloud PostgreSQL     │
                       │ - services, orders, order_items │
                       │ - order_files, users            │
                       └─────────────────────────────────┘
```

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, jsPDF
- **Backend:** Node.js, Express, TypeScript, Server-Sent Events (SSE), Zod, bcryptjs, jsonwebtoken
- **Database:** PostgreSQL (Supabase Cloud) with `pg.Pool` connection pooling

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL or Supabase account

### 1. Clone the repository
```bash
git clone https://github.com/chandramohan385/queueX.git
cd queueX
```

### 2. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in `server/`:
```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=http://localhost:5173
```

Run database migrations:
```bash
npm run migrate
npm run seed
npm run dev
```

### 3. Frontend Setup
```bash
cd ../client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔐 Default Staff & Owner Credentials

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Shop Owner** | `admin@queuex.com` | `QueueX@2026` | Dispatcher POS (`/admin`) + Analytics & Settlement (`/admin/analytics`) |
| **Counter Operator** | `staff@queuex.com` | `Staff@2026` | Dispatcher POS (`/admin`) |

---

## 📄 License
This project is licensed under the MIT License.

Developed by **[Avuram Chandra Mohan Reddy](https://github.com/chandramohan385)**.
