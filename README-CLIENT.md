# AgriTrace
## Agri Commodity Traceability & Inventory Management System

AgriTrace is a full-stack web application that tracks agricultural commodities — rice, wheat, maize, cotton, and others — from the moment they are harvested on a farm all the way through processing, warehousing, shipment, and final delivery to the customer. Every step is recorded, every change is broadcast live across all connected screens, and every bag can be traced back to its origin by scanning a QR code.

---

## The Problem It Solves

In traditional agricultural supply chains, there is no reliable way to answer simple but critical questions:

- Where did this batch of rice come from?
- How much stock is left in the warehouse right now?
- Has this shipment been delayed?
- Who handled the grading and packaging?

AgriTrace answers all of these questions in real time through a centralised digital system that every stakeholder — farmer, processor, warehouse manager, dispatcher, and end customer — can access from their role.

---

## How It Works — The Journey of a Batch

```
1. Farmer harvests crop → registers batch in the system
         ↓
2. System auto-generates a unique Batch ID (e.g. RICE-2026-001)
   and a QR code linked to the batch's public trace page
         ↓
3. Processor logs each stage:
   Cleaning → Grading → Packaging
   (quantity losses recorded at every step)
         ↓
4. Warehouse team receives the batch, creates an inventory record
   with stock level, threshold, and expiry date
         ↓
5. Warehouse dashboard monitors all stock levels in real time.
   Alerts fire automatically when stock drops below threshold
   or expiry is within 7 days
         ↓
6. Dispatcher creates a shipment — stock is deducted automatically.
   Status progresses: Pending → In Transit → Delivered
         ↓
7. Customer scans the QR code on the bag.
   No login required. They see the full journey:
   farm → processing → warehouse → delivery
```

Every action above instantly updates all connected dashboards through a live WebSocket connection — no page refresh, no delay.

---

## User Roles

The system has five distinct roles. Each user only sees and can perform actions relevant to their role. The sidebar navigation adjusts automatically.

| Role | What they can do |
|---|---|
| **Admin** | Full access — create batches, log stages, manage inventory, create shipments, view everything, delete batches |
| **Farmer** | Register new commodity batches with harvest details |
| **Processor** | Log processing stages (cleaning, grading, packaging) with quantity updates and location |
| **Warehouse** | Create inventory records, update stock levels, adjust quantities |
| **Dispatcher** | Create shipments, update delivery status, add tracking notes |

All roles can view the dashboard, batches, processing history, inventory, shipments, and alerts.

---

## Pages & Features

### Login / Register
Users register with their name, email, password, and role. On login they receive a secure token that keeps them signed in for 7 days. The system automatically redirects unauthenticated users to the login page.

### Dashboard
The central overview screen showing:
- **6 KPI cards** — Total batches, active batches, pending shipments, low stock alerts, delivered today, total stock in kg
- **Bar chart** — Batch count broken down by status (sourced, cleaning, grading, etc.)
- **Pie chart** — Commodity mix (how many batches of each crop type)
- **Active alerts panel** — All current low stock, expiry, and delay alerts
- **Recent activity feed** — Latest batch and shipment events

All cards and charts update live whenever any user in the system takes an action.

### Batches
Full list of all commodity batches with filtering by status and search by batch ID, farmer name, or farm location.

- **Create batch** — farmers and admins can register a new harvest. The system instantly generates a unique Batch ID in the format `COMMODITY-YEAR-SEQUENCE` (e.g. `RICE-2026-001`) and a QR code.
- **View QR code** — download the generated QR code to print on bags or packaging.
- **Status badges** — each batch shows its current lifecycle stage with a colour-coded badge.

### Processing
Used by processors to record what happens to a batch after harvesting.

- **Batch selector** — pick any batch from the list to view or update it.
- **Log a stage** — record the new stage (cleaning, grading, packaging), the quantity remaining after the stage, the facility location, and any quality notes.
- **Timeline view** — every stage logged for a batch is displayed in chronological order with timestamps, operator name, location, and notes. This forms the audit trail.

### Inventory
Warehouse management screen showing all stock currently held.

- **Stock table** — all inventory records with available stock, reserved stock (committed to active shipments), low-stock threshold, and expiry date.
- **Low stock indicator** — rows where available stock has fallen below the threshold are highlighted in red automatically.
- **Expiry indicator** — rows with expiry within 7 days are flagged.
- **Adjust stock** — add or deduct quantity with a reason (e.g. damage write-off, recount correction). The system prevents stock from going below zero.
- **Filter by low stock only** — toggle to see only items that need attention.

### Shipments
Track all outbound commodity movements.

- **Create shipment** — dispatcher selects a warehoused batch, sets destination, dates, quantity, vehicle number, driver name, and transport mode (road / rail / air / sea). Stock is automatically deducted from inventory.
- **Status progression** — update a shipment through Pending → In Transit → Delivered (or Delayed / Cancelled). Each update can include a tracking note.
- **Overdue detection** — shipments past their expected delivery date that are still not marked delivered are automatically flagged in the Alerts page.
- **On delivery** — when marked as delivered, the batch status updates to "delivered" and reserved stock is cleared from inventory.

