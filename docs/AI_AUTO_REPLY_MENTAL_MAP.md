# AI Auto-Reply (FluxCore) — Mental Map (Source of truth = code)

## 1) End-to-end flow (runtime)

### 1. Incoming message
- **Entry point**: `apps/api/src/core/message-core.ts` (`MessageCore.receive(envelope)`)
- Persists the message + updates conversation/relationship.
- Broadcasts to WebSocket.

### 2. Automation evaluation (gate)
- **Service**: `apps/api/src/services/automation-controller.service.ts`
- Called from `MessageCore.receive()` via:
  - `automationController.evaluateTrigger({ accountId, relationshipId, messageContent, ... })`
- Output: `TriggerEvaluation`:
  - `shouldProcess: boolean`
  - `mode: 'automatic' | 'supervised' | 'disabled'`
  - `reason: string`

#### Behavior (important)
- **Auto-reply (sending a message automatically)** happens only if:
  - `shouldProcess === true`
  - `mode === 'automatic'`

### 3. Suggestion generation
- **Service**: `apps/api/src/services/ai.service.ts`
- Called from `MessageCore.receive()` (auto mode) with:
  - `aiService.generateResponse(conversationId, targetAccountId, messageText, { mode: 'auto' })`

#### Config resolution
- `AIService.getAccountConfig(accountId)`:
  - Loads entitlement: `account_ai_entitlements` via `ai-entitlements.service.ts`
  - Loads installation/config: `extension_installations` row for `@fluxcore/fluxcore`
  - Builds `providerOrder` from env keys (`GROQ_API_KEY`, `OPENAI_API_KEY`, pools).

### 4. FluxCore extension execution
- **Extension**: `extensions/fluxcore/src/index.ts`
- Receives config via `onConfigChange`.
- Generates completion via `createChatCompletionWithFallback()`.

#### Provider fallback
- Uses `providerOrder` (array of {provider, baseUrl, apiKey}).
- If provider fails with retryable error, tries next provider.

### 5. Auto-send (only in automatic)
- If `generateResponse()` returns suggestion with content, `MessageCore` sends it:
  - `this.send({ generatedBy: 'ai', type: 'outgoing', ... })`

---

## 2) Main gates (why IA might NOT reply)

### Gate A — Ownership (API access)
- Routes like `/ai/status?accountId=` verify account ownership:
  - `accountService.getAccountsByUserId(user.id)`
  - checks `accounts.owner_user_id == user.id`
- If `accountId` is from a contact or another user -> **403 Account does not belong to user**.

### Gate B — Automation mode
- Auto-reply requires `mode === 'automatic'`.
- If mode is `supervised`, system may generate suggestions but not auto-send.

### Gate C — FluxCore installed/enabled
- Needs `extension_installations` row for `@fluxcore/fluxcore` for that account.
- Needs `installation.enabled !== false` and `config.enabled !== false`.

### Gate D — Provider keys configured
- Needs `providerOrder.length > 0`.
- Keys taken from env vars.

### Gate E — Provider/model mismatch
- `extensions/fluxcore/manifest.json` validates config schema.
- If `model` not in enum or `responseDelay` violates min/max -> backend rejects config update.

---

## 3) Diagnostic endpoints

### Account-aware diagnostics
- `GET /ai/status?accountId=...`
  - Requires account ownership
  - Returns entitlement/config/providerOrder + probe attempts

### Env-level diagnostics (no account)
- `GET /ai/status`
  - Returns provider keys presence + probe attempts

### Provider/model probe (no account ownership)
- `POST /ai/probe`
  - Requires auth (JWT)
  - Tests a specific provider/model (ex: openai + gpt-4o-mini-2024-07-18)

---

## 4) UI levers (how to act from UI)

### A) Pick the correct accountId (owned)
- Use Account Switcher (top/left) to choose your account.
- That accountId is stored in:
  - `apps/web/src/store/uiStore.ts` (`selectedAccountId`)
  - `apps/web/src/store/accountStore.ts` (`activeAccountId`)

### B) Configure FluxCore
- UI panel: Extensions -> Configure `@fluxcore/fluxcore`.
- Key config fields:
  - `provider`: `groq` or `openai`
  - `model`: choose `gpt-4o-mini-2024-07-18` for OpenAI
  - `mode`: `auto` for auto-reply
  - `responseDelay`: for testing, set `0`

---

## 5) Minimal acceptance test

1. `POST /ai/probe` (openai + gpt-4o-mini-2024-07-18) -> ok
2. Set account automation to `automatic`
3. Set FluxCore config: provider=openai, model=gpt-4o-mini-2024-07-18, mode=auto, responseDelay=0
4. Send message to that account -> AI replies automatically
