---
title: "The Modular Monolith: A Staff Engineer's Complete Guide"
description: "How to build a monolith that scales — to 100 engineers and 10M users — without prematurely jumping to microservices. Module boundaries, enforcement, and the Shopify playbook."
date: Mon May 04 2026 05:30:00 GMT+0530 (India Standard Time)
lastModified: Mon May 04 2026 05:30:00 GMT+0530 (India Standard Time)
series: "Architecture Patterns Deep Dive"
order: 3
category: "Application"
tags:
  - modular-monolith
  - software-architecture
  - bounded-context
  - microservices-alternative
  - staff-engineer-prep
difficulty: "advanced"
readingTime: 24
sidebar:
  order: 3
---
## 1. Overview

For a decade, "modular monolith" was the architecture nobody talked about. Microservices were on every conference slide. Then in 2019, Shopify gave a talk explaining how their billion-dollar Rails codebase was *not* being broken into microservices — it was being broken into **modules within a single deployable**, with strict boundaries enforced by tooling. The talk reframed the conversation. Suddenly "modular monolith" was the respectable middle path between layered spaghetti and a microservices fleet.

A modular monolith is exactly what it sounds like: **one deployable, multiple internal modules**, each owning a bounded context and exposing a narrow public API to the rest of the system. Inside a module, do what you want. Across module boundaries, only the published interface is allowed. The compiler — or a linter, or a test — enforces this.

Compared to microservices, you keep one repo, one deploy, one DB connection, one Kubernetes manifest. Compared to a layered monolith, you get domain isolation, parallel team work, and a credible path to extraction *if* a module ever genuinely needs its own runtime.

By 2026 the modular monolith is the recommended starting point for most product teams under 50 engineers. Microservices remain right when you have organizational, scaling, or technology-diversity reasons that a single deployable can't satisfy.

By the end of this guide you'll know:

- What a "module" actually is — and what makes it different from a folder
- The four strategies for enforcing module boundaries
- How modules communicate (sync vs async, in-process events)
- When and how to extract a module into a service without rewriting it
- The Shopify and Amazon Prime Video playbooks (yes, Prime Video famously *re-merged* into a monolith)

---

## 2. Core Concepts

### The Mental Model

Imagine your codebase as a city. A **layered monolith** is a city with no zoning — every building can connect to every other building, and over time everything tangles. A **microservices fleet** is a set of independent towns connected by highways (the network), each with its own utilities. A **modular monolith** is a single city with strict zoning: residential, commercial, industrial. Roads connect them, but the rules say which buildings can sit next to which, and what kinds of doors must be on each border.

The buildings inside a zone can change freely. Crossing a zone requires a passport — a published API.

```
┌──────────────────────────────────────────────────────────────┐
│                        MONOLITH PROCESS                      │
│                                                              │
│  ┌───────────┐    ┌───────────┐    ┌────────────┐            │
│  │  catalog  │───►│  pricing  │    │  shipping  │            │
│  │  module   │    │  module   │◄───│  module    │            │
│  └─────┬─────┘    └─────┬─────┘    └──────┬─────┘            │
│        │                │                 │                  │
│        ▼                ▼                 ▼                  │
│  ┌──────────────────────────────────────────────────┐        │
│  │  shared kernel (auth, logging, IDs, config)      │        │
│  └──────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │   PostgreSQL   │   ← schemas per module: catalog, pricing, shipping
              └────────────────┘
```

*One process, multiple modules with explicit cross-module APIs. The DB has one host but separate schemas — a small step that prevents the "shared database" anti-pattern from creeping back in.*

### What Counts as a "Module"

A module is **not** just a folder. A module has:

1. **A bounded context** — one well-defined area of the business (e.g., catalog, billing, fulfillment).
2. **A published API** — exported types and functions that other modules may call.
3. **Private internals** — types, queries, and logic that other modules *cannot* touch.
4. **Owned data** — its own DB schema, tables, or at minimum its own repositories.
5. **Boundary enforcement** — a mechanism (compiler, linter, architecture test) that fails the build when another module reaches inside.

