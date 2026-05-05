# 🌾 AgriTrace
### Agri Commodity Traceability & Inventory Management System

> Real-time tracking of agricultural commodities from farm to customer — built with the MERN stack and Socket.IO.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Workflow](#workflow)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Role-Based Access](#role-based-access)
8. [Real-Time Events (Socket.IO)](#real-time-events)
9. [Alert Engine](#alert-engine)
10. [Setup & Installation](#setup--installation)
11. [Running the Project](#running-the-project)
12. [Seeding Test Data](#seeding-test-data)
13. [Testing the Workflow](#testing-the-workflow)
14. [QR Code Traceability](#qr-code-traceability)
15. [Login Credentials (After Seed)](#login-credentials-after-seed)

---

## Project Overview

AgriTrace tracks agricultural commodities through every stage of the supply chain:

- **Farm level** — Farmer registers a batch harvest with quantity and location
- **Processing** — Processor logs cleaning, grading, and packaging with quantity updates
- **Warehouse** — Warehouse team records inventory with stock thresholds and expiry
- **Shipment** — Dispatcher creates shipments and updates delivery status in real-time
- **Customer** — Anyone can scan a QR code on the bag to see the full journey

Every action emits a Socket.IO event that instantly updates all connected dashboards — no page refresh needed.

---

## Workflow

```
Farmer Adds Batch
       ↓
Generate Batch ID + QR Code          ← auto-generated on batch creation
       ↓
Processor Updates Stage               ← cleaning → grading → packaging
       ↓  (quantity loss tracked at each stage)
Inventory Created at Warehouse        ← auto-status update + stock thresholds set
       ↓
Warehouse Monitors Stock              ← dashboard + real-time low-stock alerts
       ↓
Shipment Created by Dispatcher        ← stock deducted, batch → "shipped"
       ↓  (pending → in_transit → delivered)
Customer Tracks Batch via QR          ← public page, no login required
```

**Batch Status Lifecycle:**

```
sourced → cleaning → grading → packaging → warehoused → shipped → delivered
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Recharts |
| Styling | Custom CSS (dark earthy-green design system) |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Real-Time | Socket.IO |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| QR Codes | `qrcode` npm package (base64 PNG) |
| Email Alerts | Nodemailer (Gmail App Password) |
| HTTP Client | Axios (with JWT interceptor) |

---

## Project Structure

```
agritrace/
├── server/
│   ├── index.js                    ← Express + Socket.IO entry point
│   ├── seed.js                     ← Populate DB with test data
│   ├── env.txt                     ← Environment variable template
│   ├── workflow_test.js            ← 75-assertion workflow test suite
│   ├── config/
│   │   └── db.js                   ← MongoDB connection
│   ├── models/
│   │   ├── User.js                 ← roles: admin/farmer/processor/warehouse/dispatcher
│   │   ├── Batch.js                ← commodity batches with status lifecycle
│   │   ├── ProcessingLog.js        ← stage-by-stage processing entries
│   │   ├── Inventory.js            ← warehouse stock with alert thresholds
│   │   └── Shipment.js             ← shipments with tracking notes
│   ├── controllers/
│   │   ├── batchController.js
│   │   ├── processingController.js
│   │   ├── inventoryController.js
│   │   ├── shipmentController.js
│   │   └── dashboardController.js
│   ├── routes/
│   │   ├── auth.js                 ← register, login, /me
│   │   ├── batches.js
│   │   ├── processing.js
│   │   ├── inventory.js
│   │   ├── shipments.js
│   │   ├── trace.js                ← PUBLIC — no auth, for QR scan
│   │   └── dashboard.js
│   ├── middleware/
│   │   └── authMiddleware.js       ← protect() + authorize(...roles)
│   ├── socket/
│   │   └── socketHandler.js        ← Socket.IO events + 60s delay checker
│   └── utils/
│       ├── generateBatchId.js      ← RICE-2026-001 format
│       ├── generateShipmentId.js   ← SHP-2026-001 format
│       ├── generateQR.js           ← base64 QR PNG pointing to /trace/:id
│       └── alertEngine.js          ← low stock, expiry, delay alerts
│
└── client/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.jsx                 ← routes + protected route wrapper
        ├── index.css               ← full design system (CSS variables)
        ├── context/
        │   ├── AuthContext.jsx     ← global user state + login/logout
        │   └── SocketContext.jsx   ← single shared Socket.IO connection
        ├── components/
        │   └── Layout.jsx          ← sidebar + topbar + role-filtered nav
        ├── pages/
        │   ├── Login.jsx           ← register + login tabs
        │   ├── Dashboard.jsx       ← KPI cards + charts + activity feed
        │   ├── Batches.jsx         ← batch list + create + QR display
        │   ├── Processing.jsx      ← batch selector + stage logger + timeline
        │   ├── Inventory.jsx       ← warehouse stock table + adjust modal
        │   ├── Shipments.jsx       ← shipment list + create + status update
        │   ├── Alerts.jsx          ← active alerts + live socket alerts
        │   └── TracePage.jsx       ← PUBLIC — QR scan landing page
        └── utils/
            └── api.js              ← Axios instance (baseURL=/api, JWT interceptor)
```

---

## Database Schema

### Batch
| Field | Type | Notes |
|---|---|---|
| batchId | String | Auto-generated, e.g. `RICE-2026-001` |
| commodityType | String | Rice, Wheat, Maize, etc. |
| farmerName | String | |
| farmLocation | String | |
| harvestDate | Date | |
| quantity | Number | Updated at each processing stage |
| unit | Enum | kg / tonnes / quintal / bags |
| currentStatus | Enum | sourced → cleaning → ... → delivered |
| qrCodeUrl | String | base64 PNG data URL |
| createdBy | ObjectId → User | |

### ProcessingLog
| Field | Type | Notes |
|---|---|---|
| batchId | ObjectId → Batch | |
| stage | Enum | cleaning / grading / packaging / etc. |
| operatorName | String | |
| operatorId | ObjectId → User | |
| quantityAfter | Number | Tracks losses at each stage |
| location | String | Facility name |
| notes | String | Quality observations |
| timestamp | Date | |

### Inventory
| Field | Type | Notes |
|---|---|---|
| batchId | ObjectId → Batch | Unique — one record per batch |
| warehouseLocation | String | |
| availableStock | Number | |
| reservedStock | Number | Quantity committed to active shipments |
| lowStockThreshold | Number | Alert fires when available < this |
| expiryDate | Date | Alert fires when ≤ 7 days away |
| unit | Enum | |

### Shipment
| Field | Type | Notes |
|---|---|---|
| shipmentId | String | Auto-generated, e.g. `SHP-2026-001` |
| batchId | ObjectId → Batch | |
| destination | String | |
| dispatchDate | Date | |
| expectedDelivery | Date | Alert fires if passed and not delivered |
| deliveryStatus | Enum | pending / in_transit / delivered / delayed / cancelled |
| quantityShipped | Number | Deducted from inventory on creation |
| transportMode | Enum | road / rail / air / sea |
| trackingNotes | Array | Timestamped notes added at each update |

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create account |
| POST | `/api/auth/login` | None | Returns JWT token |
| GET | `/api/auth/me` | JWT | Get current user |

### Batches
| Method | Endpoint | Auth | Roles |
|---|---|---|---|
| GET | `/api/batches` | JWT | All |
| GET | `/api/batches/:id` | JWT | All |
| POST | `/api/batches` | JWT | admin, farmer |
| PUT | `/api/batches/:id/status` | JWT | admin, processor, warehouse, dispatcher |
| DELETE | `/api/batches/:id` | JWT | admin |

Query params for GET `/api/batches`: `?status=cleaning&commodity=rice&search=ravi&page=1&limit=20`

### Processing
| Method | Endpoint | Auth | Roles |
|---|---|---|---|
| GET | `/api/processing/:batchId` | JWT | All |
| POST | `/api/processing` | JWT | admin, processor, warehouse, dispatcher |

### Inventory
| Method | Endpoint | Auth | Roles |
|---|---|---|---|
| GET | `/api/inventory` | JWT | All |
| GET | `/api/inventory/:batchId` | JWT | All |
| POST | `/api/inventory` | JWT | admin, warehouse |
| PUT | `/api/inventory/:id` | JWT | admin, warehouse |
| PATCH | `/api/inventory/:id/adjust` | JWT | admin, warehouse |

### Shipments
| Method | Endpoint | Auth | Roles |
|---|---|---|---|
| GET | `/api/shipments` | JWT | All |
| GET | `/api/shipments/:id` | JWT | All |
| POST | `/api/shipments` | JWT | admin, dispatcher |
| PUT | `/api/shipments/:id/status` | JWT | admin, dispatcher |

### Trace (Public — No Auth)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/trace/:batchId` | None | Full journey for QR scan |

### Dashboard
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/stats` | JWT | KPI counts |
| GET | `/api/dashboard/status-breakdown` | JWT | Chart data |
| GET | `/api/dashboard/commodity-breakdown` | JWT | Chart data |
| GET | `/api/dashboard/recent-activity` | JWT | Activity feed |
| GET | `/api/dashboard/alerts` | JWT | All active alerts |

---

## Role-Based Access

| Role | Create Batch | Log Stage | Manage Inventory | Create Shipment | View All |
|---|:---:|:---:|:---:|:---:|:---:|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| farmer | ✅ | ❌ | ❌ | ❌ | ✅ |
| processor | ❌ | ✅ | ❌ | ❌ | ✅ |
| warehouse | ❌ | ✅ | ✅ | ❌ | ✅ |
| dispatcher | ❌ | ✅ | ❌ | ✅ | ✅ |

The sidebar navigation automatically hides pages the logged-in role cannot access.

---

## Real-Time Events

All events are emitted via Socket.IO and received by the React frontend automatically.

| Event | Emitted When | Frontend Effect |
|---|---|---|
| `batch_created` | New batch added | Toast + batch list refresh |
| `batch_status_updated` | Stage logged | Toast + status badge updates |
| `inventory_updated` | Stock changes | Toast + inventory table refresh |
| `low_stock_alert` | Stock < threshold | Red error toast on all dashboards |
| `expiry_alert` | Expiry ≤ 7 days | Red error toast on all dashboards |
| `delay_alert` | Shipment overdue | Red error toast on all dashboards |
| `shipment_dispatched` | Shipment created | Success toast |
| `shipment_status_updated` | Delivery status changes | Toast |

The server also runs a background check every 60 seconds for overdue shipments.

---

## Alert Engine

Alerts fire automatically on inventory changes (`alertEngine.js`):

**Low Stock Alert** — fires when `availableStock < lowStockThreshold`
```
Socket emit → low_stock_alert
Email via Nodemailer
```

**Expiry Alert** — fires when `expiryDate` is within 7 days
```
Socket emit → expiry_alert
```

**Shipment Delay Alert** — fires every 60s for shipments where `expectedDelivery < now` and status is not `delivered`
```
Socket emit → delay_alert
```

---

## Setup & Installation

### Prerequisites

- Node.js v18+
- MongoDB (local) or MongoDB Atlas account (free)
- Git

### 1. Clone / copy the project

```bash
# If using git
git clone <your-repo-url>
cd agritrace

# Or just place the agritrace/ folder on your machine
```

### 2. Create the `.env` file

```bash
cd server
# Open env.txt — copy all contents into a NEW file called .env
# Fill in your values:
```

Minimum required values in `.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/agritrace
JWT_SECRET=any_long_random_string_here
CLIENT_URL=http://localhost:3000
```

For MongoDB Atlas (recommended for easy setup):
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create free cluster
2. Click Connect → copy connection string
3. Replace `MONGO_URI` with your Atlas URI

### 3. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

---

## Running the Project

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd agritrace/server
npm run dev
# Server starts on http://localhost:5000
# You should see:
# MongoDB Connected: localhost
# AgriTrace Server running on port 5000
# Socket.IO ready
```

**Terminal 2 — Frontend:**
```bash
cd agritrace/client
npm start
# React app opens at http://localhost:3000
```

---

## Seeding Test Data

Run once after starting the server (DB must be running):

```bash
cd agritrace/server
node seed.js
```

This creates:
- 5 users (one per role)
- 6 batches across all status stages
- Full processing logs for completed batches
- Inventory records
- 2 shipments (one delivered, one in transit)

---

## Testing the Workflow

Run the automated workflow test (no DB needed):

```bash
cd agritrace/server
node workflow_test.js
```

Expected output: **75 passed, 0 failed**

This tests every step: auth, batch creation, ID generation, QR URL, role guards, stage logging, inventory alerts, stock deduction, shipment gates, delivery clearing, and trace timeline building.

---

## QR Code Traceability

Every batch gets a QR code on creation pointing to:

```
http://localhost:3000/trace/<BATCH-ID>
```

This page is **public** — no login required. It shows:
- Batch origin (farmer, farm location, harvest date)
- Complete stage timeline with timestamps and locations
- Current warehouse stock
- Shipment destination and status

After seeding, test these URLs directly in your browser:
```
http://localhost:3000/trace/RICE-2026-001
http://localhost:3000/trace/WHEAT-2026-001
http://localhost:3000/trace/MAIZE-2026-001
```

---

## Login Credentials (After Seed)

| Email | Password | Role | Access |
|---|---|---|---|
| admin@agritrace.com | admin123 | admin | Everything |
| farmer@agritrace.com | farmer123 | farmer | Create batches |
| processor@agritrace.com | process123 | processor | Log stages |
| warehouse@agritrace.com | warehouse123 | warehouse | Manage inventory |
| dispatch@agritrace.com | dispatch123 | dispatcher | Create shipments |

---

## Health Check

```bash
curl http://localhost:5000/api/health
# {"status":"OK","message":"AgriTrace Server is running","timestamp":"..."}
```

---

## Deployment (Optional)

**Backend → Render.com (free)**
1. Push `server/` to GitHub
2. New Web Service on Render → connect repo
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add environment variables from `.env`

**Frontend → Vercel (free)**
1. Push `client/` to GitHub
2. New Project on Vercel → connect repo
3. Change `CLIENT_URL` in backend `.env` to your Vercel URL
4. Change `http://localhost:5000` in `client/src/context/SocketContext.jsx` to your Render URL

---

*AgriTrace v1.0 — Built with MERN Stack + Socket.IO*