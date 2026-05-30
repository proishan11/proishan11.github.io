---
title: "Where Open Agent Policy Is Today"
subtitle: "What developers can use now, what is still missing, and what enterprise readiness should mean for agent security."
date: 2026-05-30
author: "Ishan"
math: false
draft: false
tags:
  - agentic-ai
  - enterprise
  - security
  - open-agent-policy
categories:
  - engineering
series: "Open Agent Policy"
---

Open Agent Policy is not just an idea anymore.

It has a server, schemas, a policy evaluator, a Python SDK, LangChain integration, MCP proxy support, an HTTP gateway, sessions, runs, scoped grants, Postgres storage, audit query, OPA and Cedar backend work, and a local validation environment.

That is enough to try the model seriously.

It is not the same thing as being enterprise-ready.

This post is the honest status.

## The short version

OAP is useful today if you want to:

- understand the agent authorization problem
- experiment with scoped grants
- protect a local or internal agent prototype
- test resource-side grant validation
- try LangChain tool protection
- put a gateway or MCP proxy in front of tools
- evaluate policy decisions with built-in policy or OPA
- inspect audit events from a production-shaped local stack

OAP is not yet something I would describe as a finished enterprise platform.

That distinction matters.

A framework can have the right security model before it has every operational feature a large organization needs.

## What feels solid

The strongest part is the core model:

```text
verified agent identity
        +
policy decision
        +
scoped grant
        +
resource-side validation
        +
audit record
```

That model is the foundation.

It avoids two common mistakes:

- trusting an agent because it says who it is
- trusting a resource request because it probably came through the right path

Instead, the agent proves identity, asks for permission, receives a scoped grant, and the resource validates that grant before serving data.

That is the core idea I think agent systems need.

## What developers can use now

Developers can already use OAP to build experiments and early prototypes.

The Python SDK can call OAP before a tool runs. The decorator pattern can protect a tool with less boilerplate. The LangChain integration can wrap framework tools. The MCP proxy can sit between an agent and an MCP server. The HTTP gateway can sit in front of APIs.

Resource APIs can validate OAP grants using the validation endpoint or middleware-style code.

The local validation environment is especially useful because it is not only a toy. It uses real moving parts:

- Keycloak for OIDC
- Postgres for durable state
- OAP server
- protected ticket and customer APIs
- approval API
- audit query
- OPA sidecar profile
- end-to-end security tests

That gives developers a realistic way to see how the pieces fit.

## What auth and policy support means

OAP should not force every team into one identity system or one policy language.

The direction is to support common identity and workload proof systems:

- OIDC and OAuth-style tokens
- Kubernetes ServiceAccount tokens
- SPIFFE JWT-SVID
- WIMSE-style workload proof tokens

For policy evaluation, OAP can use its own baseline evaluator and can connect to policy backends such as:

- Open Policy Agent
- Cedar

In simple terms:

- identity systems prove the agent runtime
- policy engines help decide whether the action is allowed
- OAP gives the decision an agent-aware shape
- grants let resources verify the result

That is how OAP fits with existing infrastructure.

## What is still missing

The missing pieces are mostly operational and administrative.

### Admin security

The OAP control plane itself needs production-grade admin authentication and RBAC.

It is not enough to secure agent actions. Policy management, agent registration, audit query, approval operations, and administrative APIs also need strict access control.

### Approval lifecycle

The decision model can say `require_approval`, but a full production approval system needs more:

- durable approval requests
- approver identity
- expiry
- revocation
- audit events
- grant issuance after approval
- protection against replay

Approval is central for risky agent actions. It should be a first-class workflow.

### Audit operations

Audit events exist, and Postgres-backed audit query is an important baseline.

Enterprise audit needs more:

- retention policy
- export to SIEM
- OpenTelemetry traces
- dashboards
- alerts
- immutable storage options
- compliance-friendly search

Logs are not enough. Operators need to answer real questions later.

### Multi-tenancy and policy workflow

Larger organizations need tenant isolation, quotas, rate limits, and policy-as-code.

Policy changes should support review, diff, dry-run, approval, rollback, and GitOps sync.

Agent policy will become production infrastructure. It should behave like production infrastructure.

### More developer integrations

LangChain and MCP are a good start, but developers use many frameworks.

The adoption path needs more:

- OpenAI Agents SDK
- CrewAI
- AutoGen
- LlamaIndex
- Semantic Kernel
- Haystack
- TypeScript SDK
- OpenAI and Anthropic tool-use examples

The easier it is to adopt OAP in an existing agent stack, the more likely teams are to use it correctly.

## What enterprise-ready should mean

For a project like OAP, "enterprise-ready" should not mean a long feature checklist with no security meaning.

It should mean:

- agent identity cannot be spoofed by changing a string
- policy decisions are explicit and fail closed
- resources can validate scoped grants
- approvals are durable and auditable
- audit events are queryable and exportable
- admin APIs are protected
- policy changes are reviewable
- deployment has migration, backup, recovery, and monitoring guidance
- failure modes are documented

That is the bar.

OAP is moving toward it, but it should be honest about what is done and what is not.

## Why I think this is worth building

Agents are going to touch more systems.

Some will be small helpers. Some will run inside developer tools. Some will operate in support, finance, security, infrastructure, and operations workflows.

If those agents have broad credentials and weak audit, organizations will either block them or accept risk they do not understand.

I want a better middle path:

> Let agents do useful work, but make every meaningful action authorized, scoped, constrained, and auditable.

That is what Open Agent Policy is trying to become.

It is early, but the shape is clear enough to test and criticize. That is the right stage for an open security project: concrete enough to run, honest enough to improve.
