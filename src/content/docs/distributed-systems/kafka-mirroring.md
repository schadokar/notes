---
title: "Kafka Mirroring: Cross-Cluster Replication for Disaster Recovery and Multi-Region Systems"
description: "Learn what Kafka Mirroring is, how MirrorMaker 2 works, and when to use cross-cluster replication for DR, active-active, data aggregation, and cluster migration."
date: Fri Apr 17 2026 05:30:00 GMT+0530 (India Standard Time)
lastModified: Fri Apr 17 2026 05:30:00 GMT+0530 (India Standard Time)
series: "Distributed Systems Deep Dive"
order: 3
category: "Messaging"
tags:
  - kafka
  - kafka-mirroring
  - distributed-systems
  - disaster-recovery
  - staff-engineer-prep
difficulty: "advanced"
readingTime: 25
sidebar:
  order: 3
---
## Overview

Kafka Mirroring is the practice of **replicating data from one Kafka cluster to another** — completely separate clusters, usually across data centers or cloud regions.

This is different from Kafka's built-in **partition replication**, which copies data between brokers *within the same cluster*. Mirroring is **cross-cluster replication**.

> Think of it this way: partition replication is like having backup copies of a file on different drives in the same machine. Mirroring is like sending that file to a completely different office in another city.

---

## Core Concepts

### How It Works

The primary tool is **MirrorMaker 2 (MM2)** — Confluent and Apache both support it. Internally, it's built on **Kafka Connect** — it runs as a source connector on the target cluster, consuming from the source cluster and producing into the target.

```
┌─────────────────────────┐          ┌─────────────────────────┐
│   Cluster A (Source)    │          │   Cluster B (Target)    │
│                         │          │                         │
│  topic: orders          │──────────▶  topic: source.orders   │
│  topic: payments        │  MM2     │  topic: source.payments  │
│                         │          │                         │
│  [Broker 1]             │          │  [Broker 1]             │
│  [Broker 2]             │          │  [Broker 2]             │
│  [Broker 3]             │          │  [Broker 3]             │
└─────────────────────────┘          └─────────────────────────┘
```

*MM2 prefixes topic names by default (e.g., `source.orders`) so you always know the origin cluster.*

---

### MM2's Three Internal Connectors

This is where most engineers have gaps. MM2 is not a single replicator — it runs **three connectors** internally, each with a distinct job. Every production failure with MM2 maps to one of these three components failing.

```
┌──────────────────────────────────────────────────────────────────┐
│                      MirrorMaker 2 Worker                        │
│                                                                  │
│  ┌────────────────────────┐  ┌──────────────────────────────┐   │
│  │  MirrorSourceConnector │  │ MirrorCheckpointConnector    │   │
│  │                        │  │                              │   │
│  │  Reads topic data from │  │  Periodically translates     │   │
│  │  source cluster and    │  │  source consumer group       │   │
│  │  writes to target      │  │  offsets → target offsets    │   │
│  │  with prefix           │  │  and writes to checkpoints   │   │
│  │  (source.orders)       │  │  topic on target             │   │
│  └────────────────────────┘  └──────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  MirrorHeartbeatConnector                                │   │
│  │                                                          │   │
│  │  Emits heartbeat records to a heartbeats topic on        │   │
│  │  both clusters. Used to measure replication latency      │   │
│  │  end-to-end and detect whether the pipeline is alive.   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

| Connector                   | Purpose                                       | What breaks when it fails                                                                            |
| --------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `MirrorSourceConnector`     | Replicates topic records from source → target | Topic data stops flowing. Consumers on the target fall further behind.                               |
| `MirrorCheckpointConnector` | Translates consumer group offsets             | Failover consumers start from the wrong position — duplicate events or missed events.                |
| `MirrorHeartbeatConnector`  | Measures pipeline latency and liveness        | You lose replication lag alerting. You may not know MM2 is broken until disaster recovery is needed. |

> 💡 **Staff-level insight:** `MirrorCheckpointConnector` is the one that trips up engineers during failover drills. It syncs offsets on a schedule (default: 60 seconds). If your cluster fails 55 seconds after the last sync, you have a 55-second window of uncertain offsets. Plan for at-least-once delivery in your consumers and design idempotent consumers accordingly.

---

### MM2 Configuration — Critical Properties Explained

```properties
# mm2.properties — MirrorMaker 2 configuration
# Run with: connect-mirror-maker.sh mm2.properties

