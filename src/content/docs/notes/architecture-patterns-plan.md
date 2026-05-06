---
title: "Architecture Patterns — Staff Engineer Series Plan"
description: "Planning document for the Architecture Patterns deep-dive series, covering application, integration, deployment, and data architecture patterns."
date: Mon May 04 2026 05:30:00 GMT+0530 (India Standard Time)
lastModified: Mon May 04 2026 05:30:00 GMT+0530 (India Standard Time)
series: "Architecture Patterns Deep Dive"
difficulty: intermediate
---
This series mirrors the structure of `design-patterns/` but operates one level higher: instead of code-level patterns (GoF, distributed messaging primitives), it covers **system-level architecture patterns** that shape how services, data, and teams are organized.

## 1. Scope & Audience

- **Audience:** Senior → Staff engineers preparing for system-design interviews and real production decisions.
- **Depth:** Same format as `design-patterns/distributed/circuit-breaker.md` — overview, deep dive, trade-offs, when *not* to use, real-world case studies, Go/diagram examples.
- **Length target:** 25–40 min reading time per pattern.
- **Frontmatter:** Reuse the existing schema (`series`, `order`, `category`, `tags`, `difficulty`, `readingTime`, `image`).

## 2. Folder Structure

```
architecture-patterns/
├── PLAN.md                      ← this file
├── README.md                    ← index + reading order
├── application/                 ← how a single application/service is structured
├── integration/                 ← how services talk to each other
├── data/                        ← how data is stored, partitioned, replicated
├── deployment/                  ← how systems are deployed and scaled
└── organizational/              ← how patterns map to team topology
```

This separates concerns cleanly:
- `design-patterns/distributed/` already covers **runtime resilience primitives** (circuit breaker, bulkhead, saga, outbox). Architecture patterns reference those but don't duplicate them.
- `application/` is about *macro-structure of one service*.
- `integration/` is about *wiring multiple services together*.
- `data/` and `deployment/` are infrastructure-shaped.
- `organizational/` ties Conway's Law into the technical choices.

## 3. Pattern Catalog

### 3.1 `application/` — Single-service architecture

| Order | Pattern                          | Why it matters                                                                 |
| ----- | -------------------------------- | ------------------------------------------------------------------------------ |
| 1     | layered-architecture.md          | The default; baseline everyone deviates from.                                  |
| 2     | hexagonal-architecture.md        | Ports & Adapters — testability and infra independence.                         |
| 3     | clean-architecture.md            | Uncle Bob's variant; dependency rule, use-case centric.                        |
| 4     | onion-architecture.md            | Compare/contrast with hexagonal & clean.                                       |
| 5     | mvc-mvp-mvvm.md                  | Presentation-layer family; when each fits.                                     |
| 6     | modular-monolith.md              | Underrated; the "right" starting point for most teams.                         |
| 7     | plugin-architecture.md           | Extensibility via dynamic modules (VS Code, Jenkins, Terraform providers).     |

### 3.2 `integration/` — Inter-service patterns

| Order | Pattern                           | Why it matters                                                          |
| ----- | --------------------------------- | ----------------------------------------------------------------------- |
| 1     | microservices.md                  | The umbrella; decomposition strategies, anti-patterns.                  |
| 2     | service-oriented-architecture.md  | Historical context; how SOA differs from microservices.                 |
| 3     | event-driven-architecture.md      | EDA topologies (broker vs mediator); pairs with event-sourcing/outbox.  |
| 4     | api-gateway.md                    | Edge concerns: routing, auth, rate-limiting, BFF tie-in.                |
| 5     | backend-for-frontend.md           | BFF — per-client API tailoring.                                         |
| 6     | service-mesh.md                   | Sidecar-based mesh; references `design-patterns/distributed/sidecar.md`.|
| 7     | choreography-vs-orchestration.md  | Workflow design; ties to Temporal & saga.                               |
| 8     | pub-sub-architecture.md           | Pub/sub at architectural scale (Kafka, NATS, SNS/SQS).                  |
| 9     | request-reply-vs-streaming.md     | RPC, REST, gRPC streaming, WebSockets — when to pick what.              |
| 10    | anti-corruption-layer.md          | DDD pattern for legacy integration; pairs with strangler-fig.           |

