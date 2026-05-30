---
title: "How Developers Can Use Open Agent Policy"
subtitle: "SDKs, LangChain, MCP, gateways, resource grants, and policy backends in one simple adoption path."
date: 2026-05-29
author: "Ishan"
math: false
draft: true
tags:
  - agentic-ai
  - mcp
  - langchain
  - security
  - open-agent-policy
categories:
  - engineering
series: "Open Agent Policy"
---

Security frameworks only matter if developers can use them.

If protecting an agent requires rewriting the whole application, most teams will not do it. If the docs begin with distributed policy theory, most people will leave before they run the first example.

Open Agent Policy needs to be useful in a normal developer workflow:

1. I have an agent.
2. The agent has tools.
3. Some tools touch sensitive systems.
4. I want policy checks before those actions happen.
5. I want the resource API to verify proof before returning data.

That is the adoption path.

## Start with one protected tool

The simplest place to start is inside the tool function.

Suppose an agent has a tool called `read_ticket`.

Without OAP, the tool may call the ticket API directly:

```python
def read_ticket(ticket_id: str):
    return ticket_api.get_ticket(ticket_id)
```

With OAP, the tool asks for authorization first:

```python
decision = oap.authorize(
    action="ticket.read",
    resource_type="support.ticket",
    resource_id=ticket_id,
    actor_id="alice@company.test",
)

if not decision.is_allowed:
    raise PermissionError(decision.reason)

return ticket_api.get_ticket(
    ticket_id,
    headers={"X-OAP-Grant-Token": decision.grant.token},
)
```

That is the core pattern.

Ask OAP. If allowed, pass the grant to the resource. If denied, stop.

## Use a decorator when you own the code

Calling `authorize()` manually is clear, but it is easy to forget.

So the SDK can protect a tool with a decorator:

```python
@protect(action="ticket.read", resource_type="support.ticket")
def read_ticket(ticket_id: str, oap_grant_token: str | None = None):
    return ticket_api.get_ticket(
        ticket_id,
        headers={"X-OAP-Grant-Token": oap_grant_token},
    )
```

The function still looks like a normal tool. The wrapper handles the policy check before the tool body runs.

This is a good first step when you own the agent code and want enforcement close to the tool definition.

## Wrap LangChain tools

Many developers are not calling tools by hand. They are using LangChain or LangGraph.

In that world, tools are registered with an agent runtime. OAP should fit that model instead of forcing every developer to rewrite the framework.

The LangChain integration protects tools before the agent uses them:

```python
from open_agent_policy.integrations.langchain import protect_tools

tools = protect_tools(
    tools,
    agent_id="agent://support/ticket-assistant",
    oap_client=oap,
)
```

The agent still sees tools. LangChain still invokes them. OAP gets a decision before the underlying tool runs.

That is the experience agent developers need: keep the framework, add policy checks.

## Use an MCP proxy when tools are external

Sometimes tools do not live inside your Python process.

With MCP, an agent may connect to an MCP server that exposes tools. You may not own the agent code. You may not own every tool implementation.

In that case, you can put an OAP MCP proxy in the middle:

```text
Agent -> OAP MCP Proxy -> MCP Server
          |
          +-> OAP policy decision
```

The proxy can:

- filter tools the agent is allowed to see
- authorize tool calls before forwarding them
- run in observe mode during rollout
- fail closed when enforcement cannot be trusted

This is useful for shared tool infrastructure. You can protect MCP access without asking every agent developer to add the same checks manually.

## Use an HTTP gateway for APIs

For normal HTTP services, OAP can sit at the gateway layer:

```text
Agent -> OAP Gateway -> Resource API
          |
          +-> OAP policy decision
```

The gateway maps an HTTP request to an action and resource. Then it asks OAP for a decision.

If the decision is deny, the request stops.

If the decision is allowed, the gateway forwards the request and can attach an OAP grant for the resource API to validate.

This is useful when teams want to protect existing APIs without rewriting every client immediately.

## Validate grants at the resource

The strongest integration is resource-side validation.

The resource API should reject requests without a valid OAP grant:

```text
X-OAP-Grant-Token: <grant>
```

That gives the resource final say. It can check that the grant is for the right action, resource, agent, run, and expiry.

This is the part that makes OAP more than a tool wrapper.

The agent asks permission, but the resource verifies proof.

## Auth protocols OAP can work with

OAP does not try to replace identity providers.

It expects agents to prove runtime identity using systems teams already understand.

The project supports or is building around:

- **OIDC / OAuth** for identity providers such as Keycloak, Okta, Azure AD, Auth0, and similar systems
- **Kubernetes ServiceAccount tokens** for workloads running in a cluster
- **SPIFFE JWT-SVID** for workload identity
- **WIMSE-style workload proof tokens** for emerging agentic workload identity patterns

The exact setup depends on where the agent runs.

The common idea is always the same: the agent must prove which workload it is before OAP issues a session.

## Policy engines OAP can work with

OAP has a built-in policy path for local use and simple deployments.

It can also connect to policy engines:

- **Open Policy Agent (OPA)** for teams already using Rego and OPA-based authorization
- **Cedar** for teams that prefer Cedar-style authorization policies

OAP defines the agent-specific request and decision model. The backend evaluates policy. The resource validates the grant.

That separation matters because organizations already have policy tooling. OAP should give those tools an agent-aware shape.

## A simple local path

The fastest way to understand OAP is to run the local validation stack.

It includes:

- Keycloak for real OIDC tokens
- Postgres for durable state and audit
- OAP server
- protected ticket and customer APIs
- approval API
- end-to-end tests
- optional OPA backend profile

The point of the stack is not to be a production deployment recipe. It is to let developers see the whole path:

```text
agent identity -> session -> run -> decision -> grant -> resource validation -> audit
```

Once that flow is clear, the framework becomes much easier to reason about.

## The adoption model

Different teams will start in different places.

Some will start with a decorator. Some will start with LangChain. Some will start with an MCP proxy. Some will put a gateway in front of one internal API. Some will go straight to resource-side grant validation.

That is fine.

The important thing is that every path moves toward the same model:

> Agents do not get broad ambient authority. They get scoped, auditable permission for specific actions on specific resources.

That is the developer story OAP has to make simple.