# Define the cluster aliases
clusters = source, target

source.bootstrap.servers = source-kafka:9092
target.bootstrap.servers = target-kafka:9092

# ─── Replication topology ───────────────────────────────────────────
# Enable source→target replication
source->target.enabled = true

# Which topics to mirror (regex). .* = everything.
# In production, be explicit: orders|payments|inventory
source->target.topics = .*

# ─── Replication factor for internal MM2 topics ─────────────────────
# MM2 creates several internal topics on the target cluster:
# offset-syncs, checkpoints, heartbeats.
# Set this to match your target cluster's replication factor.
# WRONG default is 1 — in a 3-broker cluster this creates a single
# point of failure for MM2's own bookkeeping.
replication.factor = 3

# ─── Consumer group offset sync ─────────────────────────────────────
# Enables MirrorCheckpointConnector to translate source offsets
# to target offsets and store them in the checkpoints topic.
# Without this, consumers failing over to the target have no idea
# where to start and will default to earliest or latest.
sync.group.offsets.enabled = true

# How often to sync offsets (seconds). Lower = less potential data
# duplication on failover, but higher load on both clusters.
sync.group.offsets.interval.seconds = 30

# ─── Offset-syncs topic ─────────────────────────────────────────────
# This internal topic tracks the mapping: source_offset → target_offset
# for every partition. MirrorCheckpointConnector reads from this topic
# to compute translated offsets.
# Must be ≥ 3 in production to survive broker failures.
offset-syncs.topic.replication.factor = 3

# ─── Checkpoints topic ──────────────────────────────────────────────
# Stores the translated consumer group offsets.
# Your failover consumers read from here to know where to resume.
checkpoints.topic.replication.factor = 3

# ─── Heartbeats ─────────────────────────────────────────────────────
# Emits records to a heartbeats topic so you can monitor
# end-to-end replication latency.
source->target.emit.heartbeats.enabled = true
source->target.emit.heartbeats.interval.seconds = 1

# ─── Tasks ──────────────────────────────────────────────────────────
# Number of tasks for MirrorSourceConnector.
# Each task handles a subset of partitions. Scale this up with
# partition count — a starting rule: tasks = brokers × 2.
tasks.max = 6
```

*Every property above has a wrong default somewhere. The `replication.factor = 1` default is the most dangerous — it makes MM2's internal bookkeeping a single point of failure.*

---

### Go: Handling Failover with Offset Translation

When your primary cluster goes down, your consumers need to start reading from the **mirrored topic on the target cluster** — but at the right offset. This is the step engineers skip in DR drills and regret during actual outages.

```go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/IBM/sarama"
)

// connectToTarget connects to the DR (target/mirrored) cluster.
// In production, this broker list comes from a config flag or
// environment variable that your runbook switches during failover.
func connectToTarget() (sarama.Client, error) {
	cfg := sarama.NewConfig()
	cfg.Version = sarama.V3_0_0_0
	// During failover we want to start from the last known translated
	// offset (read from checkpoints), not from latest or earliest.
	cfg.Consumer.Offsets.Initial = sarama.OffsetOldest
	cfg.Net.DialTimeout = 10 * time.Second

	return sarama.NewClient([]string{"target-kafka:9092"}, cfg)
}

