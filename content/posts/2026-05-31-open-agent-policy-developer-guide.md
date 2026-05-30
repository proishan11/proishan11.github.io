---
title: "Open Agent Policy Developer Guide"
subtitle: "A technical walkthrough for protecting an agent, issuing scoped grants, validating resources, and choosing auth and policy backends."
date: 2026-05-30
author: "Ishan"
math: false
draft: false
tags:
  - agentic-ai
  - security
  - authorization
  - developer-guide
  - open-agent-policy
categories:
  - engineering
series: "Open Agent Policy"
---

This is the technical companion to the introductory Open Agent Policy posts.

The earlier posts explain the problem in plain English:

- agents need scoped access, not broad API keys
- agent identity must be proven, not claimed
- policy should answer agent + actor + action + resource + context
- resource APIs should validate grants before serving data

This post is about the developer path.

The goal is to protect one agent action end to end:

```text
agent proves identity
  -> creates OAP session
  -> starts a run
  -> asks OAP to authorize a tool/API action
  -> receives allow, deny, approval required, or constrained allow
  -> receives a scoped grant when allowed
  -> calls the resource API with X-OAP-Grant-Token
  -> resource API validates the grant
  -> audit record is queryable
```

## 1. Run the local validation stack

Start with the repository:

```bash
git clone https://github.com/proishan11/open-agent-policy.git
cd open-agent-policy

make venv
source .venv/bin/activate
make build
```

Run the local production-like stack:

```bash
docker compose -f validation/docker-compose.yml --profile test build
docker compose -f validation/docker-compose.yml up -d \
  postgres keycloak oap-server ticket-api customer-api approval-api
docker compose -f validation/docker-compose.yml --profile test run --rm e2e-tests
```

Expected result:

```text
74 passed
```

This stack gives you:

- Keycloak for OIDC tokens
- Postgres for durable OAP state and audit events
- OAP server
- protected ticket and customer APIs
- approval API
- end-to-end security tests

The point is not that this is a hardened deployment. The point is that it exercises the real flow.

## 2. Register an agent identity

An OAP agent has a logical ID and one or more runtime identity bindings.

Example:

```yaml
apiVersion: oap.dev/v1alpha1
kind: Agent
metadata:
  id: agent://support/ticket-assistant
spec:
  identityBindings:
    - type: oidc_client
      issuer: http://keycloak:8080/realms/oap-validation
      subject: service-account-support-agent
      audience: oap-server
```

The policy layer refers to `agent://support/ticket-assistant`.

The runtime layer verifies an OIDC token from the expected issuer, subject, and audience before creating a session.

OAP supports or is designed around these identity styles:

| Protocol | Use case |
| --- | --- |
| OIDC / OAuth-style JWTs | Agents authenticated by an IdP such as Keycloak, Okta, Auth0, Azure AD |
| Kubernetes ServiceAccount JWTs | Cluster-native workloads |
| SPIFFE JWT-SVID | Workload identity from SPIFFE/SPIRE |
| WIMSE WIT + WPT | Workload identity plus proof-of-possession for agentic systems |
| OAP session token | Short-lived `ags_...` token returned by `/v1/runtime/session` |

The practical rule is: do not trust `agent_id` by itself. Bind it to runtime proof.

## 3. Create a session

The agent first obtains a runtime credential from its identity provider.

Then it creates an OAP session:

```bash
curl -sS -X POST "$OAP_SERVER_URL/v1/runtime/session" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent://support/ticket-assistant",
    "runtime_token": "'"$RUNTIME_TOKEN"'"
  }'
```

The response contains a session token:

```json
{
  "session_id": "ags_...",
  "agent_id": "agent://support/ticket-assistant",
  "expires_at": "2026-05-31T12:00:00Z"
}
```

Use that session token as a bearer token for runtime authorization calls.

## 4. Start a run

A run groups many tool calls into one task.

Example:

