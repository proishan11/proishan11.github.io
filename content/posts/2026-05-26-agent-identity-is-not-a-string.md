---
title: "Agent Identity Is Not a String"
subtitle: "Before an agent gets access, it has to prove which workload it really is."
date: 2026-05-26
author: "Ishan"
math: false
draft: false
tags:
  - agentic-ai
  - identity
  - security
  - open-agent-policy
categories:
  - engineering
series: "Open Agent Policy"
---

Every agent access system eventually starts with a name.

For example:

```text
agent://support/ticket-assistant
```

That name is useful. Policies need stable names. Audit logs need stable names. Humans need to know which agent did something.

But a name is not proof.

If a request says, "I am `agent://support/ticket-assistant`," the server still has to ask:

> Why should I believe you?

That is the identity problem Open Agent Policy has to solve before policy can mean anything.

## The mistake: trusting an agent ID

The simplest agent authorization design is to send an `agent_id` in every request:

```json
{
  "agent_id": "agent://support/ticket-assistant",
  "action": "ticket.read",
  "resource": "support.ticket/T-100"
}
```

This looks reasonable until you remember that the request body is controlled by the caller.

What stops another workload from sending the same `agent_id`? What stops a broken integration from reusing the same ID for multiple agents? What stops a prompt-injected tool call from trying to pass a more privileged agent ID?

If policy trusts a caller-controlled string, the whole system becomes fragile.

OAP separates two things:

- the logical agent identity, which is the stable name used in policy
- the runtime proof, which is evidence that the current workload is allowed to use that name

The logical identity says who the agent is supposed to be. The runtime proof shows that the caller is actually that agent.

## A simple example

Imagine two agents:

- `agent://support/ticket-assistant`
- `agent://finance/refund-agent`

The support agent can read tickets. The finance agent can create refunds.

If both agents use the same API key, or if both can claim any `agent_id`, policy is mostly theater. The support agent may be able to pretend to be the finance agent.

Instead, each agent should have a runtime identity binding. In plain language:

> This logical agent may only be used by this specific workload identity.

In OAP, that can look like:

```yaml
apiVersion: oap.dev/v1alpha1
kind: Agent
metadata:
  id: agent://support/ticket-assistant
spec:
  identityBindings:
    - type: oidc_client
      issuer: https://idp.example.com
      subject: service-account-support-agent
      audience: oap-server
```

This means the support ticket assistant is not just a string. It must be proven by a token from the expected issuer, with the expected subject, for the expected audience.

If the token is expired, signed by the wrong issuer, meant for another audience, or belongs to a different workload, OAP should reject it.

## The session flow

The flow is simple:

```text
1. Agent gets a runtime token from an identity provider.
2. Agent sends that token to OAP.
3. OAP verifies the token against the agent's identity bindings.
4. OAP creates a short-lived agent session.
5. The agent uses that session when asking for authorization.
```

The session matters because it gives OAP a clean internal handle:

- this session belongs to this verified agent
- this session expires
- this session can be used for runs and audit
- this session can become revocable later

After the session exists, OAP does not have to trust whatever agent ID appears in a tool request. The server already knows which agent proved itself.

## Supported identity styles

Agent identity will not be one protocol for every environment.

A local demo may use a simple token. A production service may use OIDC. A Kubernetes workload may use a ServiceAccount token. A service mesh may use SPIFFE. Emerging agent infrastructure may use WIMSE-style workload identity.

OAP is designed to work with those patterns instead of inventing a new identity universe.

The current direction includes:

- **OIDC / OAuth** for common identity providers such as Keycloak, Okta, Auth0, Azure AD, and similar systems
- **Kubernetes ServiceAccount tokens** for cluster workloads
- **SPIFFE JWT-SVID** for workload identity in service-mesh-style environments
- **WIMSE** style workload identity and proof-of-possession tokens for agentic systems

The exact protocol differs, but the goal is the same:

> Bind a logical agent to a verifiable runtime identity.

## Why not just use user identity?

Because an agent is not only the user.

Suppose Alice asks a support agent to summarize ticket T-100. The action involves:

- Alice, the human actor
- the support ticket assistant, the agent
- the ticket API, the resource
- the current run, task, or purpose

If the request only says "Alice did it," we lose which agent acted. If the request only says "the support agent did it," we lose the user or workflow that caused it.

OAP keeps both in the model:

- the **actor** is the user, service, or workflow on whose behalf work is happening
- the **agent** is the autonomous system choosing and invoking tools

That distinction is important for audit and policy.

Alice may be allowed to read her own ticket. The support agent may be allowed to summarize tickets but not export customer data. Both facts matter.

## Identity is the first gate, not the whole policy

Once OAP knows which agent is acting, it still has to decide what that agent may do.

Identity answers:

> Is this really the support ticket assistant?

Authorization answers:

> May the support ticket assistant perform this action, for this actor, on this resource, in this context?

Those are different questions.

This is why "agent identity" is not the whole framework. It is the foundation under the rest of the framework.

Without identity, every policy can be bypassed by lying about who is calling.

With identity, OAP can start making meaningful decisions about actions and resources.

## The practical rule

The rule is simple:

> Never authorize an agent because it says who it is. Authorize it after it proves who it is.

That proof might come from OIDC, Kubernetes, SPIFFE, WIMSE, or another trusted identity system.

The details can vary by deployment. The principle should not.

If agents are going to run near real systems, their identity has to be more than a field in JSON.
