# Remediation Log — heretek-openclaw-dashboard

**Date:** 2026-04-04
**Reviewer:** Kilo (GLM-5.1)

## Changes Made

### SEC-002 / B6: Dashboard API Authentication
- **File:** `src/server/api-server.js`
- **Change:** Added API key authentication middleware in `_handleRequest()`. Reads `DASHBOARD_API_KEY` from env or config. Rejects unauthorized requests with 401. Can be disabled in dev via `DASHBOARD_AUTH_DISABLED=true`.
- **AUDIT-FIX comment:** `B6`

### SEC-010 / B7: CORS Default Fixed
- **File:** `src/server/api-server.js:103`
- **Change:** Changed CORS default from `true` to `config.cors === true` (opt-in only).
- **AUDIT-FIX comment:** `B7`

### B5: Dashboard Routes Replaced with Real API Calls
All 8 TODO stub routes replaced with real HTTP calls:
- `litellm/config/route.ts` — fetches from LITELLM_URL/config
- `a2a/broadcast/route.ts` — POSTs to GATEWAY_URL/a2a/broadcast
- `a2a/stream/route.ts` — streams from GATEWAY_URL/a2a/stream
- `memory/[id]/route.ts` — GET/DELETE from Qdrant
- `memory/[id]/pin/route.ts` — POST to Qdrant
- `skills/[id]/route.ts` — DELETE to GATEWAY_URL
- `agents/[id]/route.ts` — GET/PUT to GATEWAY_URL
- `agents/[id]/deploy/route.ts` — POST to GATEWAY_URL

### SEC-003 / B10: Built Artifacts Deleted
- **Action:** Deleted `heretek-collective-ui/.next/` directory containing stale build artifacts with hardcoded API keys.

### INT-002: Placeholder Secrets Removed
- **File:** `heretek-collective-ui/.env.local`
- **Change:** Replaced `sk-1234`, `password`, and other placeholder secrets with empty values.
