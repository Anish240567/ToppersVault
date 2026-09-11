// /api/admin/replace-html — lets the admin.html page "replace the
// deployed site" by committing a new file straight to your GitHub
// repo via the GitHub Contents API. GitHub Pages picks up the new
// commit and redeploys automatically — no manual git push needed
// for day-to-day edits.
//
// Required env vars (set in Vercel -> Project -> Settings -> Environment Variables):
//   GITHUB_TOKEN      - a GitHub Personal Access Token with "repo" (contents) scope
//   GITHUB_REPO       - "your-username/your-repo-name"
//   ADMIN_TOKEN       - a long random secret; the admin page must send this
// Optional:
//   GITHUB_BRANCH     - defaults to "main"
//   GITHUB_FILE_PATH  - defaults to "index.html"
//
// NOTE: Vercel serverless functions cap request bodies at ~4.5MB.
// This works great for reasonably-sized HTML edits; for very large
// files, push via git directly instead (see README.md).

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'POST only' });
  }

  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return res.status(500).json({ error: 'Server missing ADMIN_TOKEN env var' });
  }
  const authHeader = req.headers['authorization'] || '';
  const provided = authHeader.replace(/^Bearer\s+/i, '');
  if (provided !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized — bad or missing admin token' });
  }

  const body = req.body || {};
  const content = body.content;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content (string, full file text) required in body' });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // "owner/repo"
  const branch = process.env.GITHUB_BRANCH || 'main';
  const filePath = body.path || process.env.GITHUB_FILE_PATH || 'index.html';

  if (!ghToken || !repo) {
    return res.status(500).json({ error: 'Server missing GITHUB_TOKEN or GITHUB_REPO env vars' });
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(filePath)}`;
  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    'User-Agent': 'topper-vault-admin',
    Accept: 'application/vnd.github+json'
  };

  try {
    // 1. Look up the current file's sha (required by GitHub to update an existing file)
    let sha;
    const getResp = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers: ghHeaders });
    if (getResp.ok) {
      const j = await getResp.json();
      sha = j.sha;
    } else if (getResp.status !== 404) {
      const detail = await getResp.text();
      return res.status(502).json({ error: 'GitHub lookup failed', detail });
    }

    // 2. Create or update the file
    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Replace ${filePath} via admin panel — ${new Date().toISOString()}`,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        branch,
        ...(sha ? { sha } : {})
      })
    });

    if (!putResp.ok) {
      const detail = await putResp.text();
      return res.status(502).json({ error: 'GitHub commit failed', detail });
    }

    const result = await putResp.json();
    return res.status(200).json({
      ok: true,
      commit: result.commit && result.commit.sha,
      htmlUrl: result.content && result.content.html_url
    });
  } catch (err) {
    console.error('replace-html error', err);
    return res.status(500).json({ error: 'Server error', detail: String((err && err.message) || err) });
  }
}
