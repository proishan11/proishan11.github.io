---
title: "Why Resource APIs Should Check Grants"
subtitle: "Agent security only works when the protected resource can verify that access was actually approved."
date: 2026-05-28
author: "Ishan"
math: false
draft: true
tags:
  - agentic-ai
  - authorization
  - security
  - open-agent-policy
categories:
  - engineering
series: "Open Agent Policy"
---

The easiest place to add agent security is inside the agent.

Before a tool runs, ask the policy server for permission. If the answer is deny, do not run the tool.

That is a good start.

But it is not enough.

The resource still needs to protect itself.

## The bypass problem

Imagine this flow:

```text
Agent -> OAP -> ticket API
```

The agent asks OAP, "Can I read ticket T-100?"

OAP says yes.

The agent calls the ticket API.

That seems fine until someone calls the ticket API directly:

```text
Script -> ticket API
Another service -> ticket API
Different agent -> ticket API
Misconfigured route -> ticket API
```

If the ticket API does not check for proof, it may serve the request anyway.

That is the bypass problem. Policy happened somewhere else, but the resource cannot tell whether the current request was actually approved.

## A grant is a receipt

OAP uses scoped grants to close that gap.

Think of a grant like a receipt from the policy server.

It says:

> OAP allowed this verified agent to perform this action on this resource for a short time, with these constraints.

The agent presents that grant to the resource API:

```text
GET /api/tickets/T-100
X-OAP-Grant-Token: <grant>
```

The resource API validates the grant before returning data.

That changes the trust model. The resource no longer has to trust that "this probably came through the right path." It can check the proof.

## What the grant should prove

A useful grant is not a generic access token.

It should be scoped.

For example, a grant for reading one ticket should not also allow customer export. A grant for ticket T-100 should not work for ticket T-200. A grant from yesterday should not work today.

The resource should be able to verify:

- which agent received the grant
- which action was approved
- which resource type and resource ID were approved
- which run or task caused the decision
- when the grant expires
- which constraints must be enforced

That scope is the difference between "the agent is trusted" and "this exact action was approved."

## Sessions, runs, and grants

OAP uses three runtime concepts:

- **Session**: proof that this workload is a specific agent
- **Run**: a tracked task or workflow the agent is performing
- **Grant**: proof that one action on one resource was allowed

The flow looks like this:

```text
Agent proves identity -> OAP session
Agent starts a task -> OAP run
Agent asks for access -> decision + grant
Agent calls resource -> resource validates grant
```

This creates a chain:

- the session ties the request to a verified agent
- the run ties actions to a task or user request
- the grant ties the resource call to a policy decision

That chain is what makes audit and enforcement meaningful.

## Why constraints belong at the resource

Suppose policy says:

```json
{
  "decision": "allow_with_constraints",
  "constraints": {
    "redact_fields": ["bank_account", "tax_identifier"],
    "max_records": 25
  }
}
```

Who should apply those constraints?

The agent could try. But the agent is not the best place to enforce data rules. The resource API owns the data. It knows the fields, the schema, the sensitivity, and the response shape.

So the better pattern is:

1. OAP returns constraints.
2. OAP includes those constraints in the grant.
3. The resource validates the grant.
4. The resource applies the constraints before returning data.

That way, the agent does not get raw sensitive data and then promise to behave. The resource only returns what policy allowed.

## A simple ticket example

The ticket API might do this:

```python
grant = request.headers.get("X-OAP-Grant-Token")

if not grant:
    raise Unauthorized("grant required")

validation = oap.validate_grant(
    grant_token=grant,
    action="ticket.read",
    resource_type="support.ticket",
    resource_id=ticket_id,
)

if not validation.valid:
    raise Forbidden("invalid grant")

ticket = load_ticket(ticket_id)
return apply_constraints(ticket, validation.constraints)
```

The exact code will differ by framework, but the idea is simple:

> No valid grant, no data.

That is the resource-side enforcement model.

## Why this helps audit

Grants also make audit clearer.

Instead of only logging "agent called ticket API," OAP can record:

- the verified agent
- the actor
- the run
- the action
- the resource
- the decision
- the constraints
- the policy IDs
- the grant expiry
- the timestamp

Later, an operator can ask:

- Which agent touched this ticket?
- Which user caused the action?
- Was access allowed or constrained?
- Which policy allowed it?
- Did the resource validate a grant?

That is the difference between logs and useful audit.

## The simple version

Agent wrappers are helpful. SDKs are helpful. Gateways are helpful.

But the resource is where the risk lives.

If a resource contains sensitive data or performs sensitive actions, it should not rely only on the agent's good behavior. It should require proof that OAP approved the exact action.

That is why grants matter.

They turn an authorization decision into something a resource API can verify.
