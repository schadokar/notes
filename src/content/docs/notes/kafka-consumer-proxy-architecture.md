---
title: Kafka Consumer Proxy Architecture
difficulty: intermediate
---
## System Design Diagram

```mermaid
flowchart LR

    %% ── Producers ──
    P["Log Producers"]

    %% ── Cloud Network ──
    subgraph CLOUD["☁️ Cloud Network"]
        direction TB

        subgraph KAFKA["Kafka Broker"]
            T1["acctA_pipe1_audit"]
            T2["acctA_pipe1_dcp"]
            T3["acctA_pipe2_dhcp"]
            T4["acctB_pipe1_audit"]
            T5["acctB_pipe1_notification"]
            TN["..."]
        end

        CP["Consumer-Proxy"]
    end

    %% ── Onprem A ──
    subgraph ONPREM_A["🏢 Onprem — Account A"]
        FA["Forwarder A"]
    end

    %% ── Onprem B ──
    subgraph ONPREM_B["🏢 Onprem — Account B"]
        FB["Forwarder B"]
    end

    %% ── Destinations ──
    SPLUNK_A["Splunk"]
    S3_A["S3"]
    SIEM_B["SIEM"]
    S3_B["S3"]

    %% ── Flow ──
    P -->|"1. Write logs"| KAFKA

    FA -->|"2. Subscribe request"| CP
    FB -->|"2. Subscribe request"| CP

    CP -->|"3. Subscribe to topics"| KAFKA

    KAFKA -->|"4. Stream data"| CP

    CP -->|"5. Forward data"| FA
    CP -->|"5. Forward data"| FB

    FA -->|"6. Route logs"| SPLUNK_A
    FA -->|"6. Route logs"| S3_A
    FB -->|"6. Route logs"| SIEM_B
    FB -->|"6. Route logs"| S3_B
```

## Flow Steps

| Step | From           | To             | Description                                                               |
| ---- | -------------- | -------------- | ------------------------------------------------------------------------- |
| 1    | Log Producers  | Kafka          | Producers write logs to topics (`<account_id>_<pipeline_id>_<log_type>`)  |
| 2    | Forwarder      | Consumer-Proxy | Forwarder sends subscribe request with its account's topic list           |
| 3    | Consumer-Proxy | Kafka          | Consumer-Proxy subscribes to the requested Kafka topics                   |
| 4    | Kafka          | Consumer-Proxy | Kafka streams log data to Consumer-Proxy                                  |
| 5    | Consumer-Proxy | Forwarder      | Consumer-Proxy forwards the data to the requesting Forwarder              |
| 6    | Forwarder      | Destinations   | Forwarder routes logs to configured destinations (Splunk, S3, SIEM, etc.) |

## Key Points

- **Topic naming**: `<account_id>_<pipeline_id>_<log_type>` — 10 log types (audit, notification, dcp, dhcp, etc.)
- **Consumer-Proxy**: Single shared cloud component that proxies Kafka subscriptions for all onprem Forwarders
- **Forwarder**: 1 per onprem VM — subscribes to all topics belonging to its account (all pipelines × all log types)
- **Network boundary**: Kafka and Consumer-Proxy run in the cloud network; Forwarders run on customer onprem VMs
