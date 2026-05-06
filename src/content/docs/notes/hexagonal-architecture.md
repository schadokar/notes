---
title: "Hexagonal Architecture (Ports & Adapters): A Staff Engineer's Complete Guide"
description: "Deep dive into Hexagonal Architecture — Alistair Cockburn's Ports & Adapters pattern. How to isolate domain logic from infrastructure, when it's worth the ceremony, and how to apply it idiomatically in Go."
date: Mon May 04 2026 05:30:00 GMT+0530 (India Standard Time)
lastModified: Mon May 04 2026 05:30:00 GMT+0530 (India Standard Time)
series: "Architecture Patterns Deep Dive"
order: 2
category: "Application"
tags:
  - hexagonal-architecture
  - ports-and-adapters
  - clean-architecture
  - domain-driven-design
  - staff-engineer-prep
difficulty: "advanced"
readingTime: 26
sidebar:
  order: 2
---
## 1. Overview

In 2005, Alistair Cockburn published a short article titled *"Hexagonal Architecture"* — also known as **Ports and Adapters**. The motivation was deeply practical: he kept seeing applications where business logic was so tangled with the database, the UI, and the message broker that you couldn't test the logic without spinning up half the world.

His proposal was simple. Put the **domain at the center**. Define **ports** (interfaces) that describe what the domain needs from the outside world, or what the outside world can ask of the domain. Plug **adapters** (concrete implementations) into those ports — one for HTTP, one for Postgres, one for Kafka, one for tests. The domain has no idea which adapters are connected.

The hexagon shape is incidental — Cockburn just wanted a symmetric polygon that made it visually obvious there's no privileged "top" or "bottom." There's only **inside (domain)** and **outside (infrastructure)**, with ports as the contract between them.

By 2026, hexagonal has become the de-facto choice for **domain-rich, long-lived services** — payment systems, billing, inventory, fraud detection. It's also routinely over-applied to CRUD apps that would have been better off layered. Knowing when each is right is the Staff-level discriminator.

By the end of this guide you'll know:

- The exact difference between a port and an adapter (most engineers get this wrong)
- Driving vs driven ports — and why the asymmetry matters
- How hexagonal differs from layered, clean, and onion architectures
- A complete Go implementation, including how to wire adapters at startup
- The real costs (test boilerplate, indirection) and when they're not worth paying

---

## 2. Core Concepts

### The Mental Model

Picture a hexagon. Inside it: your domain — pure logic, pure data, zero imports of anything HTTP, SQL, or Kafka. On the edges of the hexagon: **ports**, which are interfaces. Outside the hexagon: **adapters**, which implement (or call) those interfaces.

```
                ┌──────────────────────────────┐
                │        HTTP Adapter          │
                │  (driving — calls the app)   │
                └─────────────┬────────────────┘
                              │ port: OrderUseCase
                              ▼
       ┌──────────────────────────────────────────┐
       │                                          │
       │               DOMAIN CORE                │
       │   entities, use cases, domain services   │
       │   (no imports of HTTP / SQL / Kafka)     │
       │                                          │
       └──┬───────────────────┬───────────────────┘
          │ port: OrderRepo    │ port: EventPublisher
          ▼                    ▼
   ┌──────────────┐    ┌──────────────────┐
   │ Postgres     │    │ Kafka adapter    │
   │ adapter      │    │ (driven)         │
   │ (driven)     │    └──────────────────┘
   └──────────────┘
```

*Driving adapters call the domain. Driven adapters are called by the domain. The domain depends only on its ports — never on adapters.*

### Ports vs Adapters

A **port** is an interface defined *by* the domain, *for* the domain's needs.
An **adapter** is a concrete implementation of (or caller of) that interface, living in the infrastructure layer.

That sentence is the entire pattern. Most violations come from putting ports *outside* the domain, which inverts the dependency and quietly turns hexagonal back into layered.

### Driving vs Driven Ports

Cockburn distinguishes two kinds of ports:

| Port type   | Direction        | Examples                                            |
| ----------- | ---------------- | --------------------------------------------------- |
| **Driving** | Outside → Domain | HTTP handler, gRPC server, CLI, message consumer    |
| **Driven**  | Domain → Outside | Repository, event publisher, email sender, payment gateway |

Driving ports answer "how do you call my use cases?" Driven ports answer "what does my use case need from the world?" Both are interfaces in the domain package, but they serve different roles.

