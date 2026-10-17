# Meir Web Development Services

[![CI](https://github.com/meirservice/meir-services/actions/workflows/ci.yml/badge.svg)](https://github.com/meirservice/meir-services/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D18.18-339933?logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)
![Market](https://img.shields.io/badge/market-Philippines-0038a8)

Agency website and consultation booking system for **Meir Web Development Services**, built for the **Philippine market**.

![Meir Web Development Services homepage](docs/screenshot.png)

## Features

- **Beginner-friendly design** in a soft, light-blue palette, written for non-technical small business owners
- **4 clear packages with starting prices:** Starter Website, Full Business Website, Online Store, Maintenance & Fixes, plus a "Which one do I need?" helper
- **Package details & customizer:** "View details & customize" opens a window with everything included, the timeline, what's needed from the client, and optional add-ons (with quantities) and a live estimated total. Choices carry over to the booking page, where they can still be changed. The server re-checks every add-on and calculates the estimate itself. **Edit all package details, add-ons and prices in `lib/services.js`**
- **How It Works** in 4 simple steps
- **Payment methods:** PayPal and Wise for international clients, plus GCash, RCBC, MariBank and BDO via QR code for clients in the Philippines. Payment details and deposit instructions are emailed **only after the client confirms they will proceed** (booking and consultation are free)
- **English site for local and international clients**, priced in **US dollars**. Booking times are converted from each visitor's time zone
- **New logo:** `public/logo.svg` (icon), `public/logo-full.svg` (icon + name), `public/logo-512.png` (for Facebook, Google, etc.)
- **Separate booking page** at `/book` (`public/book.html`). Package buttons open it with that package pre-selected
- **Booking form:** name, email, phone/Viber/Discord, package, preferred date & time (Mon–Sun, 8 AM–8 PM PHT), business description, and Data Privacy Act (RA 10173) consent
- **Instant emails:** confirmation with next steps to the client, and a new-booking alert to you
- **Automatic logging:** every booking saved to a Google Sheet ([beginner guide](docs/google-sheets-setup.md)) or to a file on the server
- **Hosting:** runs on cPanel "Setup Node.js App" (`start.js`), Render or Vercel

```
meir-services/
├── .github/workflows/ci.yml ← GitHub Actions: tests on every push
├── docs/
│   ├── google-sheets-setup.md ← beginner Google Sheets guide
│   └── screenshot.png
├── public/                 ← the website
│   ├── index.html          ← home page
│   ├── book.html           ← booking page (/book)
│   ├── packages.js         ← details window + add-on customizer
│   ├── logo.svg · logo-full.svg · logo-512.png
│   ├── styles.css
│   └── app.js
├── lib/
│   ├── services.js         ← PACKAGE CATALOG: details, add-ons, prices
│   ├── validate.js         ← server-side form validation
│   ├── schedule.js         ← consultation hours (PHT by default)
│   ├── storage.js          ← Google Sheets / Apps Script / local JSON
│   ├── mailer.js           ← client confirmation + owner alert emails
│   └── format.js
├── google-apps-script/
│   └── Code.gs             ← paste into Apps Script (storage Option B)
├── scripts/
│   ├── test-email.js       ← npm run test:email -- you@example.com
│   └── test-sheets.js      ← npm run test:sheets
├── tests/api.test.js       ← npm test
├── api/index.js            ← Vercel serverless entry
├── server.js               ← Express app (local + Render)
├── start.js                ← startup file for cPanel Node.js App
├── vercel.json · render.yaml
├── .env.example
└── LICENSE
```

---

## 1. Run it locally (5 minutes)

**Requirements:** [Node.js 18.18+](https://nodejs.org) (20 LTS recommended).

```bash
cd meir-services
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run dev
```

Open <http://localhost:3000> and submit the booking form.

With no keys configured, the app still works fully:
- bookings are saved to `data/bookings.json`
- emails are **printed to the terminal** instead of sent

Run the test suite any time with `npm test`.

Check what's active at any time: <http://localhost:3000/api/health>
→ `{"storage":"local","email":"console", ...}`

---

## 2. Connect Google Sheets

Pick **one** option. The app auto-detects which one you configured.

### Option A: Google Sheets API with a service account (recommended)

Fast, reliable, no extra service in the middle.

1. **Create the sheet.** Make a new Google Sheet. Rename the first tab to **`Bookings`**.
   Copy the sheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART_IS_THE_ID`**`/edit`
2. **Create a Google Cloud project.** Go to <https://console.cloud.google.com>, click the project picker → **New Project** (e.g. `meir-bookings`).
3. **Enable the API.** *APIs & Services → Library* → search **Google Sheets API** → **Enable**.
4. **Create a service account.** *APIs & Services → Credentials → Create credentials → Service account*. Give it a name, click **Done** (no roles needed).
5. **Download a key.** Open the service account → **Keys** tab → **Add key → Create new key → JSON**. A `.json` file downloads. Keep it private.
6. **Share the sheet with the service account.** In your Google Sheet click **Share**, paste the service account's email (looks like `name@project.iam.gserviceaccount.com`), give it **Editor**, untick "Notify".
7. **Fill in `.env`** from the JSON file:

   ```env
   GOOGLE_SHEET_ID=1AbC...xyz
   GOOGLE_SHEET_TAB=Bookings
   GOOGLE_SERVICE_ACCOUNT_EMAIL=meir-bookings@meir-bookings.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
   ```

   Copy `private_key` exactly as it appears in the JSON, **including the `\n` sequences**, wrapped in double quotes.
8. **Test:** `npm run test:sheets`. A header row and a test row appear in the sheet.

The header row is created automatically on the first booking. Columns:
`Booking ID · Submitted At (UTC) · Status · Client Name · Email · Phone / Discord · Service · Preferred Date & Time (Client) · Client Time Zone · Preferred Date & Time (Business TZ) · Preferred Date & Time (UTC ISO) · Project Brief · Privacy Consent (RA 10173) · Add-ons · Estimated Total (USD)`

> Tip: the **Status** column starts as `New`. Change it to `Confirmed`, `Done`, etc. as you work through leads. Add a filter view for a simple CRM.

### Option B: Google Apps Script web app (no Cloud project)

Good if you'd rather not touch Google Cloud.

1. Create a Google Sheet. Open **Extensions → Apps Script**.
2. Delete the sample code and paste in `google-apps-script/Code.gs`. Save.
3. **Project Settings** (gear icon) → **Script properties** → **Add script property**:
   `SHARED_SECRET` = a long random string (e.g. from <https://1password.com/password-generator>).
4. **Deploy → New deployment** → type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy**, authorize, and copy the **Web app URL** (ends in `/exec`).
5. Fill in `.env`:

   ```env
   APPS_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/AKfy.../exec
   APPS_SCRIPT_SECRET=the-same-long-random-string
   ```
6. **Test:** `npm run test:sheets`.

> If you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → New version**, or your changes won't go live.

> If both options are configured, Option A wins.

### Prefer a real database later?

All storage lives in `lib/storage.js`. To use **Supabase/PostgreSQL**, add a function that inserts the `booking` object (e.g. with `@supabase/supabase-js` or `pg`) and call it from `saveBooking()`. The rest of the app doesn't change.

---

## 3. Set up email

The app sends two emails per booking via SMTP. Choose a provider:

### Gmail / Google Workspace (easiest to start)

1. Turn on **2-Step Verification**: <https://myaccount.google.com/security>
2. Create an **App Password**: <https://myaccount.google.com/apppasswords> → name it "Meir website" → copy the 16-character password.
3. `.env`:

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=youraddress@gmail.com
   SMTP_PASS=abcdefghijklmnop
   MAIL_FROM="Meir Web Development Services <youraddress@gmail.com>"
   OWNER_EMAIL=youraddress@gmail.com
   ```

   With Gmail, `MAIL_FROM` must be your Gmail address (or a verified "Send mail as" alias). Free Gmail allows roughly 500 messages/day, plenty for a booking form.

### Resend (best deliverability with your own domain)

1. Sign up at <https://resend.com>, add and **verify your domain** (add the DNS records it shows).
2. Create an API key.
3. `.env`:

   ```env
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=resend
   SMTP_PASS=re_xxxxxxxxxxxx
   MAIL_FROM="Meir Web Development Services <hello@yourdomain.com>"
   OWNER_EMAIL=you@yourdomain.com
   ```

### SendGrid

Verify a sender or domain at <https://app.sendgrid.com>, create an API key with "Mail Send" permission, then:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxx
MAIL_FROM="Meir Web Development Services <hello@yourdomain.com>"
OWNER_EMAIL=you@yourdomain.com
```

**Test:** `npm run test:email -- your@email.com` (check spam the first time).

`OWNER_TIMEZONE` defaults to `Asia/Manila`, so alerts show each slot in Philippine time (PHT) as well as the client's own time zone.

---

## 4. Publish to GitHub

This folder is already a git repository with an initial commit on `main`.

1. **Create an empty repo** at <https://github.com/new>
   - Name: `meir-services`
   - Public or Private: your choice
   - **Do not** tick "Add a README", ".gitignore" or "license" (they already exist here)
2. **Push** from this folder:

   ```bash
   cd meir-services
   git remote add origin https://github.com/meirservice/meir-services.git
   git push -u origin main
   ```

   GitHub will ask you to sign in. If it asks for a password, use a **personal access token** (<https://github.com/settings/tokens>), or install the GitHub CLI and run `gh auth login`.

   Using the GitHub CLI instead? This creates the repo and pushes in one step:

   ```bash
   gh repo create meir-services --public --source=. --push
   ```
3. Open the **Actions** tab on GitHub. The CI workflow runs the tests automatically; a green check means everything passes.

**Never commit `.env`** (it's already in `.gitignore`). Put secrets in Render or Vercel's environment settings instead. If you ever commit a key by accident, revoke it right away (Google Cloud → Service account → Keys; Gmail → App passwords) and create a new one.

Day-to-day workflow after edits:

```bash
git add .
git commit -m "Update pricing"
git push
```

Render and Vercel redeploy automatically on every push to `main`.

## 5. Deploy

Push the project to GitHub first (step 4 above). Your `.env` is git-ignored, so secrets never leave your computer.

### Option 1: Render (simplest; always-on Node server)

1. <https://dashboard.render.com> → **New → Blueprint** → connect your repo. Render reads `render.yaml`.
   *(Or **New → Web Service**: Build `npm install`, Start `npm start`.)*
2. Under **Environment**, add every variable from your `.env` (SMTP, Google, `OWNER_EMAIL`, `MAIL_FROM`, `SITE_URL`).
   For `GOOGLE_PRIVATE_KEY`, paste the key with its `\n` sequences, same as `.env`.
3. Deploy, then open `https://<your-app>.onrender.com/api/health` and confirm `storage` and `email` show what you expect.

> Render's free tier sleeps after inactivity (first request takes ~30–60 s). Use a paid instance for a client-facing site, or point an uptime monitor at `/api/health`.
> Render's disk is wiped on redeploy, so **use Google Sheets in production**, not the local JSON fallback.

### Option 2: Vercel (static CDN + serverless API)

1. <https://vercel.com/new> → import your repo. Framework preset: **Other**. Leave build settings empty (`vercel.json` handles it: `public/` is served statically, `/api/*` runs `api/index.js`).
2. **Settings → Environment Variables:** add everything from `.env`.
3. Deploy, then visit `/api/health`.

> Serverless has no persistent disk: you **must** configure Google Sheets (Option A or B).

### Custom domain

Both Render and Vercel: **Settings → Domains → Add**, then create the DNS record they show at your registrar. HTTPS is automatic. Update `SITE_URL` afterwards.

> Want a Philippine domain? `.ph` and `.com.ph` domains are registered through dotPH (<https://www.dot.ph>) or its resellers. Point the DNS records at Render or Vercel the same way.

---

## Updating the live site on cPanel

After pushing changes from Codespaces, run this in **cPanel → Terminal**:

```bash
cd ~/meir-services && git fetch origin && git reset --hard origin/main && touch tmp/restart.txt
```

This makes the server match GitHub exactly. Your `.env` settings and saved bookings are not touched.

## 6. Customize

| What | Where |
|---|---|
| Copy, headings, pricing, contact email | `public/index.html` |
| Colors, fonts, spacing | Tokens at the top of `public/styles.css` |
| Services in the form | `lib/services.js` **and** the `<select id="serviceId">` options in `index.html` (values must match) |
| Email wording / design | `lib/mailer.js` |
| Spreadsheet columns | `HEADERS` and `toRow()` in `lib/storage.js` |
| Consultation days/hours | `BUSINESS_DAYS`, `BUSINESS_HOURS`, `MEETING_MINUTES` env vars (in `OWNER_TIMEZONE`) |
| Footer email & Facebook link, structured data | Marked `TODO` / in the `<head>` JSON-LD of `index.html` |
| Rate limit | `BOOKING_RATE_LIMIT` env var (per IP per 15 min) |

### Pre-launch checklist

- [ ] Set your real prices. The US$150 / US$350 / US$800 / US$30 starting prices are **placeholders**; change them in `public/index.html` (cards), `public/book.html` (dropdown) and `lib/services.js` (emails)
- [ ] Replace `hello@meirwebdev.com`, the Facebook link and `https://meirwebdev.com` (footer, JSON-LD in `<head>`, `.env`)
- [ ] Confirm the payment methods listed in the Payment Methods section (PayPal, Wise, GCash, RCBC, MariBank, BDO) match the accounts you actually use
- [ ] Block out holidays: the form accepts any Monday–Saturday, so reschedule by email on Philippine public holidays, or adjust the hours env vars
- [ ] Add a privacy notice page if you collect more data later; the form already captures RA 10173 consent

---

## 7. API reference

`POST /api/bookings` (JSON)

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "contact": "0917 123 4567",
  "serviceId": "full-stack",
  "preferredDateTime": "2026-10-22T06:30:00.000Z",
  "timezone": "Asia/Manila",
  "brief": "We need a client portal with logins and invoices.",
  "consent": true
}
```

| Status | Meaning |
|---|---|
| `201` | `{ ok: true, id: "MWD-261022-A1B2C3", confirmationEmailSent: true }` |
| `422` | Validation failed (including slots outside Mon–Sun 8 AM–8 PM PHT, or missing consent). `errors` maps field → message (shown under each field) |
| `429` | Rate limited |
| `500` | Storage failed. Nothing was saved and no emails were sent |

The booking is **saved first**; emails are sent after. If email fails, the booking is still recorded and the error is logged.

Quick test from a terminal:

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Client","email":"test@example.com","serviceId":"web-design","preferredDateTime":"2027-01-12T02:00:00Z","timezone":"Asia/Manila","brief":"Testing the booking endpoint end to end.","consent":true}'
```

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `/api/health` shows `storage: local` in production | Google env vars missing or misspelled on the host. Redeploy after adding them |
| `error:1E08010C:DECODER routines::unsupported` | `GOOGLE_PRIVATE_KEY` is mangled. Paste it again with `\n` sequences, wrapped in quotes |
| `The caller does not have permission` | Share the sheet with the service account email as **Editor** |
| `Unable to parse range: 'Bookings'!A1:M1` | Rename the tab to `Bookings` or set `GOOGLE_SHEET_TAB` |
| Apps Script returns `Unauthorized` | `SHARED_SECRET` script property ≠ `APPS_SCRIPT_SECRET` |
| Gmail `Invalid login: 535` | Use an **App Password**, not your normal password; 2-Step Verification must be on |
| Emails land in spam | Use your own domain with Resend/SendGrid and add the SPF/DKIM records they provide |
| "Please pick a time within our consultation hours" | Slots must be Mon–Sun, 8 AM–8 PM PHT by default. Change `BUSINESS_DAYS` / `BUSINESS_HOURS` if your hours differ |
| Form says "couldn't reach the server" | You opened `index.html` directly. Run `npm run dev` and use `http://localhost:3000` |
