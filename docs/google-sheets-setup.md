# Save every booking to Google Sheets (beginner guide)

Time needed: about 10 minutes. No Google Cloud account or API keys needed.

When this is set up, every booking from your website appears as a new row in a
Google Sheet, with the time, client name, email, phone, package, requested date
and their message.

---

## Step 1: Create the Google Sheet

1. Go to <https://sheets.google.com> (use your **meirwebdevelopment@gmail.com** account).
2. Click **Blank spreadsheet**.
3. Name it **Meir Bookings** (click "Untitled spreadsheet" at the top left).

You don't need to add any columns. The headers are created automatically on the first booking.

## Step 2: Add the script

1. In the sheet, click **Extensions → Apps Script**. A new tab opens.
2. Delete everything in the code box (`function myFunction() {...}`).
3. Open the file **`google-apps-script/Code.gs`** from this project, copy **all** of it, and paste it into the code box.
4. Click the **💾 Save** icon.

## Step 3: Set a secret password for the script

This stops strangers from writing to your sheet.

1. On the left side of Apps Script, click the **⚙️ Project Settings** gear.
2. Scroll down to **Script Properties** → **Add script property**.
3. Property: `SHARED_SECRET`
   Value: any long random text, e.g. `meir-7Hq2x9Lp4Vz8Kc3Wd`.
   **Copy this value**; you'll need it in Step 5.
4. Click **Save script properties**.

## Step 4: Publish the script as a web app

1. Click the blue **Deploy** button (top right) → **New deployment**.
2. Click the ⚙️ gear next to "Select type" → choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**.
5. Google asks for permission: click **Authorize access** → choose your account →
   **Advanced** → **Go to (project name) (unsafe)** → **Allow**.
   (It says "unsafe" only because it's your own unpublished script.)
6. Copy the **Web app URL** (it ends with `/exec`).

## Step 5: Connect your website (cPanel Terminal)

Open **cPanel → Terminal** and paste this. Replace the two values in quotes first:

```bash
cd ~/meir-services
cat >> .env <<'EOF'
APPS_SCRIPT_WEBHOOK_URL=PASTE_YOUR_WEB_APP_URL_HERE
APPS_SCRIPT_SECRET=PASTE_YOUR_SHARED_SECRET_HERE
EOF
touch tmp/restart.txt
```

## Step 6: Test it

```bash
source /home/meirmrqs/nodevenv/meir-services/20/bin/activate
npm run test:sheets
```

You should see **"Storage mode: apps-script"** and **"Row written successfully."**
Open your Google Sheet: a **Bookings** tab with a test row appears. You can delete that row.

From now on, every booking on your website is added to the sheet automatically.

---

### Tips

- Use the **Status** column to track each lead: change `New` to `Confirmed`, `Paid`, or `Done`.
- Click **Data → Create a filter** to sort by date or package.
- If you edit the script later, go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**, or your changes won't go live.

### Troubleshooting

| Problem | Fix |
|---|---|
| `Unauthorized` | The `SHARED_SECRET` in Apps Script and `APPS_SCRIPT_SECRET` in `.env` don't match exactly. |
| Storage mode still says `local` | The two lines weren't added to `.env`. Run `grep APPS .env` to check, then `touch tmp/restart.txt`. |
| Error mentioning HTML or "Sign in" | In Step 4, "Who has access" must be **Anyone**. Redeploy with a new version. |