If you don't have all five, you have a folder, not a module.

### The Four Enforcement Strategies

| Strategy                | How it works                                                | Strength | Languages where it shines |
| ----------------------- | ----------------------------------------------------------- | -------- | ------------------------- |
| **Compiler-enforced**   | Use language visibility (Java packages, Go internal, Rust mod). | Strongest | Java, Go (`internal/`), Rust |
| **Linter / arch test**  | Run `go-arch-lint`, ArchUnit, `dependency-cruiser` in CI.   | Strong (if CI is mandatory) | All |
| **Code review**         | Reviewers reject cross-module reaches.                      | Weakest — humans get tired | All |
| **Separate packages / build artifacts** | Each module is a separately versioned package. | Very strong, but adds friction | All |

> 💡 **Staff-level insight:** Go's `internal/` directory is one of the most under-appreciated language features for modular monoliths. `module/internal/whatever` is invisible to anything outside `module/`. The compiler enforces the boundary — no linter, no review, no willpower required. For Go modular monoliths this should be your default.

### A Go Modular Monolith Layout

```
shop/
├── cmd/
│   └── server/main.go                  ← composition root
├── modules/
│   ├── catalog/
│   │   ├── api.go                      ← PUBLIC: types and functions other modules may use
│   │   ├── module.go                   ← module wiring (constructors)
│   │   └── internal/                   ← PRIVATE: compiler-enforced
│   │       ├── domain/
│   │       ├── postgres/
│   │       └── http/
│   ├── pricing/
│   │   ├── api.go
│   │   ├── module.go
│   │   └── internal/...
│   └── shipping/
│       ├── api.go
│       ├── module.go
│       └── internal/...
├── shared/                             ← shared kernel: auth, logging, ids, config
│   ├── auth/
│   └── obs/
└── go.mod
```

**Catalog's public API:**

```go
// modules/catalog/api.go
package catalog

import "context"

// PUBLIC — other modules import this.
type Product struct {
    SKU   string
    Name  string
    Price int64
}

type Service interface {
    Lookup(ctx context.Context, sku string) (*Product, error)
}
```

**Catalog's internal implementation — invisible outside the module:**

```go
// modules/catalog/internal/postgres/repo.go
package pgrepo

// This package can ONLY be imported by code inside modules/catalog/
// because of Go's `internal/` rule. Compiler-enforced boundary.
```

**Module wiring:**

```go
// modules/catalog/module.go
package catalog

import (
    "database/sql"

    pgrepo "example.com/shop/modules/catalog/internal/postgres"
    catalogsvc "example.com/shop/modules/catalog/internal/service"
)

func NewService(db *sql.DB) Service {
    return catalogsvc.New(pgrepo.New(db))
}
```

**Composition root:**

```go
// cmd/server/main.go
package main

import (
    "database/sql"

    "example.com/shop/modules/catalog"
    "example.com/shop/modules/pricing"
    "example.com/shop/modules/shipping"
)

func main() {
    db, _ := sql.Open("postgres", "...")

    catalogSvc := catalog.NewService(db)
    pricingSvc := pricing.NewService(db, catalogSvc) // pricing depends on catalog's PUBLIC API
    shippingSvc := shipping.NewService(db)

    _, _, _ = catalogSvc, pricingSvc, shippingSvc
    // start HTTP server, register module routes, etc.
}
```

The pricing module imports `catalog` — but only the public package, never `catalog/internal/...`. The Go compiler will refuse to build any cross-module reach into internals. That single constraint, applied consistently, is most of the value of a modular monolith.

### How Modules Communicate

Three patterns, in order of preference:

**1. Direct synchronous calls via public API.** The default. Function calls, in-process. Fast, type-safe, transactional. Use when modules are tightly coupled (`pricing` calling `catalog.Lookup`).

