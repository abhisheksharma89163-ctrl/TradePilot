# BOS — Step-by-Step Live Deployment Guide (for absolute beginners)

This guide takes you from zero to a **live website** anyone can open.
Follow it **top to bottom**. Don't skip steps. Every command is copy-paste.

You will do this in **5 parts**:

1. Install the two tools you're missing (Node.js + Git)
2. Set up the database on Supabase
3. Run the app on your own computer first (to confirm it works)
4. Put the code on GitHub
5. Deploy it live on Vercel

Total time: about 45–60 minutes the first time.

> Throughout this guide, "**terminal**" means the command box inside VS Code.
> To open it: in VS Code, click the top menu **Terminal → New Terminal**.
> A panel opens at the bottom where you type commands and press **Enter**.

---

## PART 1 — Install the missing tools

You already have VS Code. You still need **Node.js** (runs the app) and **Git** (uploads code to GitHub).

### Step 1.1 — Install Node.js

1. Go to **https://nodejs.org**
2. Click the big green button that says **"LTS"** (the recommended version).
3. Open the downloaded file and click **Next → Next → Install** (accept all defaults).
4. When it finishes, click **Finish**.

### Step 1.2 — Install Git

1. Go to **https://git-scm.com/downloads**
2. Click **Windows** (or Mac if you use a Mac).
3. Open the downloaded file and keep clicking **Next** with all the default options, then **Install**.

### Step 1.3 — Restart VS Code

Close VS Code completely and open it again. (This makes it notice the new tools.)

### Step 1.4 — Check both installed correctly

Open the terminal (**Terminal → New Terminal**) and type these one at a time, pressing Enter after each:

```bash
node --version
```
```bash
git --version
```

✅ You should see version numbers like `v20.11.0` and `git version 2.43.0`.
❌ If you see "not recognized", restart your computer and try again.

---

## PART 2 — Open the project & install its parts

### Step 2.1 — Open the project folder in VS Code

1. In VS Code: **File → Open Folder**
2. Navigate to and select this folder:
   `Documents\Claude\Projects\BOS`
3. Click **Select Folder**.
4. If VS Code asks "Do you trust the authors?", click **Yes, I trust the authors**.

You should now see all the project files (app, components, lib, supabase…) in the left panel.

### Step 2.2 — Install the project's building blocks

Open the terminal and type:

```bash
npm install
```

Press Enter and **wait**. This downloads everything the app needs. It can take 2–5 minutes and will print lots of text. That's normal.

✅ It's done when you get your typing cursor back and see something like "added 400 packages".

---

## PART 3 — Set up the database (Supabase)

### Step 3.1 — Create a Supabase project

1. Go to **https://supabase.com** and sign in.
2. Click **New project**.
3. Fill in:
   - **Name:** `bos` (anything is fine)
   - **Database Password:** click **Generate a password**, then **copy it and save it somewhere safe** (Notepad is fine). You may need it later.
   - **Region:** pick the one closest to you (e.g. *Mumbai* / *South Asia* if in India).
4. Click **Create new project**.
5. Wait ~2 minutes while it says "Setting up project…". When the dashboard loads, you're ready.

### Step 3.2 — Create all the database tables

This is the most important step. We'll paste one big file that builds the entire database.

1. In your Supabase project, look at the left sidebar and click **SQL Editor** (icon looks like a database/terminal).
2. Click **+ New query** (top area).
3. Now open the file **`supabase/setup.sql`** from the project in VS Code:
   - In VS Code's left panel, click the `supabase` folder, then click `setup.sql`.
   - Select everything: click inside the file and press **Ctrl+A**, then copy with **Ctrl+C**.
4. Go back to the Supabase SQL Editor, click in the empty query box, and paste with **Ctrl+V**.
5. Click the **Run** button (bottom-right, or press **Ctrl+Enter**).
6. Wait a few seconds.