> 💡 **Staff-level insight:** A frequent mistake is making the HTTP handler the "port." It isn't — the **use case interface** is the port; the HTTP handler is a driving adapter that *calls* the port. If you swap HTTP for a CLI tomorrow, the port stays; only the adapter changes.

### Dependency Inversion Is the Whole Point

Hexagonal is essentially the **Dependency Inversion Principle** applied at architectural scope. The domain defines abstractions; infrastructure conforms to them. You never see `import "database/sql"` in a domain file — that would mean the domain depends on infrastructure, which is the bug hexagonal exists to prevent.

### A Complete Go Example

Project layout:

```
order-service/
├── cmd/
│   └── server/main.go              ← composition root: wires adapters into ports
├── internal/
│   ├── domain/                     ← INSIDE the hexagon
│   │   ├── order.go                ← entity + invariants
│   │   ├── ports.go                ← driving + driven port interfaces
│   │   └── service.go              ← use cases (PlaceOrder, CancelOrder)
│   └── adapters/                   ← OUTSIDE the hexagon
│       ├── http/handler.go         ← driving adapter
│       ├── postgres/order_repo.go  ← driven adapter
│       └── kafka/publisher.go      ← driven adapter
└── go.mod
```

**Domain ports:**

```go
// internal/domain/ports.go
package domain

import "context"

// Driving port: how the outside world invokes our use cases.
type OrderUseCase interface {
    Place(ctx context.Context, userID string, items []Item) (OrderID, error)
    Cancel(ctx context.Context, id OrderID) error
}

// Driven port: what the domain needs from persistence.
type OrderRepository interface {
    Save(ctx context.Context, o *Order) error
    FindByID(ctx context.Context, id OrderID) (*Order, error)
}

// Driven port: what the domain needs to announce.
type EventPublisher interface {
    Publish(ctx context.Context, event DomainEvent) error
}
```

**Domain entity (notice: no imports of `sql`, `http`, or `kafka`):**

```go
// internal/domain/order.go
package domain

import (
    "errors"
    "time"
)

type OrderID string

type Order struct {
    ID        OrderID
    UserID    string
    Items     []Item
    Total     int64
    Status    string
    CreatedAt time.Time
}

func NewOrder(userID string, items []Item) (*Order, error) {
    if len(items) == 0 {
        return nil, errors.New("order must have at least one item")
    }
    var total int64
    for _, it := range items {
        total += it.PriceCents * int64(it.Qty)
    }
    return &Order{
        UserID:    userID,
        Items:     items,
        Total:     total,
        Status:    "pending",
        CreatedAt: time.Now(),
    }, nil
}

func (o *Order) Cancel() error {
    if o.Status == "shipped" {
        return errors.New("cannot cancel shipped order")
    }
    o.Status = "cancelled"
    return nil
}
```

**Domain service (use cases) — implements the driving port:**

```go
// internal/domain/service.go
package domain

import "context"

type orderService struct {
    repo      OrderRepository
    publisher EventPublisher
}

func NewOrderService(r OrderRepository, p EventPublisher) OrderUseCase {
    return &orderService{repo: r, publisher: p}
}

func (s *orderService) Place(ctx context.Context, userID string, items []Item) (OrderID, error) {
    order, err := NewOrder(userID, items)
    if err != nil {
        return "", err
    }
    if err := s.repo.Save(ctx, order); err != nil {
        return "", err
    }
    _ = s.publisher.Publish(ctx, DomainEvent{Type: "OrderPlaced", OrderID: order.ID})
    return order.ID, nil
}

func (s *orderService) Cancel(ctx context.Context, id OrderID) error {
    o, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return err
    }
    if err := o.Cancel(); err != nil {
        return err
    }
    return s.repo.Save(ctx, o)
}
```

**Driving adapter (HTTP):**

```go
// internal/adapters/http/handler.go
package httpadapter

import (
    "encoding/json"
    "net/http"

    "example.com/order-service/internal/domain"
)

type Handler struct{ uc domain.OrderUseCase } // depends on the PORT, not on the service struct

func NewHandler(uc domain.OrderUseCase) *Handler { return &Handler{uc: uc} }

func (h *Handler) Place(w http.ResponseWriter, r *http.Request) {
    var req struct {
        UserID string         `json:"userId"`
        Items  []domain.Item  `json:"items"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), 400)
        return
    }
    id, err := h.uc.Place(r.Context(), req.UserID, req.Items)
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }
    json.NewEncoder(w).Encode(map[string]any{"orderId": id})
}
```

**Driven adapter (Postgres):**

```go
// internal/adapters/postgres/order_repo.go
package pgadapter

