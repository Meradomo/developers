# Remote Notes Client — Meradomo sample (Connect / OAuth)

A reference "Connect with Meradomo" client: runs the full OAuth 2.0 + PKCE flow, obtains an access
token, and fetches notes from a published Fridge Notes app. MIT-licensed.

## Prerequisites

- An OAuth client for your app (a `CLIENT_ID`, plus `CLIENT_SECRET` for confidential clients), with
  `http://localhost:9998/callback` registered as a redirect URI. Self-serve registration is coming to
  the developer portal; until then, request one.
- The [Fridge Notes](../fridge-notes) sample published (so there's something to fetch).

## Run

```sh
CLIENT_ID=<id> CLIENT_SECRET=<secret> node client.js
```

Open the printed authorization URL, sign in, and approve. The script exchanges the code for a token
and prints the notes it fetched.

## What it shows

- PKCE (S256) generation, the `/oauth/authorize` redirect, and a local callback listener.
- Token exchange at `POST /oauth/token`, then a Bearer-authenticated request to the live app.

No Meradomo SDK — just the documented endpoints. See
[developers.meradomo.com/guides/oauth](https://developers.meradomo.com/guides/oauth).

## Config (env)

| Var | Default | Meaning |
| --- | --- | --- |
| `CONTROL_PLANE` | `https://account.meradomo.com` | OAuth endpoints origin |
| `CLIENT_ID` | — (required) | Your OAuth client id |
| `CLIENT_SECRET` | — | Confidential clients only |
| `REDIRECT_PORT` | `9998` | Local callback listener port |
