---
title: "Policy for AI Agents, in Plain English"
subtitle: "The simple authorization question behind Open Agent Policy: who can do what, on which resource, and under which conditions?"
date: 2026-05-27
author: "Ishan"
math: false
draft: false
tags:
  - agentic-ai
  - policy
  - security
  - open-agent-policy
categories:
  - engineering
series: "Open Agent Policy"
---

Policy can sound abstract.

In practice, an agent policy is just a clear answer to a practical question:

> Is this agent allowed to take this action on this resource right now?

That question has to be answered before an agent reads customer data, sends an email, creates a refund, modifies a repository, runs a database query, or calls an internal API.

Open Agent Policy is built around making that question explicit.

## What a policy decision needs to know

A useful decision needs more than "is the token valid?"

It needs the shape of the action.

For example:

```json
{
  "agent": "agent://support/ticket-assistant",
  "actor": "alice@company.test",
  "action": "ticket.read",
  "resource": "support.ticket/T-100",
  "purpose": "summarize the customer's open issue"
}
```

This is intentionally plain.

- The **agent** is the autonomous system taking the step.
- The **actor** is the user, workflow, or service that caused the step.
- The **action** is what the agent wants to do.
- The **resource** is the thing being touched.
- The **purpose** is why this is happening.

Once that shape is clear, policy becomes easier to reason about.

## A simple policy example

Suppose we want the support ticket assistant to read support tickets but not export customers.

In plain English:

> The support ticket assistant may read individual support tickets for the current actor, but it may not perform bulk customer export.

That can become policy:

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
  decision: allow
```

And a separate rule can deny dangerous actions:

```yaml
apiVersion: oap.dev/v1alpha1
kind: Policy
metadata:
  id: deny-bulk-export
spec:
  agents:
    - agent://support/ticket-assistant
  actions:
    - customer.bulk_export
  decision: deny
```

This is not meant to be magical. It should be readable enough that an engineer, security reviewer, or platform owner can understand what the agent is allowed to do.

## Why allow and deny are not enough

Agents often need limited access, not unlimited access.

A support agent may read a ticket, but sensitive fields should be hidden. A finance agent may list invoices, but only the first 25 records. A code agent may open an issue, but modifying repository settings should require approval.

So OAP decisions are not only `allow` or `deny`.

They can also be:

- `allow_with_constraints`
- `require_approval`

For example:

```json
{
  "decision": "allow_with_constraints",
  "constraints": {
    "redact_fields": ["bank_account", "tax_identifier"],
    "max_records": 25
  }
}
```

This matters because many real incidents are not "the agent did something obviously forbidden."

They are more subtle:

- the agent read too many records
- the agent exposed sensitive fields
- the agent took an action that should have needed approval
- the agent used a tool outside the user's intent

Good policy needs to handle those cases.

## Why policy must fail closed

One of the easiest ways to build a dangerous policy system is to silently ignore policy keys the engine does not understand.

Imagine a policy like this:

```yaml
constraints:
  redactFields:
    - bank_account
  requireManagerApproval: true
```

If the engine understands `redactFields` but does not understand `requireManagerApproval`, what should happen?

The unsafe answer is:

> Apply what we understand and ignore the rest.

That creates false confidence. A human thinks manager approval is required. The runtime does not enforce it.

OAP takes the stricter path:

> If policy contains unsupported intent, fail closed.

That means deny or reject the policy rather than silently pretend it is enforced.

This can feel less convenient, but it is the right default for security. A policy system should not let humans believe protections exist when the runtime cannot enforce them.

## Policy should be boring

For agent systems, boring is good.

A good policy format should make it obvious:

- which agents the rule applies to
- which actions are covered
- which resources are covered
- what conditions matter
- what constraints are returned
- whether approval is required

The policy should not hide important behavior in prompt text. It should not depend on the model "remembering" safety instructions. It should not require every developer to invent their own access language.

The model can decide how to solve a task. The policy decides which actions are allowed.

Those are different jobs.

## Where Open Policy Agent and Cedar fit

Open Agent Policy is the agent authorization framework.

Open Policy Agent, or OPA, is a general-purpose policy engine. Cedar is another policy language and engine designed for authorization.

OAP can use its own baseline evaluator, and it can also connect to policy engines like OPA or Cedar.

The simple way to think about it:

- OAP defines the agent access question and the request/decision shape.
- A policy backend helps evaluate the rules.
- The resource still validates the grant before serving data.

This keeps the architecture flexible. Teams that already use OPA should not have to abandon it. Teams experimenting locally should not need a full policy stack just to start.

## The reader-friendly mental model

If you are new to OAP, do not start with schemas.

Start with four questions:

1. Which agent is acting?
2. Who or what caused the agent to act?
3. What action is the agent trying to perform?
4. Which resource will be affected?

Then ask:

> Should this be allowed, denied, constrained, or sent for approval?

That is the heart of policy for agents.

Everything else in OAP exists to make that answer trustworthy: identity proof, sessions, grants, resource validation, audit, and integrations.

The next post covers the most important enforcement piece: why the resource API needs a grant, not just the agent's word.