// readTranslatedOffsets reads MM2's checkpoints topic to find the
// last translated offset for a given consumer group.
//
// MM2's MirrorCheckpointConnector writes to:
//   "<source-alias>.checkpoints.internal"
//
// Each record's key encodes: group + topic + partition.
// Each record's value encodes: the translated target offset.
//
// In practice, you'd decode the Avro/JSON schema. This example
// extracts the raw bytes for illustration — wire it up to your
// schema registry decoder in production.
func readTranslatedOffsets(
	client sarama.Client,
	sourceAlias string,
	consumerGroup string,
) (map[int32]int64, error) {
	checkpointsTopic := sourceAlias + ".checkpoints.internal"

	consumer, err := sarama.NewConsumerFromClient(client)
	if err != nil {
		return nil, fmt.Errorf("creating consumer: %w", err)
	}
	defer consumer.Close()

	// We need the partition count of the checkpoints topic.
	partitions, err := client.Partitions(checkpointsTopic)
	if err != nil {
		return nil, fmt.Errorf("partitions for %s: %w", checkpointsTopic, err)
	}

	// translatedOffsets maps original topic partition → target offset.
	translatedOffsets := make(map[int32]int64)
	deadline := time.After(15 * time.Second)

	for _, p := range partitions {
		pc, err := consumer.ConsumePartition(checkpointsTopic, p, sarama.OffsetOldest)
		if err != nil {
			return nil, fmt.Errorf("consuming checkpoint partition %d: %w", p, err)
		}

		// Drain the checkpoint partition to find the latest entry for
		// our consumer group. The checkpoints topic is compacted, so
		// the latest record per key is the authoritative translated offset.
	drain:
		for {
			select {
			case msg, ok := <-pc.Messages():
				if !ok {
					break drain
				}
				// In production: decode msg.Key to check if it matches
				// consumerGroup+topic+partition, then decode msg.Value
				// for the translated offset. Here we store all offsets
				// as a simplified illustration.
				//
				// Key format (JSON): {"group":"<group>","topic":"<topic>","partition":<n>}
				// Value format (JSON): {"offset":<translated_offset>}
				_ = consumerGroup // used in key deserialization
				_ = msg
				translatedOffsets[p] = msg.Offset // replace with decoded value

			case <-deadline:
				break drain
			}
		}
		pc.Close()
	}

	return translatedOffsets, nil
}

// FailoverConsumer resumes consuming from the mirrored cluster
// at the last translated offset, minimizing data loss or duplication.
type FailoverConsumer struct {
	client sarama.ConsumerGroup
}

func (f *FailoverConsumer) Setup(_ sarama.ConsumerGroupSession) error   { return nil }
func (f *FailoverConsumer) Cleanup(_ sarama.ConsumerGroupSession) error { return nil }
func (f *FailoverConsumer) ConsumeClaim(
	session sarama.ConsumerGroupSession,
	claim sarama.ConsumerGroupClaim,
) error {
	for msg := range claim.Messages() {
		// Your business logic here. Design this to be idempotent —
		// after failover, you WILL see at-least-once delivery.
		// Duplicate detection using a message ID or database upsert
		// is your safety net.
		fmt.Printf("event: key=%s partition=%d offset=%d\n",
			msg.Key, msg.Partition, msg.Offset)
		session.MarkMessage(msg, "")
	}
	return nil
}

