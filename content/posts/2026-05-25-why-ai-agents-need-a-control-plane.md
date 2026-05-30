---
title: "Why AI Agents Need an Access Control Plane"
subtitle: "A plain-language introduction to the security problem Open Agent Policy is trying to solve."
date: 2026-05-25
author: "Ishan"
math: false
draft: false
tags:
  - agentic-ai
  - security
  - open-agent-policy
categories:
  - engineering
series: "Open Agent Policy"
---

AI agents are becoming useful because they can do things.

They do not just answer questions. They call tools. They read tickets. They query databases. They send emails. They open pull requests. They summarize customer records. They may run for several steps before a human looks at the result.

That is the moment where an agent stops being "just a chatbot" and starts looking like a small software service.

And once an agent can touch real systems, we have to ask a security question:

> Who is allowed to do what, on which resource, under which conditions?

That question is old. Every serious system asks it. What is new is that agents make the answer harder.

## The old shortcut is too risky

The easiest way to give an agent power is to give it an API key.

For a demo, that works. The agent can call the ticket API, search a database, or post to Slack. The demo looks alive.

But an API key is usually too blunt:

- It may give the agent more access than it needs.
- It may not say which user or workflow caused the action.
- It may be shared across several agents.
- It may be accepted directly by a resource API.
- It may not carry task context, approval state, or policy constraints.

If the agent does the wrong thing, the log might only say "API key used." That is not enough.

Now imagine a support agent with access to customer tickets. The agent should be able to read the ticket the user is asking about. It should not be able to export every customer record. It may be allowed to summarize a billing note, but only after redacting bank details. It may be allowed to refund a small amount, but a large refund should require approval.

Those are not model problems. They are access control problems.

## Agents blur normal identity boundaries

In a normal application, there are usually a few familiar identities:

- a human user
- a backend service
- a scheduled job
- an administrator

An agent can involve all of them at once.

It may act on behalf of a user. It may run as a workload in Kubernetes. It may call tools through an SDK. It may use a service credential. It may make choices based on prompt content, retrieved documents, tool descriptions, and previous steps in a run.

So when the agent calls a resource, the resource should not only ask:

> Does this token look valid?

It should also ask:

> Which agent is this? Which user or workflow caused it? What is it trying to do? Is this resource inside scope? Did policy allow it? Are there constraints? Was approval required?

That is the access problem Open Agent Policy is built around.

## The core idea

Open Agent Policy, or OAP, is based on a simple idea:

> An agent should ask for permission before taking an action, and the resource should verify proof before serving the request.

In plain terms, the flow looks like this:

```text
Agent wants to use a tool
  -> OAP checks policy
  -> OAP returns allow, deny, constraints, or approval required
  -> if allowed, OAP issues a short-lived grant
  -> the agent calls the resource with that grant
  -> the resource validates the grant before doing anything
```

The important part is the last step.

OAP is not just a wrapper around the agent. If only the agent checks policy, the resource can still be called directly. A resource API should be able to say:

> I will only serve this request if there is a valid OAP grant for this exact action and this exact resource.

That is how the decision becomes enforceable.

## Why resources need to be secured

Agents are not the only thing that can call an API.

A misconfigured service, an internal script, a leaked token, a badly routed request, or a second agent may reach the same resource. If the resource blindly trusts that "good callers go through the gateway," the system has a gap.

The resource owns the data. It should enforce the final check.

For example, a ticket API should not accept:

```text
GET /api/tickets/T-100
```

just because the caller is on the internal network.

It should require proof:

```text
GET /api/tickets/T-100
X-OAP-Grant-Token: <short-lived grant>
```

Then the ticket API can validate:

- this grant was issued by OAP
- it belongs to the verified agent
- it is for `ticket.read`
- it is for ticket `T-100`
- it has not expired
- it carries any constraints the resource must apply

That is the difference between trusting the agent and securing the resource.

## What Open Agent Policy provides

OAP is a framework for agent authorization. It is not a model, not an agent runtime, and not a replacement for your identity provider.

It gives developers a common way to model and enforce agent access:

- register agents and their allowed identity proofs
- verify agent runtime identity
- evaluate each action against policy
- return allow, deny, constrained allow, or approval required
- issue scoped grants for resource APIs
- support SDK, LangChain, MCP proxy, and HTTP gateway enforcement
- write audit events for decisions and grants
- use built-in policy evaluation or connect policy engines such as Open Policy Agent

The point is not to make every agent system look the same. The point is to give every system the same security questions to answer.

## What developers can do with it

A developer can start small.

If you own the agent code, you can use the Python SDK or decorator to protect individual tools. Before a tool reads a ticket or sends an email, it asks OAP for a decision.

If you use LangChain, you can wrap tools so authorization happens before tool execution.

If you use MCP, you can put the OAP MCP proxy between the agent and the MCP server.

If you have HTTP APIs, you can put the OAP gateway in front of them.

If you own the resource API, you can validate OAP grants before returning data.

Those are different integration paths, but they share the same idea:

```text
agent + actor + action + resource + context -> decision
```

## What auth and policy systems does it fit with?

OAP is meant to sit next to existing identity and policy systems.

For identity, the project supports or is building around:

- OIDC and OAuth-style runtime tokens
- Kubernetes ServiceAccount tokens
- SPIFFE JWT-SVID workload identity
- WIMSE-style workload and proof-of-possession tokens

For policy evaluation, OAP has its own baseline evaluator and adapters for policy engines such as:

- Open Policy Agent
- Cedar

This matters because enterprises already have identity providers, workload identity, policy engines, and audit systems. OAP should connect to those systems, not ask every team to throw them away.

## The simple version

If I had to describe OAP in one sentence, it would be this:

> OAP gives AI agents a permission system that resources can verify.

That is the foundation.

The rest of the project is about making that foundation practical: identity, sessions, grants, approvals, SDKs, gateways, MCP, audit, storage, policy engines, and eventually enterprise operations.

This series will walk through those pieces in simple terms.

The next post starts with identity, because none of the policy decisions matter if the agent can lie about who it is.

Further reading:

- [Open Agent Policy on GitHub](https://github.com/proishan11/open-agent-policy)
- [IETF draft: AI Agent Authentication](https://www.ietf.org/archive/id/draft-klrc-aiagent-auth-00.html)
- [Careful Adoption of Agentic AI Services](https://media.defense.gov/2026/Apr/30/2003922823/-1/-1/0/CAREFUL%20ADOPTION%20OF%20AGENTIC%20AI%20SERVICES_FINAL.PDF)
