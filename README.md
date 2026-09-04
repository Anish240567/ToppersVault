# Topper Vault — UPSC Topper Answer Copies

A free, static website (no server, no database) that indexes UPSC Mains topper
answer copies — built to run entirely on **GitHub Pages' free tier**.

## How it's structured

- `index.html` — the whole app (search, browse, PDF viewer, theming). This is
  a static single-page site; there is no backend.
- `data/copies.js` — the dataset. It just sets one JS variable:
  `window.REAL_TOPPERS_DATA = [ ...340 topper entries... ]`. `index.html`
  loads this file with a plain `<script src="data/copies.js">` tag *before*
  its own script runs, so the data is simply available when the app boots.
- `data/copies.json` — the same dataset as plain JSON, kept for reference /
  for anyone who wants to script against it (not loaded by the page itself).

Splitting the data out like this is what makes "add more content via GitHub"
possible: you edit `data/copies.js`, commit, push — GitHub Pages redeploys
automatically in under a minute. You never touch `index.html` to add data.

## 1. Put this on GitHub Pages (free)

1. Create a new **public** GitHub repository (e.g. `topper-vault`).
2. Upload these three items to the repo root, preserving the folder:
   - `index.html`
   - `data/` (containing `copies.js` and `copies.json`)
   - `.nojekyll` (an empty file — stops GitHub's Jekyll build step from
     choking on the large data file / files starting with `_`)

   Easiest way from a computer with git installed:
   ```bash
   cd topper-vault
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/topper-vault.git
   git push -u origin main
   ```
   Or just drag-and-drop the files into the repo via the GitHub web UI
   ("Add file → Upload files") — no command line needed.

3. In the repo: **Settings → Pages** → under "Build and deployment", set
   **Source: Deploy from a branch**, **Branch: main / (root)** → Save.
4. Wait ~1 minute. Your site will be live at:
   `https://<your-username>.github.io/topper-vault/`

   (Optional) To use a custom domain instead, add a `CNAME` file with your
   domain in it and point your DNS at GitHub Pages — see GitHub's docs on
   "Managing a custom domain for your GitHub Pages site".

That's it — 100% free, no server to maintain, no database, no build step.

## 2. Adding more toppers / copies later

Open `data/copies.js` in the GitHub web editor (press `.` on the repo page
to open the github.dev editor, or edit the file directly on github.com) and
add a new object to the `window.REAL_TOPPERS_DATA` array. Each entry looks
like this:

```json
{
  "name": "New Topper Name",
  "rank": 12,
  "year": 2025,
  "optional_subject": "Sociology",
  "language": "English",
  "medium": "English",
  "source": "https://example.com/where-you-found-it",
  "notes": "Optional free-text note",
  "copies": [
    {
      "paper": "GS4",
      "pdf_url": "https://drive.google.com/file/d/XXXXXXXXXXXXXXXX/view",
      "institute": "Vision",
      "questions": [
        { "q": "Full question text...", "page": 3 },
        { "q": "Next question text...", "page": 5 }
      ]
    }
  ]
}
```

Notes on the fields:
- `pdf_url` must be a **publicly accessible** link (Google Drive "Anyone with
  the link can view" works fine, direct PDF URLs work fine). It's what the
  in-browser PDF viewer embeds.
- `questions[].page` is the page number inside that PDF where the question
  starts — this is what lets the site jump straight to the right page.
- Only `pdf_url` is really required per copy; every other field falls back
  sensibly if omitted (this is documented again right above `RAW_IMPORTED_TOPPERS`
  inside `index.html`, section "2b. REAL-DATA WIRING", if you want the full
  authoritative version of this schema).

After editing, commit directly to `main` (or via a pull request if you want
review). GitHub Pages rebuilds automatically — no other step needed.

### Bulk-adding many toppers at once

If you have a JSON export of many toppers (e.g. from OCR-ing more copies),
you can paste a whole array of topper objects into `data/copies.js` instead
of adding one at a time — the array just needs one more `,`-separated
element per topper (or you can generate the whole file from a script and
overwrite it, using `data/copies.json`'s structure as the template, then
re-run the small conversion below to turn JSON back into the `.js` wrapper):

```bash
python3 -c "
import json
data = json.load(open('data/copies.json'))
with open('data/copies.js','w') as f:
    f.write('window.REAL_TOPPERS_DATA = ')
    json.dump(data, f, ensure_ascii=False)
    f.write(';')
"
```

## 3. Local preview before pushing

Just open `index.html` directly in a browser (double-click it) — because the
data loads via a `<script src="data/copies.js">` tag rather than `fetch()`,
it works straight from the filesystem with no local server required.

## Credits / data provenance

The question data was originally compiled from `toppercopies.upsckata.com`
and is presented here purely as an index pointing to PDFs hosted by the
coaching institutes that published them (ForumIAS, Vision IAS, etc.) —
this site does not host or re-upload any PDF itself.
