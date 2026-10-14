# Balaji CRM — AI-Powered Lead Automation & Management Platform

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

**Balaji CRM** is a modern, high-performance Customer Relationship Management platform engineered for automated B2B lead ingestion, intelligent parsing, and real-time lead tracking. It features an automated email fetcher that monitors incoming IndiaMART buyer inquiries, parses buyer details and product requirements, synchronizes leads with a real-time reactive dashboard, and sends automated replies.

---

## Key Features

- **Automated IndiaMART Lead Ingestion**:
  - Background IMAP worker (`emailFetcher.js`) that continuously listens for incoming emails from IndiaMART and authorized senders.
  - Robust heuristic email parser (`indiamartParser.js`) extracting buyer names, phone numbers, quantities, product specifications, and delivery locations.

- **Instant Automated Replies**:
  - Built-in SMTP / Nodemailer engine to immediately dispatch automated acknowledgments and product brochures to potential buyers.
  - Optional Google Apps Script webhook integration for Google Sheets sync and external workflow triggers.

- **Reactive Modern Dashboard**:
  - Ultra-fast UI built with **React** and **Vite**.
  - Interactive lead management with status workflows (New, In Discussion, Quotation Sent, Won, Lost).
  - Integrated Search, Filtering, and Detailed Lead Modal views.
  - Dark Mode and Light Mode support with smooth particle visual effects.

- **Dual-Layer Persistence & Synchronization**:
  - Local JSON caching layer for zero-latency, high-availability caching.
  - Firebase / Cloud Firestore integration for cross-device authentication and cloud synchronization.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Lucide React, Modern CSS3 |
| **Backend & Ingestion** | Node.js, `imap-simple`, `mailparser`, `nodemailer`, `dotenv` |
| **Database & Cloud** | Firebase Authentication, Cloud Firestore |
| **Tooling** | Concurrently, Git |

---

## Project Structure

```text
CRM Platform/
├── emailFetcher.js              # Background IMAP email polling & auto-reply service
├── firestore.rules              # Firebase Firestore security rules
├── index.html                   # Application entry point
├── package.json                 # Project dependencies and script runner
├── vite.config.js               # Vite build configuration
├── src/
│   ├── App.jsx                  # Main application container
│   ├── main.jsx                 # React root renderer
│   ├── index.css                # Custom modern styling & dark/light theme tokens
│   ├── firebaseConfig.js        # Firebase SDK initialization & auth helpers
│   ├── components/
│   │   ├── BrandHeader.jsx      # Top navigation and theme toggle
│   │   ├── CrmDashboard.jsx     # Core CRM lead table, cards, and analytics
│   │   ├── LoginForm.jsx        # User authentication form
│   │   ├── ApiSettingsModal.jsx # API & webhook configuration modal
│   │   ├── FirebaseSettingsModal.jsx # Dynamic Firebase configuration
│   │   └── ParticleBackground.jsx # Visual background animation
│   └── utils/
│       └── indiamartParser.js   # IndiaMART email text & HTML parsing utility
├── LICENSE                      # Proprietary software license
└── SECURITY.md                  # Vulnerability disclosure & security policy
```

---

## Getting Started

### 1. Prerequisites

- **Node.js** 18.x or later installed
- **npm** (comes with Node.js)
- A Gmail or IMAP-enabled email account with an **App Password** configured

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/RaghavW22/balaji-crm.git
cd balaji-crm
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory and configure your credentials:

```env
# Email Ingestion & IMAP Settings
SELLER_EMAIL=your-email@gmail.com
SELLER_APP_PASSWORD=your-16-char-google-app-password
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
POLL_INTERVAL_SECONDS=15

# Allowed sender emails (comma-separated)
TARGET_SENDER_EMAIL=buyershelpdesk@indiamart.com

# Auto-Reply SMTP Settings
AUTO_REPLY_EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_FROM_NAME="Balaji Enterprises"

# Optional Google Apps Script Webhook
GOOGLE_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/.../exec

# Firebase Web App Config (Optional / configurable via UI)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Running the Application

You can run both the frontend dashboard and backend email fetcher concurrently:

```bash
npm run dev:all
```

Alternatively, run each service independently in separate terminals:

```bash
# Terminal 1: Start React Frontend
npm run dev

# Terminal 2: Start Backend Email Poller
npm run server
```

The frontend dashboard will be available at `http://localhost:5173`.

---

## Security

Please review [SECURITY.md](SECURITY.md) for details on our vulnerability disclosure policy and security reporting procedures.

---

## License

This software is strictly **Proprietary and Confidential**. All rights reserved by the author. Unauthorized copying, modification, or distribution is prohibited. See the [LICENSE](LICENSE) file for complete terms and restrictions.
