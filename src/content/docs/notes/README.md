---
title: README
difficulty: intermediate
---
A staff-engineer-level deep-dive series on **system-level architecture patterns** — how to structure applications, integrate services, organize data, deploy at scale, and align with team topology.

This series complements the tactical patterns in [../design-patterns/](../design-patterns/) (GoF + distributed). Tactical patterns shape *code*; architecture patterns shape *systems*.

See [architecture-patterns-plan.md](./architecture-patterns-plan.md) for the full catalog and writing order.

## Reading Order

### Phase 1 — Foundations (start here)

1. [application/layered-architecture.md](./application/layered-architecture.md) — the default n-tier stack, why it wins and rots.
2. [application/hexagonal-architecture.md](./application/hexagonal-architecture.md) — Ports & Adapters; isolating the domain.
3. [application/modular-monolith.md](./application/modular-monolith.md) — bounded contexts inside a single deployable.
4. [integration/microservices.md](./integration/microservices.md) — when and how to decompose; the operational tax.
5. [deployment/monolith-vs-microservices.md](./deployment/monolith-vs-microservices.md) — the decision framework.

### Phase 2 — Integration & Events (planned)

- `integration/event-driven-architecture.md`
- `integration/api-gateway.md`
- `integration/backend-for-frontend.md`
- `integration/service-mesh.md`
- `integration/choreography-vs-orchestration.md`

### Phase 3 — Data (planned)

- `data/database-per-service.md`
- `data/cqrs-architecture.md`
- `data/event-sourcing-architecture.md`
- `data/multi-tenancy-architecture.md`
- `data/sharding-and-partitioning.md`

### Phase 4 — Deployment (planned)

- `deployment/serverless-architecture.md`
- `deployment/cell-based-architecture.md`
- `deployment/multi-region-active-active.md`
- `deployment/blue-green-canary-deployments.md`

### Phase 5 — Organizational (planned)

- `organizational/team-topologies.md`
- `organizational/inverse-conway-maneuver.md`
- `organizational/platform-engineering.md`
- `organizational/bounded-context-and-ddd.md`

## How to Use This Series

- **Going deep on one topic?** Start with the file you need; cross-links into related notes are at the bottom of each.
- **Preparing for a Staff system-design interview?** Read Phase 1 + Phase 2 + Phase 3 in order. That's the bulk of architectural breadth that comes up.
- **Making a real architectural decision?** Jump to [deployment/monolith-vs-microservices.md](./deployment/monolith-vs-microservices.md) for the decision framework, then read the specific pattern docs.

## Style Conventions

Each pattern doc follows the same structure:

1. Overview (origin story / motivating failure)
2. Core Concepts (with diagrams)
3. Use Cases (real companies)
4. Gotchas
5. Where to Use / Where NOT to Use
6. Versus (comparison table)
7. References
8. Interview Questions
9. Staff-Level Preparation Tips

See [../design-patterns/distributed/circuit-breaker.md](../design-patterns/distributed/circuit-breaker.md) for the canonical example of the format.
