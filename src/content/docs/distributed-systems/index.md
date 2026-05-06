---
title: Distributed Systems
description: Building reliable systems across multiple machines.
---

Distributed systems trade simplicity for scale and availability. These notes cover the trade-offs that actually matter in production: consistency models, data storage choices, messaging, and the failure modes that show up once a single machine isn't enough.

## Topics

### Foundations
- [CAP theorem — complete guide](/notes/cap-theorem-complete-guide)
- [ACID vs BASE](/distributed-systems/acid-vs-base)
- [Consistent hashing](/distributed-systems/consistent-hashing)

### Databases
- [How to pick the right database](/distributed-systems/how-to-pick-the-right-database)
- [Advanced database selection — staff engineering guide](/distributed-systems/advanced-database-selection-and-staff-engineering-interview-guide)
- [Redis — complete guide](/distributed-systems/redis-complete-guide)

### Messaging & streaming
- [Kafka — complete guide](/distributed-systems/kafka-complete-guide)
- [Kafka consumer groups](/distributed-systems/kafka-consumer-groups)
- [Kafka mirroring](/distributed-systems/kafka-mirroring)

### Reliability & traffic
- [Rate limiting — algorithms and strategies](/distributed-systems/rate-limiting-algorithms-and-strategies)
- [Temporal — durable execution deep dive](/distributed-systems/temporal-durable-execution-deep-dive)

## How to read these

Each note focuses on the why behind a choice — the constraints, trade-offs, and failure modes — rather than restating documentation. Pair them with the [distributed design patterns](/design-patterns/distributed/circuit-breaker) for the implementation side.
