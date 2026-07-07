# Reclaim Desk — Community Lost & Found

A web app where people report lost or found items as "claim tickets", search and
filter the board, and reclaim items through a verified, paid handover.

Built with React, Vite and Tailwind CSS. Icons by lucide-react.

## Features

- **Board of tickets** — every item is a claim ticket with a photo, reference
  code and status stamp (Lost / Found / Returned).
- **Search & filters** — free-text search plus filters for status, category,
  location (with suggestions) and time window (presets or a custom date range),
  and sorting (newest / oldest / A–Z).
- **Report an item** — a guided form for lost or found items, with an optional
  photo upload and required security, legal and service-charge conditions.
- **Accounts** — users must sign up / log in before posting or claiming.
- **Verified claims with a paywall** — claiming an item runs through ownership
  verification, then a one-time ₦1,000 finder access fee, after which the
  finder's contact is revealed.
- **Conditions** — a clear page covering the security protocol, legal compliance
  and the service-charge schedule.

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

### Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

## Project structure

```
reclaim-desk/
├── index.html            # HTML entry
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx          # React entry — mounts <App />
    ├── index.css         # Tailwind directives
    └── App.jsx           # The entire application
```

## Prototype notes / next steps

This is a functional front-end prototype. The following are **simulated** and
would be wired to real services for production:

- **Authentication** — any email/password is accepted; no real accounts.
- **Payments** — the ₦1,000 access fee is a demo checkout (no real charge).
  In Nigeria this would typically integrate Paystack or Flutterwave.
- **Storage** — accounts, listings and uploaded photos live in memory for the
  session and reset on reload. A production build would persist these (e.g. a
  database + object storage for images) and expose them via an API.

Sample items use category placeholder thumbnails; items you post with a photo
show the uploaded image.
