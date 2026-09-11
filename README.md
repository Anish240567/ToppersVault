# Topper Vault — deploy guide (GitHub Pages + Vercel)

This package has everything you need to put your Topper Vault site
online, with a real backend behind the "Import Dataset" / "Add PDF"
features that were already built into the page, plus an admin page
to swap the live HTML file without touching git.

## How it fits together

- **GitHub Pages** serves the static frontend: `index.html`,
  `admin.html`, `config.js`.
- **Vercel** hosts two small serverless functions:
  - `/api/storage` — a tiny key/value API that stands in for the
    `window.storage` object this app was originally built to use
    (that object only exists inside Claude.ai). Every visitor writes
    to the **same** store — there's no login in this app, so this
    makes it a shared, public library: anyone's "Import Dataset" or
    "Add PDF" becomes visible to everyone else, and it survives
    refreshes/new devices.
  - `/api/admin/replace-html` — lets `admin.html` push a brand new
    `index.html` straight into your GitHub repo (a real git commit),
    so GitHub Pages redeploys automatically.
- A **Vercel KV** database (a few clicks, free tier) is what
  `/api/storage` actually reads/writes.

Nothing else in the original file was changed — the "Import Dataset"
and "Add PDF" pages you already built work exactly as before; they
just now have somewhere real to save to.

---

## 1. Push this to GitHub

1. Create a new GitHub repository (public or private both work for
   Pages, but private repos need GitHub Pro/Team for Pages).
2. Push **everything in this zip** to the repo root, so you end up
   with:
   ```
   your-repo/
     index.html
     admin.html
     config.js
     .nojekyll
     backend/
       api/storage.js
       api/admin/replace-html.js
       package.json
       vercel.json
       .env.example
     README.md
   ```
3. In the repo: **Settings -> Pages** -> Source: "Deploy from a
   branch" -> Branch: `main` / `(root)` -> Save.
4. Wait a minute, then your site is live at
   `https://your-username.github.io/your-repo-name/`.

At this point the site works, but Import Dataset / Add PDF / saved
items only persist in your own browser (no backend yet).

---

## 2. Deploy the backend to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the
   **same GitHub repo**.
2. When configuring the project, set **Root Directory** to
   `backend`. (This tells Vercel to treat `backend/` as the project,
   so it only deploys the API, not your whole static site.)
3. Deploy. Vercel will give you a URL like
   `https://your-project-name.vercel.app`.

### Attach a KV database (for `/api/storage`)

1. In the Vercel project: **Storage** tab -> **Create Database** ->
   **KV** (this is Upstash Redis under the hood; the free tier is
   plenty for this).
2. **Connect** it to this project — Vercel automatically adds the
   `KV_REST_API_URL` / `KV_REST_API_TOKEN` env vars for you.
3. Redeploy the project (Vercel usually prompts you to).

### Set the remaining env vars

In **Project -> Settings -> Environment Variables**, add:

| Name | Value |
|---|---|
| `GITHUB_TOKEN` | A GitHub [Personal Access Token](https://github.com/settings/tokens) with `repo` (or fine-grained "Contents: Read & write") scope, limited to your repo |
| `GITHUB_REPO` | `your-username/your-repo-name` |
| `GITHUB_BRANCH` | `main` (optional, this is the default) |
| `GITHUB_FILE_PATH` | `index.html` (optional, this is the default) |
| `ADMIN_TOKEN` | Any long random string — this is the password `admin.html` will ask for |

Redeploy after adding these.

---

## 3. Point the frontend at your backend

Edit `config.js` in your GitHub repo (directly on GitHub, or locally
+ push):

```js
window.KOSHA_API_BASE = "https://your-project-name.vercel.app";
```

No trailing slash. Commit it — GitHub Pages redeploys automatically.

That's it. Reload your GitHub Pages URL — Import Dataset / Add PDF /
saved items now sync through your Vercel backend for every visitor.

---

## 4. Using the admin page

Open `https://your-username.github.io/your-repo-name/admin.html`.

- **Backend URL** is pre-filled from `config.js`.
- **Admin token** — the `ADMIN_TOKEN` you set in Vercel.
- Choose a new `.html` file and click **Publish to GitHub** — this
  commits it as `index.html` in your repo, and GitHub Pages
  redeploys with the new file automatically (usually under a
  minute).

**Size limit to know about:** Vercel serverless functions cap
request bodies at roughly 4.5 MB. Your current `index.html` (once
real topper data is imported) is well over 10 MB, so the very first
version of the file — and any similarly large full replacement —
needs to go up via a normal `git push`, not through this admin page:

```bash
git add index.html
git commit -m "update vault data"
git push
```

The admin page is best for smaller edits/patches to the file. If you
want to routinely replace multi-MB files through the browser, you'd
need to extend `replace-html.js` to accept a direct client upload to
Vercel Blob first (not included here) instead of sending the whole
file through the function.

---

## Notes & limitations

- **No auth on the storage API.** `/api/storage` is open to anyone
  who knows your Vercel URL — by design, since the app has no login
  and you wanted shared, world-writable data. If you'd rather gate
  writes, add a simple shared secret check in `storage.js` (same
  pattern as `ADMIN_TOKEN` in `replace-html.js`) and have the
  frontend send it — ask if you want this added.
- **PDF embeds.** The app can embed a PDF's bytes as base64 into
  `window.storage` (capped at ~3.5MB per file in the original code).
  Those also flow through `/api/storage`, so very large embedded
  PDFs can hit the same ~4.5MB Vercel body-size ceiling described
  above.
- **CORS** is wide open (`Access-Control-Allow-Origin: *`) on both
  functions so GitHub Pages (a different origin) can call them.
