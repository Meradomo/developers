# Meradomo Developer Docs

The public developer documentation for **Meradomo** — served at
[developers.meradomo.com](https://developers.meradomo.com), built with
[Mintlify](https://mintlify.com).

**License:** MIT (see `LICENSE`). This repo contains **only** the public docs, the OpenAPI
description of the public HTTP API, and runnable sample apps. Meradomo's server and desktop-app
source are closed and are **not** required to integrate — the two samples here import zero internals.

## What's here

```
introduction.mdx          The two integration paths + the addressing model
quickstart.mdx            Your first app, live in ~10 minutes
guides/agent-api.mdx      Local management API (publish lifecycle + identity headers)
guides/oauth.mdx          "Connect with Meradomo" (OAuth 2.0 + PKCE)
guides/security-model.mdx What your app can trust
api-reference/            OpenAPI description of the public HTTP API
examples/fridge-notes/    Sample app that publishes itself (Publish path)
examples/remote-notes-client/  Sample OAuth client (Connect path)
```

## Develop locally

```sh
npm i -g mint       # Mintlify CLI
mint dev            # preview at http://localhost:3000
```

## Source of truth

This repo is **canonical** for the public developer docs. The closed `meradomo` repo keeps a
pointer (`docs/README.md`) here to avoid drift; changes to the developer-facing docs land here.