func main() {
	client, err := connectToTarget()
	if err != nil {
		log.Fatalf("target cluster unavailable: %v", err)
	}
	defer client.Close()

	// Step 1: Read translated offsets from MM2 checkpoints.
	// This tells us where to resume on the mirrored cluster.
	offsets, err := readTranslatedOffsets(client, "source", "my-consumer-group")
	if err != nil {
		log.Printf("WARNING: could not read checkpoints, falling back to earliest: %v", err)
		// Safe fallback: earliest ensures no data loss, but may cause duplicates.
		// Your idempotent consumer handles this.
	} else {
		log.Printf("Translated offsets from checkpoints: %v", offsets)
	}

	// Step 2: Create a consumer group against the TARGET cluster.
	// Topic name on target = "<source-alias>.<original-topic>"
	mirroredTopic := "source.orders"

	cg, err := sarama.NewConsumerGroupFromClient("my-consumer-group", client)
	if err != nil {
		log.Fatalf("creating consumer group: %v", err)
	}
	defer cg.Close()

	handler := &FailoverConsumer{}
	ctx := context.Background()

	log.Printf("Consuming from mirrored topic: %s", mirroredTopic)
	for {
		if err := cg.Consume(ctx, []string{mirroredTopic}, handler); err != nil {
			log.Printf("consumer error: %v", err)
			time.Sleep(2 * time.Second)
		}
	}
}
```

*The most important line in this code is the comment: "You WILL see at-least-once delivery." Design for it upfront.*

> 💡 **Staff-level insight:** The gap between when MM2 last synced checkpoints and when the source cluster died is your theoretical **maximum data duplication window**, not data loss window. With `sync.group.offsets.interval.seconds = 30`, worst case is 30 seconds of duplicate events on failover — not 30 seconds of lost events. Data is already on the target; your consumers just might reprocess some of it. This distinction matters a lot when you're in a design review.

---

## Use Cases

### 1. Disaster Recovery (DR)
Your primary cluster is in `us-east-1`. You mirror to `us-west-2`. If `us-east-1` goes down, consumers failover and resume from the mirrored cluster.

**Real world:** LinkedIn uses cross-datacenter mirroring to ensure event streams survive regional outages.

### 2. Active-Active Multi-Region
Two active clusters in two regions. Each mirrors to the other. Producers in each region write locally (low latency), but data is available globally.

```
us-east-1 ◄──────── MM2 ────────► eu-west-1
(Writes here)                    (Writes here)
```

> 💡 **Staff-level insight:** Active-active is operationally complex. You have to handle **offset divergence** — the same logical event has different offsets in each cluster. MM2 has offset translation, but failover consumers need to use the `RemoteClusterUtils` API to map offsets correctly. This is a common interview pitfall.

### 3. Data Aggregation (Fan-in)
You have 10 regional clusters. Mirror them all into one central cluster for analytics, auditing, or ML training.

```
Region 1 ──┐
Region 2 ──┤──► Central Analytics Cluster
Region 3 ──┘
```

This is exactly how companies like **Uber** and **Airbnb** centralize event data for their data warehouses.

### 4. Cluster Migration / Upgrade
Mirror old cluster → new cluster. Gradually shift consumers and producers over. Zero-downtime migration.

### 5. Cloud Isolation / Security Boundary
On-prem Kafka mirrors to cloud Kafka. The on-prem cluster stays inside the firewall, but relevant topics get replicated to cloud consumers (e.g., AWS Lambda, analytics jobs).

---

## Gotchas

Things that bite you in production:

| Problem                        | Why It Hurts                                                                                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Offset mismatch**            | Source offset 1234 ≠ target offset 1234. Consumers can duplicate or skip messages on failover if not handled.                                                                          |
| **Topic naming**               | MM2 prefixes topic names by default. Your consumer config must handle `cluster-a.orders`, not `orders`.                                                                                |
| **Consumer group offset sync** | MM2 can sync consumer group offsets via `MirrorCheckpointConnector`, but it lags. Don't assume offsets are current at the moment of failover.                                          |
| **Replication lag**            | Mirroring adds latency — usually seconds, but can spike under load. DR is **not synchronous**.                                                                                         |
| **Compacted topics**           | Mirroring compacted topics requires special care — tombstone records must also be replicated before compaction kicks in on the source, or you'll resurrect deleted keys on the target. |

---

## Where to Use (and Where NOT to Use)

**Use mirroring when:**
- You need geographic redundancy or disaster recovery
- You're aggregating data from many clusters into one
- You're doing a live cluster migration with zero downtime
- You need to cross a network or security boundary (on-prem → cloud)

**Don't use mirroring when:**
- You just want fault tolerance *within a cluster* — use **replication factor + ISR** instead (simpler, faster, no extra tooling)
- You need synchronous, zero-data-loss failover — Kafka mirroring is **asynchronous by design**. For true sync replication you'd need a stretch cluster or a different technology
- You're trying to sync two clusters bidirectionally for transactional workloads — active-active is operationally heavy and error-prone at scale

---

## Monitoring & Observability

Never deploy MM2 to production without instrumenting it. Replication failures are **silent by default** — data stops flowing, consumers fall behind, and you don't find out until the DR drill or, worse, the actual outage.

### Key Metrics to Watch

| Metric (JMX / Kafka Connect REST)                                                                              | What It Measures                                                      | Alert Threshold           |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------- |
| `kafka.mirrormaker2:type=MirrorSourceConnector,attribute=replication-latency-ms`                               | Time between a record being written on source and appearing on target | > 30,000ms (30s)          |
| `kafka.consumer:type=consumer-fetch-manager-metrics,attribute=records-lag-max` (MM2's internal consumer group) | How far behind MM2's own consumer is on the source                    | > 10,000 records          |
| `kafka.connect:type=connector-task-metrics,connector={name},attribute=status`                                  | Connector task state (running = 0, failed/paused = nonzero)           | Any non-RUNNING state     |
| `kafka.mirrormaker2:type=MirrorSourceConnector,attribute=record-count`                                         | Records replicated per second                                         | Sudden drop to 0          |
| `kafka.mirrormaker2:type=MirrorSourceConnector,attribute=byte-rate`                                            | Bytes replicated per second                                           | Use for capacity planning |
| `kafka.mirrormaker2:type=MirrorHeartbeatConnector,attribute=replication-latency-ms`                            | End-to-end heartbeat round-trip latency                               | > 60,000ms                |

### What a Growing `records-lag-max` Tells You

```
Time →

