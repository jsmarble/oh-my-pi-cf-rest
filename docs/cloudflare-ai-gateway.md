# Cloudflare AI Gateway — REST API Integration

## Overview

The `cloudflare-ai-gateway` provider uses Cloudflare's **REST API** (`api.cloudflare.com`), not the legacy provider-native endpoints (`gateway.ai.cloudflare.com`).

Cloudflare recommends the REST API for all new integrations:
- https://developers.cloudflare.com/ai-gateway/usage/rest-api/

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `CLOUDFLARE_AI_GATEWAY_API_KEY` | API token with AI Gateway permissions | Yes (or `CLOUDFLARE_API_TOKEN`) |
| `CLOUDFLARE_API_TOKEN` | Fallback for auth token | No |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Recommended |
| `CLOUDFLARE_AI_GATEWAY_ID` | Gateway name | No (defaults to `default`) |

## Base URL

Constructed from `CLOUDFLARE_ACCOUNT_ID`:

```
https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/ai/v1
```

If `CLOUDFLARE_ACCOUNT_ID` is not set, falls back to a placeholder URL that must be overridden via `models.yml`.

## Endpoint Mapping

| API family | REST endpoint | When used |
|------------|---------------|-----------|
| `anthropic-messages` | `/ai/v1/messages` | Models with `anthropic/` prefix or `claude-*` IDs |
| `openai-completions` | `/ai/v1/chat/completions` | Everything else (OpenAI, Workers AI, Google, xAI, etc.) |

## Authentication

Standard `Authorization: Bearer` header — same as OpenAI or Anthropic native. No special `cf-aig-authorization` header needed.

## Gateway Selection

Sent on every REST request via the `cf-aig-gateway-id` header. Resolution precedence (highest to lowest):

1. Per-model `headers.cf-aig-gateway-id` in `models.yml` — overrides everything for that model.
2. `CLOUDFLARE_AI_GATEWAY_ID` env var.
3. `CLOUDFLARE_AI_GATEWAY_GATEWAY_ID` env var (legacy alias).
4. Hardcoded default `"default"`.

Per-model override example:

```yaml
providers:
  cloudflare-ai-gateway:
    models:
      anthropic/claude-opus-4-8:
        headers:
          cf-aig-gateway-id: my-routing-gateway
```

The legacy `gateway.ai.cloudflare.com` endpoint takes the gateway id from the URL path instead, so no `cf-aig-gateway-id` header is sent in that mode.


## Model Naming

Cloudflare REST uses the same model IDs as the upstream providers:

- Third-party: `anthropic/claude-sonnet-4-6`, `openai/gpt-5.4`, `google/gemini-3-flash`
- Workers AI: `@cf/moonshotai/kimi-k2.6`

The catalog internally stores Workers AI models as `workers-ai/@cf/...` for local selection, but the outbound `requestModelId` is stripped to `@cf/...` for the wire.

## Quick Start

```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_AI_GATEWAY_API_KEY="your-api-token"
export CLOUDFLARE_AI_GATEWAY_ID="default"  # optional
```

Then use any Cloudflare-supported model:
```bash
omp models cloudflare-ai-gateway  # list available models
```

## models.yml Override

```yaml
providers:
  cloudflare-ai-gateway:
    baseUrl: https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/v1
    apiKey: YOUR_TOKEN
    headers:
      cf-aig-gateway-id: my-gateway
```

## Migration from Legacy Provider-Native Endpoints

The old integration used:
- Host: `gateway.ai.cloudflare.com`
- Auth: `cf-aig-authorization: Bearer <token>`
- Path segments: `/openai`, `/anthropic`, `/compat`

The new integration uses:
- Host: `api.cloudflare.com`
- Auth: `Authorization: Bearer <token>`
- Gateway: `cf-aig-gateway-id: <gateway>`
- Path: `/ai/v1/chat/completions`, `/ai/v1/messages`

## Tests

Run the focused regression tests:

```bash
bun test packages/catalog/test/cloudflare-ai-gateway-provider.test.ts
bun test packages/ai/test/anthropic-alignment.test.ts
```