### Alerts
Centralised view of everything that needs attention.

- **Current alerts** — fetched from the database: low stock items, batches expiring soon, overdue shipments.
- **Live alerts** — arrive in real time via WebSocket as events happen. Displayed at the top with a live indicator and exact timestamp.
- **Alert types:**
  - 📦 **Low stock** — available stock dropped below the warehouse threshold
  - 🕒 **Expiry soon** — batch expiry date is within 7 days
  - 🚛 **Shipment delayed** — expected delivery date has passed

### Trace Page (Public — No Login Required)
Accessible by scanning the QR code on any bag. Shows:
- Batch origin — farmer name, farm location, harvest date, crop type, quantity
- Complete processing timeline — every stage with date, location, and notes
- Warehouse details — storage location, available stock
- Shipment status — destination and current delivery status

This page requires no login and is designed to be used by customers, auditors, or anyone in the chain who needs to verify the product's origin and journey.

---

## Real-Time Updates

The system uses Socket.IO to push updates to all connected users instantly. When any of the following happen, every open dashboard reflects the change within milliseconds:

| Action | What updates live |
|---|---|
| New batch created | Dashboard stats, batch list, activity feed |
| Stage logged | Batch status badge, dashboard charts |
| Inventory updated | Stock levels, dashboard stats |
| Stock drops below threshold | Alert appears on every screen, email sent |
| Expiry within 7 days | Alert appears on every screen |
| Shipment created | Dashboard stats, shipment list |
| Shipment delivered | Batch status, inventory reserved stock cleared |
| Shipment overdue | Alert appears every 60 seconds until resolved |

The connection status is shown in the top-right corner of every page — a green dot means live, reconnecting means the backend is temporarily unavailable.

---

## Alert Engine

Three automatic alert conditions run continuously in the background:

**Low Stock** — triggers the moment `availableStock` falls below `lowStockThreshold` on any inventory record. Broadcasts a socket event to all connected users and sends an email notification.

**Expiry Warning** — triggers when any inventory record has an `expiryDate` within the next 7 days. Gives the warehouse team time to prioritise dispatch before spoilage.

**Shipment Delay** — a background job runs every 60 seconds checking for shipments whose `expectedDelivery` date has passed but are still in `pending` or `in_transit` status. Each overdue shipment triggers an alert.

---

## Data & Security

**Authentication** — all users log in with email and password. Passwords are hashed with bcrypt before storage. A JSON Web Token (JWT) is issued on login and must be included with every API request. Tokens expire after 7 days.

**Role-based access** — every API endpoint checks both that the user is authenticated and that their role is permitted to perform that action. A farmer cannot create a shipment. A dispatcher cannot adjust inventory. These rules are enforced on the server, not just hidden in the UI.

**Database** — MongoDB stores five collections: Users, Batches, ProcessingLogs, Inventory, and Shipments. Each batch has a unique ID. Each inventory record is tied to exactly one batch. All timestamps are stored in UTC.

---

## Technology Used

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 | User interface |
| Routing | React Router v6 | Page navigation |
| Charts | Recharts | Dashboard bar and pie charts |
| Styling | Custom CSS | Dark earthy-green design system |
| Real-time | Socket.IO (client) | Live updates in the browser |
| HTTP | Axios | API calls with automatic JWT attachment |
| Backend | Node.js + Express.js | REST API server |
| Real-time | Socket.IO (server) | Broadcasting events to all clients |
| Database | MongoDB + Mongoose | Data storage and schema validation |
| Authentication | JWT + bcryptjs | Secure login and role enforcement |
| QR Codes | qrcode (npm) | Generating batch QR codes as PNG images |
| Email | Nodemailer | Sending alert emails |
| Deployment | Render (backend) + Vercel (frontend) | Free cloud hosting |

---

## Project Structure