records-lag-max:

0    ──────────────────┐
                       │  Lag starts growing
10k                    └──────────────────────────┐
                                                  │  You're behind
100k                                              └──────────────────► Disaster
```

A growing lag almost always means one of three things:
1. **Source throughput spiked** above what your MM2 workers can handle — scale up `tasks.max` or add Connect workers
2. **A MirrorSourceConnector task died** — check `connector-task-metrics` status; restart the failed task
3. **Network congestion between clusters** — usually shows up as high `replication-latency-ms` first, then lag follows

> 💡 **Staff-level insight:** Set your alert on `records-lag-max` at 10,000 records — not a time-based threshold. Records tell you how much data is at risk. 10k records at 100 rec/s = 100 seconds of potential data loss on failover. That is your actual RPO at point of alert.

### Grafana Dashboard Queries (Prometheus via JMX Exporter)

```promql
# Replication latency — alert if sustained above 30s
kafka_mirrormaker2_replication_latency_ms{connector="MirrorSourceConnector"}

# MM2 consumer lag — alert if growing
kafka_consumer_records_lag_max{client_id=~".*mirror.*"}

# Task failures — alert immediately
kafka_connect_connector_task_metrics_status{status!="running"}
```

---

## Scale: MM2 Under High Throughput

This is where most teams hit unexpected walls. MM2 is powerful but it has a concrete throughput ceiling per worker, and that ceiling is easy to breach.

### Worker Sizing Rules of Thumb

```
Throughput per MM2 worker (4-core, 8GB RAM, well-tuned):

~100–200 MB/s sustained replication throughput

1 TB/day  =  ~11.6 MB/s  →  1 worker can handle this comfortably
10 TB/day =  ~116 MB/s   →  1 worker may hit CPU or network limits
100 TB/day = ~1.16 GB/s  →  Minimum 8–10 workers, dedicated network
```

### Scaling MM2 Horizontally

MM2 runs inside a Kafka Connect cluster. Adding workers is as simple as starting more Connect processes pointing at the same `config.storage.topic`. The framework automatically rebalances connector tasks across available workers.

```
┌────────────┐    ┌────────────┐    ┌────────────┐
│  MM2       │    │  MM2       │    │  MM2       │
│  Worker 1  │    │  Worker 2  │    │  Worker 3  │
│            │    │            │    │            │
│ Tasks: 0,3 │    │ Tasks: 1,4 │    │ Tasks: 2,5 │
└────────────┘    └────────────┘    └────────────┘
        │                │                │
        └────────────────┴────────────────┘
                         │
               Kafka Connect internal
               coordination topics
```

*Add a worker, tasks rebalance. Remove a worker, tasks rebalance. No manual assignment needed.*

### The Real Bottleneck: Network, Not CPU

At scale, the bottleneck is almost always **inter-cluster network bandwidth**, not CPU or MM2 worker count.

```
Rule: budget 2× your average throughput for replication bandwidth.