### 3.3 `data/` — Data architecture

| Order | Pattern                          | Why it matters                                                          |
| ----- | -------------------------------- | ----------------------------------------------------------------------- |
| 1     | shared-database-anti-pattern.md  | Why teams keep doing it and how to escape.                              |
| 2     | database-per-service.md          | The microservices counterpart; consistency trade-offs.                  |
| 3     | polyglot-persistence.md          | Picking the right store per workload (links `how-to-pick-the-right-database.md`). |
| 4     | cqrs-architecture.md             | Architectural CQRS (vs the tactical pattern in `design-patterns/`).     |
| 5     | event-sourcing-architecture.md   | Same — system-level view of event sourcing.                             |
| 6     | data-mesh.md                     | Domain-owned data products; Zhamak Dehghani's framework.                |
| 7     | data-lakehouse.md                | Lake + warehouse convergence (Delta, Iceberg, Hudi).                    |
| 8     | lambda-vs-kappa-architecture.md  | Batch + streaming vs streaming-only.                                    |
| 9     | sharding-and-partitioning.md     | Architectural sharding (links `consistent-hashing.md`).                 |
| 10    | multi-tenancy-architecture.md    | Pool vs silo vs bridge; links `interview-prep/multi-tenancy-and-isolation.md`. |

### 3.4 `deployment/` — Deployment & runtime topology

| Order | Pattern                          | Why it matters                                                          |
| ----- | -------------------------------- | ----------------------------------------------------------------------- |
| 1     | monolith-vs-microservices.md     | The decision, with honest trade-offs.                                   |
| 2     | serverless-architecture.md       | FaaS, BaaS; cold starts, vendor lock-in.                                |
| 3     | edge-computing.md                | CDN compute, edge functions, latency-driven design.                     |
| 4     | multi-region-active-active.md    | HA topologies; references active-active artefacts in `Errors/`.         |
| 5     | blue-green-canary-deployments.md | Progressive delivery patterns.                                          |
| 6     | cell-based-architecture.md       | AWS/Slack-style cells for blast-radius containment.                     |
| 7     | sidecar-vs-ambient.md            | Service-mesh deployment evolution (Istio Ambient).                      |
| 8     | controller-pattern.md            | Kubernetes-style reconciliation loops; links `interview-prep/k8s-controller-pattern.md`. |

### 3.5 `organizational/` — Conway's Law in practice

| Order | Pattern                          | Why it matters                                                          |
| ----- | -------------------------------- | ----------------------------------------------------------------------- |
| 1     | team-topologies.md               | Stream-aligned, platform, enabling, complicated-subsystem teams.        |
| 2     | inverse-conway-maneuver.md       | Designing org to get the architecture you want.                         |
| 3     | platform-engineering.md          | Internal developer platforms; golden paths.                             |
| 4     | bounded-context-and-ddd.md       | DDD strategic design driving service boundaries.                        |

## 4. Per-Pattern Document Template

Each pattern file follows this outline (matches `circuit-breaker.md`):

1. **Frontmatter** (title, description, date, series, order, category, tags, difficulty, readingTime, image).
2. **Overview** — origin story / motivating failure.
3. **Core idea** — diagram + 3-line definition.
4. **When to use / when not to use.**
5. **Deep dive** — components, variants, internal mechanics.
6. **Trade-offs** — explicit table (latency, complexity, cost, ops burden).
7. **Implementation notes** — Go example *or* infrastructure example (Helm, Terraform, k8s manifest).
8. **Real-world case studies** — at least one company, one failure mode.
9. **Interaction with other patterns** — link forward and backward.
10. **Interview talking points** — 5–8 bullets a Staff candidate should hit.
11. **Further reading.**

