# SpendWise 2.0

A privacy-focused personal expense tracking Progressive Web App (PWA). All data stays on your device.

## Features

- Transaction tracking (income & expense) with categories, payment methods, and tags
- Financial health score (0-100) with actionable insights
- Budget management with over-budget alerts
- Recurring expense tracking with auto-processing
- Savings goals with progress tracking
- Weekly, monthly, and yearly reports with charts
- Quick-add floating action button (FAB)
- CSV and JSON import/export (including bank statement auto-detection)
- AES-256-GCM encrypted backup export/import
- PIN lock screen with auto-lock and brute-force protection
- Dark/light theme
- Full offline support via Service Worker
- PWA with installability

## Tech Stack

- Vanilla JavaScript (ES Modules, zero dependencies)
- Custom centralized state management with pub/sub
- Custom client-side SPA router
- Web Crypto API for encryption
- HTML5 Canvas for charts
- Service Worker for offline support

## Getting Started

```bash
# Install (optional, zero dependencies)
npm install

# Development
npm run dev

# Production
npm start
```

Then open `http://localhost:3000` (dev) or `http://localhost:8000` (prod).

## Project Structure

```
├── index.html          # App shell + modal templates
├── expense-tracker.css # Complete stylesheet
├── server.js           # Static file server with security headers
├── sw.js               # Service Worker
├── manifest.json       # PWA manifest
├── js/
│   ├── app.js          # Entry point
│   ├── store.js        # State management
│   ├── router.js       # SPA router
│   ├── utils.js        # Helpers, validators, CSV utilities
│   ├── sanitize.js     # HTML sanitizer
│   ├── charts.js       # Canvas chart drawing
│   ├── toast.js        # Toast notifications
│   ├── modals.js       # Modal management
│   ├── security.js     # Crypto, PIN hashing
│   ├── lockscreen.js   # Lock screen UI
│   └── pages/          # Page modules
```

## Security

- PIN hashing with SHA-256 + random salt
- Brute-force protection (5 attempts, 30s lockout)
- AES-256-GCM encrypted backups via Web Crypto API
- CSP headers, no external data transmission
- All data stored in localStorage (never leaves your device)

## License

Private — All rights reserved.