✅ Success looks like a green **"Success. No rows returned"** message at the bottom.
❌ If you see a red error, **don't panic** — copy the error text and paste it to me, and I'll fix it. (If you've run it once already, running it again is safe — it's designed to be re-runnable.)

### Step 3.3 — Turn OFF email confirmation (so you can log in instantly)

By default Supabase makes new users confirm their email before logging in. For now, let's switch that off so testing is simple.

1. In the Supabase left sidebar, click **Authentication**.
2. Click **Sign In / Providers** (or **Providers**).
3. Find **Email** and click it.
4. Find the toggle **"Confirm email"** and turn it **OFF**.
5. Click **Save**.

> You can turn this back on later when you go fully live.

### Step 3.4 — Copy your 3 secret keys

We need three values to connect the app to this database.

1. In the Supabase left sidebar, click **Project Settings** (the gear icon at the bottom).
2. Click **API**.
3. Keep this tab open — you'll copy from here in the next step. The three things you need are:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon public** key (a long string)
   - **service_role** key (another long string — keep this one secret!)

---

## PART 4 — Connect the app & test on your computer

### Step 4.1 — Create your secret settings file

1. In VS Code's left panel, find the file named **`.env.example`** and click it.
2. Press **Ctrl+A** then **Ctrl+C** to copy everything.
3. Right-click the empty space in the file panel → **New File**.
4. Name the new file exactly: **`.env.local`** (the dot at the start is important).
5. Click into the new empty file and paste with **Ctrl+V**.

### Step 4.2 — Fill in your keys

In `.env.local`, replace the placeholder text with your real values from Supabase (Step 3.4).
It should end up looking like this (with YOUR values):

```
NEXT_PUBLIC_SUPABASE_URL="https://abcdxyz.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi...your-anon-key..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi...your-service-role-key..."
GEMINI_API_KEY=""
OPENROUTER_API_KEY=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="BOS"
```

> Leave `GEMINI_API_KEY` empty for now — that's only for the OCR feature you'll add later.
> Keep the quotation marks. Save the file with **Ctrl+S**.

### Step 4.3 — Start the app

In the terminal, type:

```bash
npm run dev
```

Wait until you see **"Ready"** and a line like `Local: http://localhost:3000`.

### Step 4.4 — Open it in your browser

1. Open your web browser (Chrome, Edge…).
2. Go to **http://localhost:3000**
3. You'll see the BOS login screen. 🎉

### Step 4.5 — Create your account and company

1. Click **"Create one"** to register. Enter your name, email, and a password (6+ characters). Click **Create account**.
2. You'll be sent to the login page. Sign in with the same email and password.
3. It asks you to **create a company** — type your business name (e.g. "Sharma Trading Co.") and click **Create company**.
4. You're now in the dashboard! Click **Parties** and **Products** in the left menu and try adding a few — this confirms everything works end to end.

### Step 4.6 — Stop the app

When you're done testing, click in the terminal and press **Ctrl+C**. This stops the local app. (We only ran it locally to make sure it works before going live.)

---

## PART 5 — Put the code on GitHub

### Step 5.1 — Create an empty repository on GitHub

1. Go to **https://github.com** and sign in.
2. Click the **+** in the top-right → **New repository**.
3. **Repository name:** `bos`
4. Set it to **Private** (recommended — it contains your business app).
5. **Do NOT** check "Add a README" or any other box (leave them unchecked).
6. Click **Create repository**.
7. On the next page, **keep the browser tab open** — you'll copy one line from it shortly. The line you want is under "…or push an existing repository" and looks like:
   `git remote add origin https://github.com/YOURNAME/bos.git`

### Step 5.2 — Upload your code

Back in VS Code's terminal, type these commands **one at a time**, pressing Enter after each:

```bash
git init
```
```bash
git add .
```
```bash
git commit -m "Initial BOS deployment"
```