import (
    "context"
    "database/sql"

    "example.com/order-service/internal/domain"
)

type OrderRepo struct{ db *sql.DB }

func New(db *sql.DB) *OrderRepo { return &OrderRepo{db: db} }

func (r *OrderRepo) Save(ctx context.Context, o *domain.Order) error {
    _, err := r.db.ExecContext(ctx,
        `INSERT INTO orders (id, user_id, total, status) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
        o.ID, o.UserID, o.Total, o.Status,
    )
    return err
}

func (r *OrderRepo) FindByID(ctx context.Context, id domain.OrderID) (*domain.Order, error) {
    // ... boilerplate omitted
    return nil, nil
}
```

**Composition root (where adapters get plugged in):**

```go
// cmd/server/main.go
package main

import (
    "database/sql"
    "net/http"

    httpadapter "example.com/order-service/internal/adapters/http"
    kafkaadapter "example.com/order-service/internal/adapters/kafka"
    pgadapter "example.com/order-service/internal/adapters/postgres"
    "example.com/order-service/internal/domain"
)

func main() {
    db, _ := sql.Open("postgres", "...")
    repo := pgadapter.New(db)
    pub := kafkaadapter.New("orders.events")

    uc := domain.NewOrderService(repo, pub) // wire driven adapters into the domain
    handler := httpadapter.NewHandler(uc)   // wire the driving adapter

    http.HandleFunc("/orders", handler.Place)
    _ = http.ListenAndServe(":8080", nil)
}
```

The `cmd/server/main.go` file is the **composition root** — the *only* place where the choice of adapters becomes concrete. Swap Postgres for DynamoDB? Change one line. Want to test the use case with in-memory fakes? You don't even need Postgres installed.

---

## 3. Use Cases

### When Hexagonal Genuinely Pays Off

**1. Long-lived domain-rich services.** Billing, fraud, pricing, inventory, scheduling. Anywhere the rules outlive the database choice.

**2. Services with multiple delivery channels.** The same `PlaceOrder` use case must be callable from HTTP, gRPC, a CLI, and a Kafka consumer. Hexagonal makes this trivial — four driving adapters, one use case.

**3. Heavy testing requirements.** Domain logic can be unit-tested with in-memory fakes, no Postgres container, no testcontainers. Test suites run in seconds, not minutes.

**4. Volatile infrastructure.** Migrating Postgres → CockroachDB, RabbitMQ → Kafka, on-prem → cloud. Hexagonal makes these changes adapter-local.

### Real-World Examples

**Stripe.** Their internal services are famously port/adapter-shaped. Domain logic for charging, refunds, payouts is decoupled from the underlying card-network adapters (Visa/Mastercard/etc.) and from the persistence layer. New networks are added as new adapters without touching domain code.

**Spotify (backend).** Many of their backend services follow a hexagonal-ish layout, with strict separation between domain and infrastructure to support polyglot persistence (Cassandra, Postgres, BigTable depending on the service).

**Netflix Conductor / Temporal-style workflow engines.** The workflow engine is the domain; the worker tasks, persistence, and queue plug in as adapters.

---

## 4. Gotchas

### Anemic Hexagonal: All the Ceremony, None of the Benefit

If your `OrderService.Place()` is `repo.Save(NewOrder(...))` and that's it, hexagonal is pure overhead. You've added two interfaces, a composition root, and an adapter package — for a use case that didn't need any of it. Hexagonal pays for itself only when the domain has logic worth protecting.

### Leaky Domain Types

The moment your domain uses `sql.NullString`, `kafka.Message`, or `*http.Request`, the hexagon is broken. Domain types must be infrastructure-free. This requires discipline: write **mappers** in adapters that translate between infrastructure types and domain types.

```go
// pgadapter/mapping.go
func toDomain(row dbOrderRow) *domain.Order { /* ... */ }
func fromDomain(o *domain.Order) dbOrderRow  { /* ... */ }
```

The cost of mapping is real. Pay it consciously.

### Repository Interfaces with 47 Methods

A common smell: `OrderRepository` grows to include `FindByUser`, `FindByDate`, `FindByStatus`, `FindByDateAndStatus`, etc. The interface becomes a mirror of the database, defeating the abstraction.

The fix: **split interfaces by use case** (Interface Segregation Principle). `PlaceOrderRepo`, `CancelOrderRepo`, `OrderQueryRepo` — each tiny, each implemented by the same Postgres adapter struct. Hexagonal aligns naturally with [SOLID](../../solid-principles-for-go-developers.md).

### Forgetting Transactions

Transactions span multiple repository calls but live conceptually in the domain (use case). Naive hexagonal makes this awkward — you don't want a `*sql.Tx` in your domain code.

Solutions:
- **Unit-of-Work pattern**: a domain interface that wraps "do these repository calls atomically."
- **Outbox pattern**: write events into the same DB transaction as state changes; a separate process publishes them. See [../../design-patterns/distributed/outbox-pattern.md](../../design-patterns/distributed/outbox-pattern.md).

> 💡 **Staff-level insight:** Whenever you say "the domain needs a transaction," stop and ask whether you actually need a *consistency boundary* (which is a domain concept) or a *DB transaction* (which is infrastructure). They overlap, but they're not the same. Aggregate roots in DDD exist to make this explicit.

### Performance: Indirection Has a Cost

Every domain call goes through an interface dispatch. In Go, that's a vtable lookup — measurable in microbenchmarks, irrelevant in real systems unless you're in a tight loop. But layering many interfaces deep can make profiling and stack traces harder. Don't add a port unless you have at least two real adapters in mind (one of which can be "the test fake").

### Over-modeling

DDD-flavored hexagonal can devolve into a swarm of `Aggregate`, `ValueObject`, `DomainService`, `Specification`, `Factory` types for a domain that has three rules. The pattern is a tool, not a religion. Strip the ceremony to what the domain actually demands.

---

## 5. Where to Use (and Where NOT to Use)

### Use it when

- The domain has rich, evolving rules.
- The same use cases must be exposed via multiple delivery mechanisms.
- You expect infrastructure to change at least once during the system's lifetime.
- Fast, infrastructure-free unit tests are a hard requirement.

### Don't use it when

- The "domain" is essentially a thin wrapper over CRUD.
- The team is small and junior; the indirection will confuse more than it helps.
- The service is genuinely throwaway (POC, MVP, internal one-off tool).
- You're tempted to use it because it's fashionable — that's never enough reason.

---

## 6. Versus (Comparisons)

| Aspect                 | Hexagonal (Ports & Adapters)        | Clean Architecture                 | Onion Architecture                 | Layered                                |
| ---------------------- | ----------------------------------- | ---------------------------------- | ---------------------------------- | -------------------------------------- |
| Origin                 | Cockburn, 2005                      | Robert C. Martin, 2012             | Jeffrey Palermo, 2008              | 1990s n-tier tradition                 |
| Organizing principle   | Inside vs outside via ports         | Concentric rings, dependency rule  | Concentric rings around domain     | Horizontal layers                      |
| Number of "layers"     | 2 (domain + infra) + ports          | 4+ (entities, use cases, adapters, frameworks) | 3+ rings              | 3–4 layers                             |
| Treats UI/DB as        | Adapters (peers)                    | Outermost ring                     | Outermost ring                     | Top and bottom layers                  |
| Testability of domain  | Excellent                           | Excellent                          | Excellent                          | Medium                                 |
| Risk of over-engineering | High in CRUD apps                 | Highest                            | High                               | Low                                    |

In practice, **hexagonal, clean, and onion are 90% the same idea** with different vocabularies. The differences are mostly aesthetic: clean adds explicit "use case" and "entity" rings; onion adds a "domain services" ring; hexagonal collapses everything outside the domain into "adapters." Pick one vocabulary and stick to it.

**Choose hexagonal** when you want the simplest articulation of the dependency-inversion idea.
**Choose clean** when you want to be explicit about use-case boundaries as a separate ring.
**Choose onion** when you want stronger DDD vocabulary (domain services, application services).
**Choose layered** when the domain doesn't deserve a hexagon. (See [layered-architecture.md](./layered-architecture.md).)

---

## 7. References

- [Alistair Cockburn — Hexagonal Architecture (original article)](https://alistair.cockburn.us/hexagonal-architecture/).
- *Clean Architecture* — Robert C. Martin (2017). Different vocabulary, same core idea.
- *Implementing Domain-Driven Design* — Vaughn Vernon. Hexagonal pairs naturally with strategic DDD.
- [Netflix Tech Blog — Ready For Changes With Hexagonal Architecture](https://netflixtechblog.com/ready-for-changes-with-hexagonal-architecture-b315ec967749).
- [GitHub — `manuelkiessling/hexagonal-architecture`](https://github.com/manuelkiessling) — example projects.
- *Get Your Hands Dirty on Clean Architecture* — Tom Hombergs. Practical, code-heavy walkthrough.

---

## 8. Interview Questions

**Q1. "Explain hexagonal architecture in two minutes."**

The domain sits at the center with no infrastructure dependencies. It defines two kinds of ports: driving (how the world calls the domain) and driven (what the domain needs from the world). Adapters implement or call those ports. Strong answers explicitly contrast it with layered ("layered has a top and a bottom; hexagonal has only inside and outside") and mention the composition root.

**Q2. "Where would you put a database transaction in a hexagonal codebase?"**

This is the killer question. Strong answer: introduce a **Unit-of-Work** port in the domain that wraps a use-case execution; the Postgres adapter implements it as a `sql.Tx`. Or, if events are involved, use the **outbox pattern** so the transaction stays inside the repository adapter and the use case never needs to know about transactions.

Common mistake: passing `*sql.Tx` into the domain — that's a leak that defeats the architecture.

**Q3. "Hexagonal vs clean vs onion — what's the real difference?"**

Mostly vocabulary. All three apply dependency inversion at architectural scope, all put domain at the center, all treat infrastructure as pluggable. Clean is more prescriptive (entities/use cases/adapters/frameworks rings). Onion adds explicit DDD vocabulary. Hexagonal is the simplest. A Staff candidate should refuse to be tribal about which is "best."

**Q4. "When is hexagonal the wrong choice?"**

Pure CRUD apps, throwaway tools, very small teams, services where the domain is genuinely a thin wrapper over a database. The interfaces and mapping cost real engineer time; that cost only pays back when the domain is rich enough to need protection.

**Q5. "How would you migrate a layered codebase to hexagonal?"**

Don't rewrite. (1) Identify the use cases hidden in the service layer. (2) Extract domain entities with no infrastructure imports. (3) Define ports based on what the use cases actually need. (4) Move existing repositories into adapters with mapping. (5) Move composition into a single root. Do it use-case by use-case behind a feature flag if the system is in production.

---

## 9. Staff-Level Preparation Tips

**Build one of each.** Take a small domain (e.g., a URL shortener with rate limiting and analytics). Implement it three times: pure layered, hexagonal, clean. Note the friction points and where each pays off. You'll never confuse the patterns again.

**Master the composition root.** The single most under-discussed concept. Where do adapters get plugged in? In Go: `cmd/server/main.go` or a `wire`/`fx` setup. In Java: a `@Configuration` class. In .NET: `Program.cs` with DI. A Staff engineer can tell you, for any codebase, exactly where the composition root is — and is suspicious of any project that doesn't have one.

**Practice the "swap the database" exercise.** Given a hexagonal codebase, sketch the diff for swapping Postgres → DynamoDB. If the diff touches anything outside `adapters/postgres/` and `cmd/server/main.go`, the architecture isn't really hexagonal.

**Connect to broader themes.** Hexagonal is the architectural expression of [SOLID's Dependency Inversion Principle](../../solid-principles-for-go-developers.md), the [Repository pattern](../../design-patterns/distributed/repository.md), and DDD's "isolate the domain" mandate. Be ready to articulate that lineage in a design review.

**Read the criticism.** Dan North's *"DDD: Putting the Model in Its Place"* and various "hexagonal is overkill" essays. Knowing the strongest critiques is what separates a Staff engineer from a senior who memorized a diagram.

---

> Related reading in this workspace:
> - [layered-architecture.md](./layered-architecture.md)
> - [modular-monolith.md](./modular-monolith.md)
> - [../../solid-principles-for-go-developers.md](../../solid-principles-for-go-developers.md)
> - [../../design-patterns/distributed/repository.md](../../design-patterns/distributed/repository.md)
> - [../../design-patterns/distributed/outbox-pattern.md](../../design-patterns/distributed/outbox-pattern.md)
