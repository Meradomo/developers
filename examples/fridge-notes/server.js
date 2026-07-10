#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cerevox, Inc. (Meradomo). MIT-licensed sample — see ../../LICENSE.
//
// Fridge Notes — sample local app for Meradomo (Publish path)
//
// A tiny shared-notes server that demonstrates two Meradomo integrations:
//   1. Self-publishing via the local management API (POST /publish on the agent).
//   2. Reading visitor identity from the X-Meradomo-Email header the agent injects.
//
// Run:   node server.js
// Then:  approve in the menu-bar app and open the printed address.
//
// This file imports NO Meradomo internals. The only integration surface is the
// documented HTTP management API on 127.0.0.1:8765.

import http from 'node:http';

// ---------------------------------------------------------------------------
// Config — override via environment variables.
// ---------------------------------------------------------------------------
const MGMT_URL    = process.env.MERADOMO_MGMT || 'http://127.0.0.1:8765';
const LISTEN_PORT = Number(process.env.PORT   || 0);      // 0 = OS-assigned
const POLL_MS     = Number(process.env.POLL_MS || 3000);
const APP_NAME    = 'notes';
const APP_LABEL   = 'Fridge Notes';

// ---------------------------------------------------------------------------
// In-memory note store. Not a real database — this is a stand-in.
// ---------------------------------------------------------------------------
const notes = [
  { id: 1, text: 'Buy milk', createdBy: null },
  { id: 2, text: 'Pick up coffee beans', createdBy: null },
];
let nextId = 3;

function addNote(text, author) {
  const note = { id: nextId++, text: String(text).slice(0, 200), createdBy: author || null };
  notes.push(note);
  return note;
}

// ---------------------------------------------------------------------------
// HTML rendering.
// ---------------------------------------------------------------------------
function renderPage(email) {
  const greeting = email ? `Hello, ${escHtml(email)}` : 'Hello';
  const items = notes.map((n) =>
    `<li>${escHtml(n.text)}${n.createdBy ? ` <span class="by">— ${escHtml(n.createdBy)}</span>` : ''}</li>`
  ).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fridge Notes</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 540px; margin: 48px auto; padding: 0 16px; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    .greeting { color: #555; margin: 0 0 28px; font-size: 15px; }
    ul { padding: 0 0 0 20px; }
    li { margin: 8px 0; font-size: 16px; }
    .by { color: #888; font-size: 13px; }
    form { display: flex; gap: 8px; margin-top: 24px; }
    input[type=text] { flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 15px; }
    button { padding: 8px 18px; background: #2199b5; color: #fff; border: 0; border-radius: 8px; font-size: 15px; cursor: pointer; }
    button:hover { background: #2fa9c3; }
  </style>
</head>
<body>
  <h1>Fridge Notes</h1>
  <p class="greeting">${greeting}</p>
  <ul>
    ${items}
  </ul>
  <form method="POST" action="/add">
    <input type="text" name="text" placeholder="Add a note…" required>
    <button type="submit">Add</button>
  </form>
</body>
</html>`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Request router. The X-Meradomo-Email header is injected by the agent.
// ---------------------------------------------------------------------------
function router(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const email = req.headers['x-meradomo-email'] || null;

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(renderPage(email));
  }

  if (req.method === 'GET' && url.pathname === '/api/notes') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ notes }));
  }

  if (req.method === 'POST' && url.pathname === '/add') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const text = (params.get('text') || '').trim();
      if (text) addNote(text, email);
      res.writeHead(302, { location: '/' });
      res.end();
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/notes') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let parsed = {};
      try { parsed = JSON.parse(body || '{}'); } catch {}
      const text = (parsed.text || '').trim();
      if (!text) {
        res.writeHead(400, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: 'text required' }));
      }
      const note = addNote(text, email);
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify(note));
    });
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found');
}

// ---------------------------------------------------------------------------
// Self-publishing via the Meradomo local management API.
// ---------------------------------------------------------------------------
async function mgmtFetch(method, path, body) {
  const res = await fetch(`${MGMT_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function selfPublish(port) {
  console.log(`[fridge-notes] requesting publish as "${APP_NAME}" on port ${port} …`);
  const { status, data } = await mgmtFetch('POST', '/publish', {
    name: APP_NAME,
    label: APP_LABEL,
    localPort: port,
  });

  if (status === 200 && data.status === 'live') return data.url;
  if (status === 202 && data.status === 'pending') {
    console.log('[fridge-notes] waiting for approval in the menu-bar app…');
    return null;  // caller will poll
  }
  console.error('[fridge-notes] unexpected publish response:', data);
  return null;
}

async function pollUntilLive() {
  for (;;) {
    try {
      const { status, data } = await mgmtFetch('GET', `/publish/${APP_NAME}`);
      if (status === 200 && data.status === 'live') return data.url;
    } catch {
      // management API not reachable yet — keep trying
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

// ---------------------------------------------------------------------------
// Boot.
// ---------------------------------------------------------------------------
const server = http.createServer(router);

server.listen(LISTEN_PORT, '127.0.0.1', async () => {
  const { port } = server.address();
  console.log(`[fridge-notes] listening on 127.0.0.1:${port}`);

  try {
    let url = await selfPublish(port);
    if (!url) url = await pollUntilLive();
    console.log(`\n  Fridge Notes is live at: ${url}\n`);
    console.log('  Open that address in a browser (after signing in with Meradomo).');
  } catch (e) {
    console.error('[fridge-notes] publish error:', e.message);
    console.error('  Is the Meradomo agent running? Start it first, then retry.');
  }
});