Average: 500 MB/s → Reserve 1 Gbps of cross-cluster bandwidth for MM2.
```

AWS Direct Connect or VPC Peering bandwidth limits will bite you before your Kafka brokers do at high throughput. Always measure `byte-rate` and `replication-latency-ms` together — high latency with low byte rate = network saturation.

### When MM2 Becomes the Bottleneck Before Kafka Does

| Symptom                                              | Root Cause                                        | Fix                                                                       |
| ---------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| `records-lag-max` growing, source brokers healthy    | `tasks.max` too low                               | Increase `tasks.max = brokers × 2`                                        |
| `replication-latency-ms` spikes under bursty traffic | Single MM2 worker saturated                       | Add Connect workers                                                       |
| MM2 consumer group rebalancing frequently            | Too many topics/partitions per task               | Tune `tasks.max`, consider topic filtering                                |
| High CPU on MM2 workers, low network utilization     | Deserialization overhead (Avro + Schema Registry) | Use byte pass-through mode: `tasks.max` + `producer.override.linger.ms=5` |

> 💡 **Staff-level insight:** At 1,000+ topics with high partition counts, MM2's partition assignment becomes an issue. Each `(topic, partition)` pair becomes a task unit. With `tasks.max = 6` and 2,000 partitions, each task handles ~333 partitions. Increasing `tasks.max` linearly increases the parallelism. Watch Connect worker memory — each task holds an in-flight buffer.

---

## Versus: Cross-Cluster Replication Tool Comparison

The real decision you'll face isn't "MM1 vs MM2" — MM1 is dead. The real question is: **which cross-cluster replication tool fits your architecture, budget, and operational model?**

| Aspect                   | MirrorMaker 2 (OSS)             | Confluent Replicator          | AWS MSK Cross-Region   | Kafka Stretch Cluster                   |
| ------------------------ | ------------------------------- | ----------------------------- | ---------------------- | --------------------------------------- |
| **Open source**          | ✅ Free                          | ❌ Confluent license           | ❌ AWS-managed, metered | ✅ OSS (complex to operate)              |
| **Replication type**     | Asynchronous                    | Asynchronous                  | Asynchronous           | Near-synchronous (configurable)         |
| **RPO (best case)**      | Seconds–minutes                 | Seconds                       | Seconds                | Milliseconds                            |
| **Setup complexity**     | Medium                          | Low (GUI + managed)           | Low (AWS Console)      | High (network topology, rack awareness) |
| **Offset translation**   | Built-in (checkpoint connector) | Built-in, more advanced       | Limited                | Not needed (same cluster)               |
| **Active-active**        | Supported but complex           | Supported with better tooling | Limited                | Supported natively                      |
| **Schema Registry sync** | Manual                          | Built-in                      | Manual                 | N/A (same cluster)                      |
| **Vendor lock-in**       | None                            | Confluent                     | AWS                    | None                                    |
| **Cost**                 | Infrastructure only             | High licensing                | ~$0.011/GB replicated  | 2× infrastructure cost                  |
| **Monitoring**           | Kafka Connect JMX metrics       | Confluent Control Center      | CloudWatch             | Standard Kafka metrics                  |
| **Cross-cloud**          | ✅ Yes                           | ✅ Yes                         | ❌ AWS-only             | ❌ Same network required                 |

**Choose MirrorMaker 2 when:** you're running OSS Kafka, you have the operational capacity to run and tune a Kafka Connect cluster, and you want zero vendor dependency. This is the right default for most teams.

**Choose Confluent Replicator when:** you're already on Confluent Platform, you want schema sync out of the box, and you're willing to pay for a managed active-active setup with better monitoring and support.

**Choose AWS MSK Cross-Region when:** your entire stack is on AWS, Kafka is managed by MSK, and you want to add DR without running any additional infrastructure. Trade-off: you lose control over replication internals and you pay per GB.

**Choose a Kafka Stretch Cluster when:** you need near-zero RPO (milliseconds of potential data loss, not seconds), you can accept ~2ms additional write latency (the cost of synchronous replication), and you have the network infrastructure to support an extremely low-latency connection between your data centers. This is the most complex option but the only one that gets you close to synchronous replication without changing your application code.

---

## References

- [Apache Kafka MirrorMaker 2 Docs](https://kafka.apache.org/documentation/#georeplication)
- [Confluent MirrorMaker 2 Guide](https://docs.confluent.io/platform/current/multi-dc-deployments/mirrormaker.html)
- [KIP-382: MirrorMaker 2.0](https://cwiki.apache.org/confluence/display/KAFKA/KIP-382%3A+MirrorMaker+2.0) — the original design proposal
- [LinkedIn Engineering: Kafka Multi-DC](https://engineering.linkedin.com/kafka/running-kafka-scale)
- [Uber Engineering: Real-Time Data Infrastructure](https://www.uber.com/blog/real-time-data-infrastructure-at-uber/)

---

## Interview Questions

---

**Q1: "Design a multi-region Kafka setup for a payments system that can survive a regional outage with < 30 seconds of data loss."**

**Key points to cover:**
- Asynchronous nature of MM2 — you cannot guarantee zero data loss with mirroring alone; explain RPO as a function of `sync.group.offsets.interval.seconds`
- Active-passive vs active-active: for payments, active-passive is usually simpler and safer; active-active introduces conflict resolution complexity
- Offset translation on failover — consumers must read from the checkpoints topic, not naively start from `latest`
- Producer failover: redirect at DNS/load balancer level (route53 health checks or k8s service endpoints) vs application-level retry with dual-write
- Kafka is the event bus, not the source of truth — pair with synchronous Postgres writes for zero data loss guarantee

**Common mistakes:**
- Saying "mirror the data and failover" without addressing offset translation
- Claiming zero data loss from MM2 alone (it's async — acknowledge this and explain your mitigation)
- Ignoring producer failover — candidates only talk about consumer failover

**What interviewers are really looking for:** Whether you understand that Kafka mirroring is best-effort asynchronous replication. The staff answer explicitly separates "replication of data" from "guaranteed durability" and introduces a database as the synchronous durability layer.

---

**Q2: "Explain how MM2 handles consumer group offset translation. What goes wrong if you skip it during failover?"**

**Key points to cover:**
- Offsets are cluster-local — offset 5000 on source cluster does not mean the same record on target cluster
- `MirrorCheckpointConnector` periodically reads source consumer group offsets, translates them to target offsets using the offset-syncs topic, and writes them to the checkpoints topic
- During failover, your consumer reads from the checkpoints topic to discover where to resume on the target
- If you skip offset translation and start from `latest`: you miss all events that were replicated but not yet consumed — silent data loss
- If you skip offset translation and start from `earliest`: you reprocess everything from the beginning — massive duplication

**Common mistakes:**
- Assuming offset numbers are portable across clusters
- Not knowing `MirrorCheckpointConnector` exists as a separate connector that can fail independently of `MirrorSourceConnector`
- Not accounting for the lag between last checkpoint sync and failover moment (the duplication window)

**What interviewers are really looking for:** Whether you actually understand the three-connector architecture of MM2 and can reason about partial failures. A candidate who can explain "what breaks if only `MirrorCheckpointConnector` fails" is demonstrating staff-level operational thinking.

---

**Q3: "When would you choose a Kafka Stretch Cluster over MirrorMaker 2? What are the trade-offs?"**

**Key points to cover:**
- Stretch cluster = a single Kafka cluster whose brokers span two or more data centers. Data is replicated synchronously as part of the normal ISR (In-Sync Replica) commit protocol
- RPO: Stretch cluster achieves near-zero (milliseconds) vs MM2's seconds-to-minutes
- Latency cost: synchronous replication means every produce call waits for ACK from at least one replica in each data center — adds 2–10ms per write depending on cross-DC RTT
- Operational complexity: stretch clusters require rack-aware assignment, network partitions can split the ISR and pause writes entirely if not configured carefully (min.insync.replicas must be tuned to avoid this)
- No offset translation needed: same cluster, same offsets, transparent failover

**Common mistakes:**
- Recommending stretch clusters for everything ("why not always have zero data loss?") without acknowledging the write latency cost
- Not mentioning the network partition problem: if the inter-DC link drops, a stretch cluster with `min.insync.replicas=2` (one in each DC) will stop accepting writes — a full partition is worse than a failover scenario
- Confusing a stretch cluster with multi-cluster active-active

**What interviewers are really looking for:** Whether you can make a concrete recommendation with trade-offs. The right answer: "Use a stretch cluster when your SLA requires RPO < 1 second AND you have sub-5ms cross-DC RTT AND you can accept up to 5ms additional write latency. Use MM2 in every other case — the operational simplicity is worth accepting RPO in the seconds range for most systems."

> 💡 **Staff-level insight:** For a payments system specifically, pure Kafka mirroring is not enough for zero data loss — and you should say that in the interview. The right architecture pairs a synchronous Postgres write (your source of truth, with streaming replication to the DR region) with Kafka as the event bus. Kafka durability guarantees are best-effort async across clusters; your database is the thing that provides durability. That separation of concerns is what a staff engineer articulates.

---

## Staff-Level Preparation Tips

- **Build it:** Spin up two Kafka clusters locally with Docker Compose and configure MM2 between them. Intentionally kill the source cluster and practice failover — there's no substitute for doing it with your hands.
- **Study KIP-382:** Reading the original MirrorMaker 2 design proposal gives you deep insight into *why* it was designed this way and the trade-offs the authors made.
- **Connect it to system design:** Anytime you're designing a multi-region system in an interview, ask yourself: "Where is the source of truth? What is the RPO (Recovery Point Objective)? Is Kafka my system of record or just a bus?" These questions differentiate staff-level thinking.
- **Monitor lag, not just throughput:** In production, the key metric for a mirrored cluster is **replication lag** (how far behind the target is from the source). Set alerts on this — a growing lag is your early warning that something is wrong before a failover becomes painful.