> If Git asks for your name/email the first time, run these two (use your real details), then re-run the commit:
> ```bash
> git config --global user.name "Your Name"
> git config --global user.email "you@example.com"
> ```

Now connect to GitHub. **Copy the `git remote add origin…` line from your GitHub tab** (Step 5.1) and paste it into the terminal, then Enter. It looks like:

```bash
git remote add origin https://github.com/YOURNAME/bos.git
```

Then push your code up:

```bash
git branch -M main
```
```bash
git push -u origin main
```

> A browser window may pop up asking you to **sign in to GitHub** — do it and click **Authorize**. This is normal and only happens once.

✅ Refresh your GitHub repository page in the browser — you should now see all your files there.

> **Good to know:** Your `.env.local` file is **not** uploaded (it's protected by the `.gitignore` file). Your secret keys stay private. We'll add them to Vercel separately in the next part.

---

## PART 6 — Deploy live on Vercel

### Step 6.1 — Import your project

1. Go to **https://vercel.com** and sign in (use **"Continue with GitHub"** if asked — it links the two).
2. Click **Add New… → Project**.
3. Find your **`bos`** repository in the list and click **Import**.
   - If you don't see it, click **Adjust GitHub App Permissions** and give Vercel access to the repo.

### Step 6.2 — Add your secret keys to Vercel

Before deploying, scroll down to the **Environment Variables** section. Add these **three** (this is the same info from Supabase Step 3.4):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service_role key |

For each one: type the **Name** on the left, paste the **Value** on the right, click **Add**. Repeat for all three.

> Tip: copy the values straight from your Supabase **Project Settings → API** page so there are no typos.

### Step 6.3 — Deploy

1. Click the big **Deploy** button.
2. Wait 1–3 minutes while Vercel builds your app. You'll see logs scrolling — that's normal.
3. When it's done you'll see **"Congratulations"** and a screenshot of your site with a link like `https://bos-xxxx.vercel.app`.

**Copy that web address** — that's your live site!

### Step 6.4 — Tell Supabase about your live address (important for login)

Login needs to know your real website address.

1. Go back to **Supabase → Authentication → URL Configuration**.
2. In **Site URL**, paste your Vercel address: `https://bos-xxxx.vercel.app`
3. Under **Redirect URLs**, click **Add URL** and add: `https://bos-xxxx.vercel.app/**`
4. Click **Save**.

### Step 6.5 — Open your live site 🎉

1. Open your Vercel web address in any browser (even on your phone).
2. Register, sign in, create your company, and start adding parties and products.

**You are now live.** Anyone with the link can use it.

---

## How to update your site later

Whenever you (or I) change the code, getting the update online is 3 commands in the VS Code terminal:

```bash
git add .
```
```bash
git commit -m "describe what changed"
```
```bash
git push
```

Vercel automatically notices the push and re-deploys within a minute or two. No other steps needed.

---

## Quick troubleshooting

- **"npm: command not found"** → Node.js isn't installed or VS Code wasn't restarted. Redo Part 1 and restart your computer.
- **Red error when running `setup.sql`** → copy the exact error text and send it to me. Re-running the file is safe.
- **Can't log in / "Invalid login credentials"** → make sure you turned OFF "Confirm email" (Step 3.3), and that you registered first before signing in.
- **Login works locally but not on the live site** → you missed Step 6.4 (Site URL / Redirect URLs in Supabase).
- **Vercel build failed** → open the build log, copy the red error lines, and send them to me.
- **Changes don't show online** → make sure you ran `git push`, then check the **Deployments** tab on Vercel to see if it's still building.

---

## What you have when you're done

- A live, password-protected business app on the internet.
- A secure cloud database (Supabase) with your data.
- Automatic re-deploys whenever the code changes.
- The **Parties** and **Products** modules fully working. The other modules (purchases, sales, payments, OCR, GST, reports) plug into the same database that's already set up.

When you're ready, tell me to build the **Purchases + Sales** modules next.
```