## 5. Cross-References to Existing Notes

Reuse, don't rewrite. Each new doc should link to:

- [cap-theorem-complete-guide.md](../cap-theorem-complete-guide.md)
- [acid-vs-base.md](../acid-vs-base.md)
- [consistent-hashing.md](../consistent-hashing.md)
- [how-to-pick-the-right-database.md](../how-to-pick-the-right-database.md)
- [kafka-complete-guide.md](../kafka-complete-guide.md)
- [redis-complete-guide.md](../redis-complete-guide.md)
- [temporal-durable-execution-deep-dive.md](../temporal-durable-execution-deep-dive.md)
- [design-patterns/distributed/](../design-patterns/distributed/) — circuit-breaker, bulkhead, saga, outbox, sidecar, strangler-fig, cqrs, event-sourcing.
- [interview-prep/multi-tenancy-and-isolation.md](../interview-prep/multi-tenancy-and-isolation.md)
- [interview-prep/k8s-controller-pattern.md](../interview-prep/k8s-controller-pattern.md)
- [interview-prep/control-plane.md](../interview-prep/control-plane.md)

## 6. Writing Order (suggested execution)

Phase 1 — **foundations** (week 1–2):
1. `application/layered-architecture.md`
2. `application/hexagonal-architecture.md`
3. `application/modular-monolith.md`
4. `integration/microservices.md`
5. `deployment/monolith-vs-microservices.md`

Phase 2 — **integration & events** (week 3–4):
6. `integration/event-driven-architecture.md`
7. `integration/api-gateway.md`
8. `integration/backend-for-frontend.md`
9. `integration/service-mesh.md`
10. `integration/choreography-vs-orchestration.md`

Phase 3 — **data** (week 5–6):
11. `data/database-per-service.md`
12. `data/cqrs-architecture.md`
13. `data/event-sourcing-architecture.md`
14. `data/multi-tenancy-architecture.md`
15. `data/sharding-and-partitioning.md`

Phase 4 — **deployment** (week 7):
16. `deployment/serverless-architecture.md`
17. `deployment/cell-based-architecture.md`
18. `deployment/multi-region-active-active.md`
19. `deployment/blue-green-canary-deployments.md`

Phase 5 — **fill-in & organizational** (week 8+):
20. Remaining application/* and integration/* docs.
21. `organizational/*` set.
22. Top-level `README.md` index with a decision tree (problem → pattern).

## 7. Definition of Done (per pattern)

- [ ] Frontmatter matches schema.
- [ ] At least one diagram (ASCII or Mermaid).
- [ ] One Go snippet *or* one infra manifest snippet.
- [ ] Trade-off table present.
- [ ] At least 2 cross-links to existing research notes.
- [ ] At least 1 real-world case study with a named company.
- [ ] Interview talking-points section.
- [ ] Reading time computed and in frontmatter.

## 8. Out of Scope (deliberately)

- GoF code-level patterns — already covered in `design-patterns/{creational,structural,behavioral}/`.
- Language-specific frameworks (Spring, Rails) — keep examples in Go or vendor-neutral.
- Pure DevOps tooling comparisons (Jenkins vs ArgoCD) — only mention where they illustrate a pattern.

## 9. Open Questions

1. Should `cqrs` and `event-sourcing` live only in `design-patterns/distributed/` (current home) or get an *architectural* sibling under `data/`? **Proposal:** keep tactical doc in `design-patterns/`, add a higher-level `data/cqrs-architecture.md` that focuses on system topology and references the tactical doc.
2. Should `controller-pattern.md` move out of `interview-prep/` into `deployment/`? **Proposal:** leave the interview doc, add a fuller `deployment/controller-pattern.md` and cross-link.
3. Image assets — reuse `/images/` convention from `circuit-breaker.md`; create placeholders during draft.