**2. In-process domain events.** A module emits an event; other modules subscribe. Decouples producer from consumer. Useful for cross-cutting concerns (e.g., `OrderPlaced` triggering inventory and email modules). Implement with a simple in-memory event bus; later swap for Kafka without changing the producer.

**3. Asynchronous messages via a real broker.** When you genuinely need durability, retries, or fan-out outside the process. Usually a sign that the module wants to become a service.

```go
// shared/eventbus/bus.go — a tiny in-process event bus
type Event interface{ Name() string }
type Handler func(Event)

type Bus struct {
    mu       sync.RWMutex
    handlers map[string][]Handler
}

func (b *Bus) Subscribe(name string, h Handler) { /* ... */ }
func (b *Bus) Publish(e Event)                  { /* ... */ }
```

Starting with sync calls and an in-process event bus, then upgrading to a real broker only when needed, is the canonical evolution path.

---

## 3. Use Cases

### When the Modular Monolith Fits

**1. Mid-size product teams (5–50 engineers).** Big enough to feel the pain of layered spaghetti, too small to absorb the operational cost of microservices.

**2. Domain-rich products with clear sub-domains.** E-commerce, ERP, financial back-office — anywhere you can name the bounded contexts on a whiteboard in five minutes.

**3. Pre-product-market-fit startups.** Microservices punish you for changing your boundaries. Modules let you redraw lines cheaply (it's just a refactor in one repo).

**4. Teams that have been *burned* by microservices.** The "we adopted microservices and our velocity dropped 40%" pattern is real. A modular monolith is often the right rollback.

### Real-World Examples

**Shopify.** Their monolith ("Shopify Core") is famously a modular Rails application using their open-source [Packwerk](https://github.com/Shopify/packwerk) tool to enforce boundaries. They scaled it past 1M+ stores and Black Friday traffic without breaking it apart wholesale.

**Amazon Prime Video (2023).** Publicly described moving a microservices-based video-monitoring system *back* into a monolith, citing 90% cost reduction and better scaling characteristics. The "monolith first" rebuttal everyone references.

**GitHub.** Rails monolith for over a decade, increasingly modularized internally. They've publicly discussed extracting a few services (Actions, search) but the core remains a modular monolith.

**Basecamp / HEY (37signals).** Famously monolithic, deeply modular, openly opinionated about it. DHH's "majestic monolith" essay is the original modern manifesto.

---

## 4. Gotchas

### Modules Without Enforcement Are Folders

A modular monolith with no boundary enforcement degrades into a layered monolith within months. The first time someone reaches into another module's internals "just for one query," the contract is dead. Either use compiler-level enforcement (Go `internal/`, Java packages) or wire a linter into CI as a *blocking* check.

### Shared Database, Different Failure

Even with strict module boundaries in code, sharing a database with a single schema lets modules read each other's tables — and breaks the contract invisibly. Use **schema-per-module** (`catalog.products`, `pricing.price_lists`) and revoke cross-schema permissions if you can. This is the single highest-leverage practice in modular monoliths.

### The "God Module"

One module — usually `users`, `accounts`, or `orders` — becomes a dependency for every other module. Changes to it require coordination with the entire team. Diagnose this with a dependency graph; if one module has > 70% of the inbound edges, it's likely doing too much. Split it by sub-context (auth, profile, preferences).

### Cross-Module Transactions

A use case spans three modules and needs them to commit atomically. In a monolith, you *can* use a single DB transaction across modules — but doing so couples them at the storage layer. Two paths:

- **Same DB transaction**, accepting the coupling: fine for tightly related modules.
- **Per-module transactions + saga or outbox** for eventual consistency: necessary if you ever want to extract one module into a service. See [../../design-patterns/distributed/saga.md](../../design-patterns/distributed/saga.md).

> 💡 **Staff-level insight:** Treat a modular monolith as **microservices with the network removed**. Every cross-module call should be designed as if it were a network call — no shared mutable state, idempotent operations, explicit error handling. Then "extract this module into a service" becomes a deployment change, not a redesign.

### Shared Kernel Bloat

The `shared/` package fills up with utilities that "everyone needs." Eventually it imports almost everything and is imported by everything — a god module by another name. Keep `shared/` ruthlessly small: cross-cutting concerns only (logging, IDs, auth context), no business logic.

### Boundary Drift Over Time

Domains evolve. The `catalog` module of year 1 is not the right shape in year 3 — maybe pricing absorbs catalog's variant logic, maybe inventory deserves its own module. Schedule **boundary reviews** (quarterly is plenty). The cost of moving a boundary in a monolith is a refactor; in microservices it's a months-long migration.

### Build Times and Test Suites

Monoliths grow large; build and test times grow with them. Mitigations: per-module test packages, parallel test execution, build caching (Bazel, Nx, `go test` package caching). Shopify's monolith uses extensive test sharding to keep CI under 20 minutes despite millions of lines.

---

## 5. Where to Use (and Where NOT to Use)

### Use it when

- You have a real domain (multiple bounded contexts) but a single team or small org.
- You want microservices' organizational benefits without the operational cost.
- You can articulate the modules on a whiteboard before writing code.
- You can enforce boundaries with tooling, not just review.

### Don't use it when

- You truly need independent deployability per sub-domain (regulatory, scaling, or rollout reasons).
- Different sub-domains must be written in genuinely different languages.
- The system is small enough that even modules are overkill — a flat layered layout is fine.
- The team is large enough (> ~100 engineers contributing to one repo) that the deployment becomes a coordination bottleneck even with modules.

---

## 6. Versus (Comparisons)

| Aspect                     | Modular Monolith                        | Microservices                          | Layered Monolith                |
| -------------------------- | --------------------------------------- | -------------------------------------- | ------------------------------- |
| Deployable units           | 1                                       | N (one per service)                    | 1                               |
| Team independence          | Medium (shared deploy)                  | High                                   | Low                             |
| Operational complexity     | Low                                     | High (k8s, mesh, observability)        | Low                             |
| Cross-module communication | Function calls / in-process events      | Network calls (gRPC, REST, Kafka)      | Function calls (often unrestricted) |
| Data consistency           | Easy (single DB possible)               | Hard (eventual consistency, sagas)     | Easy                            |
| Refactoring boundaries     | Cheap (it's a refactor)                 | Expensive (months-long migration)      | Cheap but rarely happens        |
| Tech stack diversity       | Single language/runtime                 | Polyglot                               | Single language/runtime         |
| Failure isolation          | Process-level only                      | Per-service                            | Process-level only              |
| Best fit                   | Mid-size product, multi-bounded-context | Large org, scale-out, polyglot needs   | Small CRUD app, single domain   |

**Choose modular monolith** when you're between layered (too tangled) and microservices (too operationally expensive).
**Choose microservices** when you have organizational scale that the monolith cannot serve, or when sub-systems have genuinely different scaling/availability profiles.
**Choose layered** when the system is small and the domain is simple.

See: [layered-architecture.md](./layered-architecture.md), [../integration/microservices.md](../integration/microservices.md), [../deployment/monolith-vs-microservices.md](../deployment/monolith-vs-microservices.md).

---

## 7. References

- [Shopify — Deconstructing the Monolith (Kirsten Westeinde, 2019)](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity).
- [Shopify Packwerk](https://github.com/Shopify/packwerk) — Ruby tool for enforcing modular boundaries.
- [Amazon Prime Video — Scaling our audio/video monitoring service (2023)](https://www.primevideotech.com/video-streaming/scaling-up-the-prime-video-audio-video-monitoring-service-and-reducing-costs-by-90).
- *Building Modular Monoliths* — Simon Brown (talks and InfoQ articles).
- *Monolith to Microservices* — Sam Newman. Despite the title, the early chapters are a strong defense of the modular monolith as the *correct starting point*.
- [DHH — The Majestic Monolith](https://signalvnoise.com/svn3/the-majestic-monolith/).
- [go-arch-lint](https://github.com/fe3dback/go-arch-lint) — boundary linter for Go.

---

## 8. Interview Questions

**Q1. "When would you recommend a modular monolith over microservices?"**

Strong answer: a small-to-mid org with a real domain (multiple bounded contexts) but no scaling, regulatory, or polyglot reason to incur per-service operational cost. Reference the Prime Video case as the cautionary tale, and emphasize that you can always extract a module later if the constraints change.

Common mistake: framing it as "monoliths are easier so always start there." That's true-ish but not nuanced; a Staff candidate should articulate the *specific* signals that justify the choice.

**Q2. "How do you enforce module boundaries?"**

Cover the four mechanisms (compiler, linter, review, separate packages) and recommend compiler-level when the language allows it (Go `internal/`, Java package-private, Rust modules). Mention that boundaries enforced only by review will degrade. Bonus: schema-per-module to extend enforcement to the database.

**Q3. "How would you extract a module from a modular monolith into a service?"**

Phased: (1) ensure the module already communicates only via its public API (no DB cross-reads). (2) Replace the in-process API with an HTTP/gRPC client that has the *same interface*. (3) Run the module both in-process and as a separate service behind a feature flag (strangler fig). (4) Migrate traffic gradually. (5) Remove the in-process implementation.

What interviewers want: incremental, reversible, traffic-driven migration — not a "big bang."

**Q4. "What's a 'God module' and how do you fix it?"**

A module that nearly every other module depends on, becoming a coordination bottleneck. Fix by sub-context analysis: split `users` into `auth`, `profile`, `preferences`. Use a dependency graph to find inbound-edge concentration. Mention Conway's Law — God modules often mirror a centralized team.

**Q5. "How do transactions work across modules in a monolith?"**

You *can* span a single DB transaction across modules in a monolith — but doing so couples them. The Staff answer: prefer per-module transactions + saga or outbox even within a monolith, so extracting a module later is a deployment change rather than a redesign.

---

## 9. Staff-Level Preparation Tips

**Practice drawing the boundaries.** Take a familiar product (your last job, or a public one like Stripe, Notion, Shopify). Sketch the bounded contexts in 5 minutes. This is the core Staff skill: rapidly identifying domain seams. If you can't do it for a system, you can't modularize it.

**Build one in your language of choice.** Pick e-commerce or a multi-tenant SaaS. Implement at least three modules with strict boundaries enforced by tooling. Wire an in-process event bus. Add a fake "extract this module" exercise: replace one in-process call with an HTTP call without changing the consumer.

**Read the Shopify, Prime Video, and DHH essays in full.** All three are short and make the case from real production scars. Be able to summarize each in 90 seconds during a design discussion.

**Connect to broader themes.** Modular monolith is the architectural manifestation of [bounded contexts](https://martinfowler.com/bliki/BoundedContext.html) and [Conway's Law](https://en.wikipedia.org/wiki/Conway%27s_law). It's also the right *first step* of most microservices adoptions — you cannot extract a clean service from a tangled codebase.

**Know the failure modes by name.** "God module," "shared kernel bloat," "boundary drift," "shared database leak." Naming them in a design review signals senior judgment.

---

> Related reading in this workspace:
> - [layered-architecture.md](./layered-architecture.md)
> - [hexagonal-architecture.md](./hexagonal-architecture.md)
> - [../integration/microservices.md](../integration/microservices.md)
> - [../deployment/monolith-vs-microservices.md](../deployment/monolith-vs-microservices.md)
> - [../../design-patterns/distributed/strangler-fig.md](../../design-patterns/distributed/strangler-fig.md)
> - [../../design-patterns/distributed/saga.md](../../design-patterns/distributed/saga.md)
