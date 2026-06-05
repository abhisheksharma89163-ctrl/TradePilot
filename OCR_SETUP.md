# Turn on photo reading (Gemini AI key) — beginner steps

The new **Documents** page lets you upload slip photos and have them filled in automatically. For the "reading" to work, the app needs a free **Google Gemini** key — this is the AI's "eyes." It takes about 5 minutes.

You'll add the key in **two places**: on Vercel (so the live site works) and, if you test on your computer, in `.env.local` too.

---

## Step 1 — Get your free Gemini key

1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account.
3. Click **Create API key** (choose "Create API key in new project" if it asks).
4. A long key appears (starts with `AIza…`). Click **Copy**. Keep it somewhere safe for a moment.

> This key is free to start and has a generous daily limit — plenty for reading slips.

---

## Step 2 — Add the key to your live site (Vercel)

1. Go to **https://vercel.com** → open your **bos** project.
2. Click **Settings** (top) → **Environment Variables** (left).
3. Add a new variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** paste your `AIza…` key
   - Make sure it's enabled for **Production** (and Preview/Development if shown).
   - Click **Save**.
4. Vercel needs to rebuild for the key to take effect. Go to the **Deployments** tab → open the latest deployment → click the **⋯** menu → **Redeploy** → confirm.
5. Wait ~1–2 minutes for it to finish (green check).

That's it — your live site can now read photos.

---

## Step 3 (optional) — Add the key for local testing

Only needed if you run the app on your own computer with `npm run dev`.

1. In VS Code, open the **`.env.local`** file.
2. Add this line (paste your real key):
   ```
   GEMINI_API_KEY="AIza...your-key..."
   ```
3. Save the file (**Ctrl+S**). If `npm run dev` is running, stop it (**Ctrl+C**) and start it again so it picks up the new key.

---

## How to use it

1. Open your app → click **Documents** in the left menu.
2. Tap the upload box and pick one or more slip photos (on a phone you can use the camera directly).
3. Click **Read with AI**. Each photo gets read in a few seconds.
4. A review card appears for each: the photo on top, the filled-in fields below.
   - Fields the AI is **unsure about are highlighted yellow** — glance and fix if needed.
   - If it guessed the wrong type, switch between **Weighment slip** / **Payment** with the buttons.
5. Click **Save**. The entry is stored, and a new party/truck/product is created automatically if it's the first time.

## Get your PDF report

1. Click **Reports** in the left menu.
2. Pick a **From** and **To** date → **Apply**.
3. Click **Download PDF** → your browser's print window opens → choose **"Save as PDF"** as the destination → Save.

You get a clean, date-wise, column-wise report of all slips and payments in that range.

---

## Troubleshooting

- **"AI is not configured yet"** → the `GEMINI_API_KEY` isn't set, or Vercel wasn't redeployed after adding it. Redo Step 2 (and remember the Redeploy).
- **"Your Gemini API key looks invalid"** → re-copy the key from the AI Studio page; make sure there are no spaces.
- **A number came out wrong** → that's expected sometimes on messy handwriting — just correct it in the yellow box before saving. The AI does the bulk; you verify.
- **Photo too large / upload failed** → use a normal phone photo (under ~10 MB). Avoid huge scans.
