#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cerevox, Inc. (Meradomo). MIT-licensed sample — see ../../LICENSE.
//
// Remote Notes Client — Meradomo OAuth 2.0 + PKCE reference client (Connect path)
//
// Demonstrates "Connect with Meradomo" from the remote-client side:
//   1. Generate a PKCE verifier / challenge.
//   2. Print the authorization URL for the user to open in a browser.
//   3. Receive the redirect callback on a local HTTP listener.
//   4. Exchange the code for an access token at POST /oauth/token.
//   5. Fetch https://notes.<host>/api/notes with the Bearer token.
//
// This file imports NO Meradomo internals. It drives the public OAuth endpoints
// documented at https://developers.meradomo.com/guides/oauth.
//
// Usage:
//   CLIENT_ID=<id> CLIENT_SECRET=<secret> node client.js

import http from 'node:http';
import crypto from 'node:crypto';
import { URL } from 'node:url';

// ---------------------------------------------------------------------------
// Config — all overridable via environment variables.
// ---------------------------------------------------------------------------
const CONTROL_PLANE = process.env.CONTROL_PLANE || 'https://account.meradomo.com';
const CLIENT_ID     = process.env.CLIENT_ID     || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const REDIRECT_PORT = Number(process.env.REDIRECT_PORT || 9998);
const REDIRECT_URI  = `http://localhost:${REDIRECT_PORT}/callback`;

if (!CLIENT_ID) {
  console.error('Error: CLIENT_ID environment variable is required.');
  console.error('  Request an OAuth client for your app, then run:');
  console.error('    CLIENT_ID=<id> CLIENT_SECRET=<secret> node client.js');
  console.error('  Register the redirect URI:', REDIRECT_URI);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// PKCE helpers (S256 — required by the server).
// ---------------------------------------------------------------------------
function generatePKCE() {
  const verifier  = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');
  return { verifier, challenge };
}

// ---------------------------------------------------------------------------
// Local redirect listener — resolves with the authorization code.
// ---------------------------------------------------------------------------
function waitForCallback(redirectPort) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname !== '/callback') {
        res.writeHead(404); res.end('Not found'); return;
      }

      const code  = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end('<p>Access was not granted. You may close this window.</p>');
        server.close(); reject(new Error(`access_denied: ${error}`)); return;
      }
      if (!code) {
        res.writeHead(400); res.end('Missing code');
        server.close(); reject(new Error('no code in callback')); return;
      }

      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<p>Connected. You may close this window and return to the terminal.</p>');
      server.close(); resolve(code);
    });

    server.listen(redirectPort, '127.0.0.1');
    server.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Token exchange.
// ---------------------------------------------------------------------------
async function exchangeCode(code, verifier) {
  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  REDIRECT_URI,
    client_id:     CLIENT_ID,
    code_verifier: verifier,
  });
  if (CLIENT_SECRET) params.set('client_secret', CLIENT_SECRET);

  const res = await fetch(`${CONTROL_PLANE}/oauth/token`, {
    method:  'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token exchange failed: ${JSON.stringify(body)}`);
  return body;
}

// ---------------------------------------------------------------------------
// Fetch notes from the live address using the Bearer token.
// ---------------------------------------------------------------------------
async function fetchNotes(token, host) {
  const url = `https://notes.${host}/api/notes`;   // the published fridge-notes app
  console.log(`\nFetching notes from ${url} …`);
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`notes fetch failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Main flow.
// ---------------------------------------------------------------------------
async function main() {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(8).toString('hex');

  const authorizeUrl =
    `${CONTROL_PLANE}/oauth/authorize` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(challenge)}` +
    `&code_challenge_method=S256` +
    `&scope=connect`;

  const codePromise = waitForCallback(REDIRECT_PORT);

  console.log('\nOpen this URL in a browser and sign in to approve the connection:\n');
  console.log(`  ${authorizeUrl}\n`);
  console.log(`Waiting for the callback on http://localhost:${REDIRECT_PORT}/callback …`);

  const code = await codePromise;
  console.log('Code received. Exchanging for a token…');

  const tokenData = await exchangeCode(code, verifier);
  console.log(`\nAccess token obtained (expires in ${tokenData.expires_in}s).`);
  console.log(`Your address: ${tokenData.address}`);
  console.log(`Root host:    ${tokenData.host}`);

  const { notes } = await fetchNotes(tokenData.access_token, tokenData.host);
  console.log(`\n--- Notes (${notes.length}) ---`);
  notes.forEach((n) => console.log(`  [${n.id}] ${n.text}`));
  console.log('---\n');
}

main().catch((e) => {
  console.error('\nError:', e.message);
  process.exit(1);
});