```
AgriTracabilitySystem/
│
├── server/                         Backend (Node.js + Express)
│   ├── index.js                    Server entry point — starts Express and Socket.IO
│   ├── seed.js                     Populates database with sample data for testing
│   ├── workflow_test.js            Automated test suite (75 assertions)
│   ├── env.txt                     Environment variable template
│   │
│   ├── config/
│   │   └── db.js                   MongoDB connection
│   │
│   ├── models/                     Database schemas (what data looks like)
│   │   ├── User.js                 User accounts with roles
│   │   ├── Batch.js                Commodity batches with status lifecycle
│   │   ├── ProcessingLog.js        One entry per processing stage per batch
│   │   ├── Inventory.js            Warehouse stock records
│   │   └── Shipment.js             Outbound shipments with tracking notes
│   │
│   ├── controllers/                Business logic (what happens on each request)
│   │   ├── batchController.js      Create batches, generate IDs and QR codes
│   │   ├── processingController.js Log stages, update batch status
│   │   ├── inventoryController.js  Stock management and alert checks
│   │   ├── shipmentController.js   Create shipments, update delivery status
│   │   └── dashboardController.js  KPIs, charts, alerts, activity feed
│   │
│   ├── routes/                     URL definitions (which URL calls which controller)
│   │   ├── auth.js                 /api/auth — login, register, profile
│   │   ├── batches.js              /api/batches
│   │   ├── processing.js           /api/processing
│   │   ├── inventory.js            /api/inventory
│   │   ├── shipments.js            /api/shipments
│   │   ├── trace.js                /api/trace/:batchId — public, no login needed
│   │   └── dashboard.js            /api/dashboard
│   │
│   ├── middleware/
│   │   └── authMiddleware.js       Checks JWT token and user role on every request
│   │
│   ├── socket/
│   │   └── socketHandler.js        Manages real-time connections and the delay checker
│   │
│   └── utils/
│       ├── generateBatchId.js      Produces RICE-2026-001 style IDs
│       ├── generateShipmentId.js   Produces SHP-2026-001 style IDs
│       ├── generateQR.js           Creates QR code images pointing to the trace page
│       └── alertEngine.js          Low stock, expiry, and delay alert logic
│
└── client/                         Frontend (React)
    ├── public/
    │   └── index.html              HTML entry point
    │
    └── src/
        ├── App.jsx                 Route definitions and login protection
        ├── index.css               Design system — colours, typography, components
        │
        ├── context/
        │   ├── AuthContext.jsx     Stores logged-in user state across all pages
        │   └── SocketContext.jsx   Single shared real-time connection
        │
        ├── components/             Reusable UI building blocks
        │   ├── Layout.jsx          Sidebar navigation + topbar (used on every page)
        │   ├── StatsCard.jsx       KPI metric card used on the dashboard
        │   ├── StatusBadge.jsx     Colour-coded status pill (sourced, cleaning, etc.)
        │   ├── AlertBanner.jsx     Single alert row with icon and severity colour
        │   └── BatchTable.jsx      Reusable batch data table with actions
        │
        └── pages/                  One file per screen
            ├── Login.jsx           Login and register forms
            ├── Dashboard.jsx       Overview with charts and activity feed
            ├── Batches.jsx         Batch list, create form, QR viewer
            ├── Processing.jsx      Stage logger with timeline view
            ├── Inventory.jsx       Stock table with adjust modal
            ├── Shipments.jsx       Shipment list, create form, status updates
            ├── Alerts.jsx          Alert centre with live socket alerts
            └── TracePage.jsx       Public QR scan page — no login required
```

---

## Setup Instructions

### What you need installed

- **Node.js** v18 or higher — download from nodejs.org
- **MongoDB** — either installed locally, or use a free MongoDB Atlas cloud account at mongodb.com/atlas

### Step 1 — Create the environment file

Inside the `server/` folder, open `env.txt`. Copy its contents and create a new file called `.env` in the same folder. Fill in these four values at minimum:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/agritrace
JWT_SECRET=choose_any_long_random_string
CLIENT_URL=http://localhost:3000
```

If using MongoDB Atlas, replace the `MONGO_URI` line with your Atlas connection string.

### Step 2 — Install packages

Open a terminal and run:

```bash
cd server
npm install

cd ../client
npm install
```

### Step 3 — Start the backend

In one terminal window:

```bash
cd server
npm run dev
```

You should see:
```
✅ MongoDB Connected: ...
🚀 AgriTrace Server running on port 5000
📡 Socket.IO ready
```

### Step 4 — Start the frontend

In a second terminal window:

```bash
cd client
npm start
```

The browser will open automatically at **http://localhost:3000**.

### Step 5 — Load sample data (recommended for first run)

In a third terminal:

```bash
cd server
node seed.js
```

This creates 5 user accounts, 6 batches across all stages, processing history, inventory records, and 2 shipments. Use these to explore the system immediately.

### Sample login accounts (after seeding)

| Email | Password | Role |
|---|---|---|
| admin@agritrace.com | admin123 | Admin — full access |
| farmer@agritrace.com | farmer123 | Farmer |
| processor@agritrace.com | process123 | Processor |
| warehouse@agritrace.com | warehouse123 | Warehouse |
| dispatch@agritrace.com | dispatch123 | Dispatcher |

### Test the QR trace page (no login needed)

Open any of these URLs in your browser after seeding:

```
http://localhost:3000/trace/RICE-2026-001
http://localhost:3000/trace/WHEAT-2026-001
http://localhost:3000/trace/MAIZE-2026-001
```

---

## Deployment

The application can be deployed for free using Render (for the backend) and Vercel (for the frontend).

A `render.yaml` configuration file is included in the project root. The `client/vercel.json` file handles React Router's client-side routing on Vercel.

After deploying the backend to Render, update the two environment variables in `client/.env.production` with your Render URL, then deploy the frontend to Vercel. Full step-by-step deployment instructions are in the project's deployment guide.

---

## Automated Tests

The file `server/workflow_test.js` contains 75 automated assertions that verify every step of the workflow without requiring a database connection. Run it at any time to confirm the system logic is intact:

```bash
cd server
node workflow_test.js
```

Expected result: **75 passed, 0 failed**

---

*AgriTrace v1.0 — MERN Stack · Socket.IO · MongoDB Atlas · Deployed on Render + Vercel*