```bash
curl -sS -X POST "$OAP_SERVER_URL/v1/runs" \
  -H "Authorization: Bearer $OAP_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actor": {
      "type": "user",
      "id": "alice@company.test"
    },
    "purpose": "summarize ticket T-100"
  }'
```

The run ID can then be included in authorization context.

Why this matters:

- audit can group actions by task
- approval can be tied to a specific workflow
- future revocation and incident response can reason about one run

## 5. Write a policy

Start with a small policy.

Example: support agents may read individual tickets with constraints.

```yaml
apiVersion: oap.dev/v1alpha1
kind: Policy
metadata:
  id: support-ticket-read
spec:
  agents:
    - agent://support/ticket-assistant
  actions:
    - ticket.read
  resources:
    - type: support.ticket
  decision: allow_with_constraints
  constraints:
    redactFields:
      - internal_notes
    maxRecords: 1
    expiresIn: 5m
```

Add a denial for dangerous actions:

```yaml
apiVersion: oap.dev/v1alpha1
kind: Policy
metadata:
  id: deny-ticket-export
spec:
  agents:
    - agent://support/ticket-assistant
  actions:
    - ticket.bulk_export
  decision: deny
```

OAP is intentionally strict about policy vocabulary. If a policy uses unsupported intent, it should fail closed instead of silently ignoring a rule.

## 6. Authorize a tool call

In Python, use the SDK:

```python
import requests
from open_agent_policy import OAPClient

client = OAPClient(
    server_url="http://localhost:8080",
    agent_id="agent://support/ticket-assistant",
    session_token="<ags-session-token>",
)

decision = client.authorize(
    action="ticket.read",
    resource_type="support.ticket",
    resource_id="T-100",
    actor_type="user",
    actor_id="alice@company.test",
    context={"run_id": "run_123"},
)

if not decision.is_allowed:
    raise PermissionError(decision.reason)

response = requests.get(
    "http://localhost:9100/api/tickets/T-100",
    headers={"X-OAP-Grant-Token": decision.grant.token},
)
response.raise_for_status()
ticket = response.json()
```

The important part is the grant header:

```text
X-OAP-Grant-Token: <grant>
```

That is what the resource API validates.

## 7. Use a decorator for tools

If you own the tool code, the decorator keeps enforcement close to the function:

```python
from open_agent_policy import OAPClient, protect

client = OAPClient(
    server_url="http://localhost:8080",
    agent_id="agent://support/ticket-assistant",
    session_token="<ags-session-token>",
)

@protect(
    client,
    action="customer.read",
    resource_type="crm.customer",
)
def read_customer(customer_id: str, *, oap_grant_token: str = "", **kwargs):
    response = requests.get(
        f"http://localhost:9101/api/customers/{customer_id}",
        headers={"X-OAP-Grant-Token": oap_grant_token},
    )
    response.raise_for_status()
    return response.json()
```

The wrapper should:

- call OAP before the tool runs
- stop execution on deny
- raise approval-required errors when policy requires approval
- pass constraints to the tool
- pass grant tokens to tools that accept them

## 8. Protect LangChain tools

For LangChain or LangGraph, wrap tools before giving them to the agent:

```python
from open_agent_policy.integrations.langchain import protect_tools

protected_tools = protect_tools(
    tools,
    client=client,
    agent_id="agent://support/ticket-assistant",
    action_prefix="ticket.",
    resource_type="support.ticket",
)
```

The agent still uses tools normally. OAP authorizes before the underlying tool executes.

For a runnable example with real local LLM calls, see the repository's minimal LangChain/Ollama example.

## 9. Validate grants at the resource API

This is the part I would not skip.

The resource API should reject direct access unless there is a valid grant.

Minimal FastAPI shape:

