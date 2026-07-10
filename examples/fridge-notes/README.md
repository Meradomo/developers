# Fridge Notes — Meradomo sample (Publish path)

A tiny shared-notes server that publishes itself through Meradomo and greets each visitor by their
verified email — with no sign-in code. MIT-licensed.

## Run

```sh
node server.js
```

Then approve **Fridge Notes** in the Meradomo menu-bar app and open the printed address
(`https://notes.<your-name>.meradomo.com`).

## What it shows

- **Self-publishing** via `POST 127.0.0.1:8765/publish` (the local management API).
- Reading the injected **`X-Meradomo-Email`** header as the sole identity.

No Meradomo SDK or internals — just the documented HTTP API. See
[developers.meradomo.com](https://developers.meradomo.com).

## Config (env)

| Var | Default | Meaning |
| --- | --- | --- |
| `MERADOMO_MGMT` | `http://127.0.0.1:8765` | Agent management API |
| `PORT` | `0` (OS-assigned) | Local listen port |
