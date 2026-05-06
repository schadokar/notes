---
title: Dsa Order
difficulty: intermediate
---
Order matters because each topic builds on prerequisites. Here's the sequence I'd recommend, grouped into phases.

## Phase 1 — Foundations (build core muscle)

| #   | Topic              | Why here                                                              |
| --- | ------------------ | --------------------------------------------------------------------- |
| 1   | **Array / String** | Base data structure; every other topic uses it.                       |
| 2   | **Hash Map / Set** | Unlocks O(1) lookup patterns; used everywhere later.                  |
| 3   | **Two Pointers**   | Natural extension of arrays; cheap & high-ROI patterns.               |
| 4   | **Sliding Window** | Specialization of two pointers.                                       |
| 5   | **Prefix Sum**     | Another array technique; pairs with hash map (subarray sum problems). |
| 6   | **Binary Search**  | Works on arrays first, then on "answer space" later.                  |

## Phase 2 — Linear Structures

| #   | Topic               | Why here                                                                   |
| --- | ------------------- | -------------------------------------------------------------------------- |
| 7   | **Stack**           | Builds on arrays; needed before monotonic stack & DFS recursion intuition. |
| 8   | **Linked List**     | Pointer manipulation; reinforces two-pointer thinking (fast/slow).         |
| 9   | **Monotonic Stack** | Advanced stack pattern (next greater element, histogram).                  |
| 10  | **Intervals**       | Sort + sweep; uses arrays and sometimes heap.                              |

## Phase 3 — Trees

| #   | Topic                  | Why here                                                     |
| --- | ---------------------- | ------------------------------------------------------------ |
| 11  | **Binary Tree — DFS**  | Recursion foundation; easier than BFS to start.              |
| 12  | **Binary Tree — BFS**  | Needs queue; level-order patterns.                           |
| 13  | **Binary Search Tree** | Adds ordering invariants on top of trees.                    |
| 14  | **Trie**               | Tree variant for strings; needs comfort with tree recursion. |

## Phase 4 — Heaps & Graphs

| #   | Topic                     | Why here                                                  |
| --- | ------------------------- | --------------------------------------------------------- |
| 15  | **Heap / Priority Queue** | Top-K, scheduling, Dijkstra prep.                         |
| 16  | **Graphs — BFS**          | Generalizes tree BFS; shortest path in unweighted graphs. |
| 17  | **Graphs — DFS**          | Cycle detection, topological sort, connected components.  |

## Phase 5 — Advanced Search & DP

| #   | Topic                     | Why here                                                        |
| --- | ------------------------- | --------------------------------------------------------------- |
| 18  | **Backtracking**          | DFS on implicit graphs (subsets, permutations, N-Queens).       |
| 19  | **DP — 1D**               | Recursion + memoization; natural follow-up to backtracking.     |
| 20  | **DP — Multidimensional** | Grid DP, string DP, knapsack variants.                          |
| 21  | **Bit Manipulation**      | Standalone; useful for DP optimization (bitmask DP) and tricks. |

---

## Visual dependency graph

```
Array/String ──┬─► Two Pointers ──► Sliding Window
               ├─► Hash Map/Set
               ├─► Prefix Sum
               ├─► Binary Search ─────────────┐
               └─► Stack ──► Monotonic Stack  │
                       └──► Linked List       │
                                              │
Binary Tree DFS ──► BST ──► Trie              │
       │                                      │
       └──► Binary Tree BFS ──► Graphs BFS ◄──┤
                            └─► Graphs DFS    │
                                   │          │
Heap/PQ ◄──────────────────────────┤          │
                                   ▼          ▼
                          Backtracking ──► DP 1D ──► DP Multi
                                                     ▲
                                          Bit Manipulation
                                          Intervals (sort + heap)
```

## Practical tips

- **Do 10–15 problems per topic** (Easy → Medium → 1–2 Hard) before moving on.
- **Don't skip Hash Map early** — it secretly powers half of array/string mediums.
- **Recursion confidence before trees**: if recursion feels shaky, drill it on linked lists first.
- **Binary Search twice**: once on arrays (Phase 1), then revisit "binary search on answer" after DP.
- **Graphs before backtracking** is fine, but backtracking *is* DFS on implicit graphs — doing graphs first makes backtracking click faster.
- **Mixed review**: after Phase 3, start interleaving older topics so you don't forget them.

> 💡 If you only have limited time, the highest-ROI topics for interviews are: Array/String, Hash Map, Two Pointers, Binary Search, BFS/DFS (trees + graphs), Heap, and DP-1D.