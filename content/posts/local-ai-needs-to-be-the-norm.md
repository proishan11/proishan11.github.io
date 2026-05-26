---
title: "Local AI Needs to be the Norm"
subtitle: "Local AI models should be the default."
date: 2025-12-30
author: "Cyrus"
math: false
draft: false
---

One of the current trends in modern software is for developers to slap an API call to OpenAI or Anthropic for features within their app. Reasonable people can quibble with whether those features are actually bringing value to users, but what I want to discuss is the fundamental concept of taking on a dependency to a cloud hosted AI model for applications.

This laziness is creating a generation of software that is fragile, invades your privacy, and fundamentally broken. We are building applications that stop working the moment the server crashes or a credit card expires.

We need to return to a habit of building software where our local devices do the work. The silicon in our pocket is mind bogglingly faster than what was available a decade ago. It has a dedicated Neural Engine sitting there, mostly idle, while we wait for a JSON response from a server farm in Virginia. That's ridiculous.

## Available Tooling

I can only speak on the tooling available within the Apple ecosystem since that's what I focused initial development efforts on. In the last year, Apple has invested heavily here to allow developers to make use of a built-in local AI model easily.

The core flow looks roughly like this:

```swift
import FoundationModels

let model = SystemLanguageModel.default
guard model.availability == .available else { return }

let session = LanguageModelSession {
    """
    Provide a brutalist, information-dense summary in Markdown format.
    - Use **bold** for key concepts.
    - Use bullet points for facts.
    - No fluff. Just facts.
    """
}

let response = try await session.respond(options: .init(maximumResponseTokens: 1_000),
    articleText
)

let markdown = response.content
```

And for longer content, we can chunk the plain text (around 10k characters per chunk), produce concise "facts only" notes per chunk, then runs a second pass to combine them into a final summary.

## Why This Matters

The benefits of local AI are clear:

- **Privacy** — your data never leaves the device
- **Reliability** — no server dependency, no API key expiry
- **Speed** — no network latency, instant responses
- **Cost** — no per-token billing, no usage caps

The tradeoff is model capability. A 3B parameter model on your phone won't match GPT-4. But for the vast majority of use cases — summarization, classification, extraction, rewriting — it's more than enough.

## The Path Forward

We need to stop treating cloud AI as the default and start treating it as the exception. Use local models for everything you can. Fall back to cloud only when the task genuinely requires it.

The tools exist today. The hardware is ready. The only thing missing is the habit.