```python
from fastapi import Header, HTTPException
from open_agent_policy import OAPClient

oap = OAPClient(server_url="http://localhost:8080")

def require_grant(
    grant_token: str | None,
    *,
    action: str,
    resource_type: str,
    resource_id: str,
) -> dict:
    if not grant_token:
        raise HTTPException(401, "X-OAP-Grant-Token is required")

    grant = oap.validate_grant(grant_token)
    if not grant.get("valid"):
        raise HTTPException(403, "invalid OAP grant")
    if grant.get("action") != action:
        raise HTTPException(403, "grant action mismatch")
    if grant.get("resource_type") != resource_type:
        raise HTTPException(403, "grant resource type mismatch")
    if grant.get("resource_id") != resource_id:
        raise HTTPException(403, "grant resource id mismatch")

    return grant

@app.get("/api/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    x_oap_grant_token: str | None = Header(default=None, alias="X-OAP-Grant-Token"),
):
    grant = require_grant(
        x_oap_grant_token,
        action="ticket.read",
        resource_type="support.ticket",
        resource_id=ticket_id,
    )

    ticket = load_ticket(ticket_id)
    return apply_constraints(ticket, grant.get("constraints", {}))
```

This blocks direct API bypass.

Wrong action, wrong resource, missing grant, expired grant, or forged grant should fail.

## 10. Use a gateway or MCP proxy

If you cannot change every tool or resource immediately, use an enforcement layer.

For HTTP APIs:

```text
Agent -> OAP Gateway -> Resource API
          |
          +-> OAP /v1/authorize
```

For MCP:

```text
Agent -> OAP MCP Proxy -> MCP Server
          |
          +-> OAP /v1/authorize
```

These are useful rollout paths:

- observe mode first
- inspect audit
- switch to enforce mode
- move strongest checks into resource APIs over time

## 11. Choose a policy backend

OAP can evaluate policy itself, or delegate rule evaluation to an external backend.

Current backend directions:

| Backend | When to use |
| --- | --- |
| Built-in evaluator | Local development, simple policies, conformance-first behavior |
| OPA | Teams already using Open Policy Agent and Rego |
| Cedar | Teams using Cedar or Cedar-compatible authorization services |

OPA example:

```bash
docker compose -f validation/docker-compose.yml --profile opa-test build \
  e2e-tests-opa oap-server-opa oap-server-opa-unavailable ticket-api-opa customer-api-opa
docker compose -f validation/docker-compose.yml --profile opa-test run --rm e2e-tests-opa
```

Expected result:

```text
6 passed
```

Important: even with OPA or Cedar, OAP still owns agent registration, identity verification, grant issuance, and audit shape. The backend helps decide policy; it does not replace the agent security model.

## 12. Query audit

Every decision should leave an audit trail.

In the validation stack, inspect audit events through Postgres:

```bash
docker compose -f validation/docker-compose.yml exec postgres \
  psql -U oap -d oap \
  -c "SELECT id, agent_id, action, decision, created_at FROM oap_audit_events ORDER BY created_at DESC LIMIT 20;"
```

In server mode, audit query supports filters such as agent, actor, action, decision, request ID, run ID, resource, time range, limit, and offset.

For production, audit still needs the usual hardening:

- retention policy
- immutable export
- SIEM integration
- OpenTelemetry
- dashboards and alerts

But the baseline should be: every authorization decision is queryable.

## A developer checklist

For a serious OAP integration, I would check these boxes:

- Agent has a stable logical ID.
- Logical ID is bound to runtime identity proof.
- Agent creates a short-lived OAP session.
- Tool calls include actor, action, resource, and run context.
- Deny stops execution.
- Approval-required routes into an approval workflow.
- Allowed decisions produce scoped grants.
- Resource APIs reject missing or invalid grants.
- Resource APIs enforce constraints, not the agent alone.
- Every decision emits audit.
- Unknown policy vocabulary fails closed.
- OPA or Cedar backends are tested fail-closed if used.

That checklist is the practical heart of the framework.

The goal is not to make agent development slower. The goal is to make agent access explicit enough that developers and security teams can trust what the agent is allowed to do.
