# 🌾 KisanSetu Q-Ease
### *Digital Procurement-Slot & Mandi Queue Management Platform*
**Developed by Team Brainstormers for Smart India Hackathon (Problem Statement: SIH26032)**

---

## 🎯 Project Overview
**KisanSetu Q-Ease** is a comprehensive digital solution designed to streamline the chaotic agricultural procurement process at local Mandis. By introducing a structured slot-booking and live queue management workflow, the platform minimizes long waiting times for farmers, optimizes daily crop intake for Mandi staff, and provides top-tier analytical oversight for administrators.

---

## 🚀 Key Features

### 👨‍🌾 For Farmers
- **Secure Authentication:** Easy farmer registration and secure login via Firebase Authentication.
- **Centre Discovery:** Interactive procurement centre discovery and geographical search.
- **Smart Slot Booking:** Seamless booking workflows specifying crop type, quantity, vehicle type, date, and preferred time slot.
- **Anti-Exploit System:** Smart logic built in for duplicate booking prevention.
- **Real-Time Token Generation:** Instant booking token generation with status tracking (queue position, estimated time).
- **Payment Tracking:** Full visibility into payment milestones and processing status.

### 🏢 For Mandi Staff
- **Live Queue Console:** A dynamic dashboard featuring an efficient "Call-Next" workflow.
- **Lifecycle Tracking:** Step-by-step updates for procurement stages (Verification -> Weighing -> Quality Check -> Storage).
- **Payment Ledger Logging:** Fast updates to record and update financial settlement progress.

### 👑 For Administrators
- **Centralized Dashboard:** High-level monitoring tools to manage multiple procurement hubs.
- **Data Export:** Instant CSV report generation for auditing, inventory logging, and performance analysis.

### 🛠️ Hackathon-Ready Optimization
- **Real-Time Sync:** Powered by Cloud Firestore for instant live dashboard refreshes.
- **Demo Mode:** Local fallback data structures built-in to guarantee seamless prototype demonstrations even under poor network conditions.
- **Responsive UI:** Fully optimized for mobile screens (for farmers in the field) and desktop layouts (for Mandi back-offices).

---

## 💻 Tech Stack

- **Frontend Core:** React 19, Vite (For ultra-fast compilation and hot reloading)
- **Routing:** React Router
- **Backend-as-a-Service:** Firebase Authentication, Cloud Firestore (NoSQL Real-time Database)
- **Mapping & Location:** React Leaflet (Open-source interactive map layers)
- **Linting & Code Quality:** Oxlint (Speed-optimized code analysis)

---

## 🛠️ Local Setup & Installation

Get a local instance up and running by executing these quick steps:

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd FarmerSIH
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env` file in the root directory and insert your Firebase configuration settings:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Launch the Development Server
```bash
npm run dev
```

---

## 👥 Developed By
**Team Brainstormers** 🧠💡
*Submitted as a functional prototype for the Smart India Hackathon.*
