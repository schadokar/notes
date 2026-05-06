---
title: Dsa 7day Plan
difficulty: intermediate
---
## Day 1: Arrays & Two Pointers

### Concepts
**Two Pointers**: Use two indices to traverse array from different positions (start/end or slow/fast).

**Tips:**
- Use when you need to find pairs or compare elements
- Often converts O(n²) to O(n)
- Common patterns: opposite ends moving inward, fast/slow pointers

**Sliding Window**: Maintain a window of elements and slide it across array.

**Tips:**
- Fixed size: move both pointers together
- Variable size: expand with right, contract with left
- Track window state (sum, count, frequency map)

### Problems to Solve
- [x] Two Sum (Easy) - LC #1
- [x] Remove Duplicates from Sorted Array (Easy) - LC #26
- [x] Container With Most Water (Medium) - LC #11
- [x] Longest Substring Without Repeating Characters (Medium) - LC #3
- [ ] Minimum Window Substring (Medium) - LC #76

---

## Day 2: Hashing & Strings

### Concepts
**Hashing**: Use hash maps/sets for O(1) lookup and counting.

**Tips:**
- Use HashMap for frequency counting
- Use HashSet for uniqueness checks
- Think "can I store this to look up later?"

**String Techniques**: Palindromes, anagrams, pattern matching.

**Tips:**
- Two pointers for palindromes
- Sort or frequency map for anagrams
- Use StringBuilder for concatenation

### Problems to Solve
- [x] Valid Anagram (Easy) - LC #242
- [x] Group Anagrams (Medium) - LC #49
- [ ] Longest Palindromic Substring (Medium) - LC #5
- [ ] Find All Anagrams in a String (Medium) - LC #438
- [ ] Valid Parentheses (Easy) - LC #20

---

## Day 3: Recursion & Backtracking

### Concepts
**Recursion**: Function calls itself with smaller subproblems.

**Tips:**
- Define base case clearly
- Trust the recursive call
- Draw recursion tree for understanding

**Backtracking**: Try all possibilities, backtrack when invalid.

**Tips:**
- Think "explore → make choice → recurse → undo choice"
- Use when problem asks for "all possible" solutions
- Prune invalid paths early

### Problems to Solve
- [ ] Subsets (Medium) - LC #78
- [ ] Permutations (Medium) - LC #46
- [ ] Combination Sum (Medium) - LC #39
- [ ] Generate Parentheses (Medium) - LC #22
- [ ] Word Search (Medium) - LC #79

---

## Day 4: Binary Search & Sorting

### Concepts
**Binary Search**: Divide search space in half each iteration.

**Tips:**
- Works on sorted/monotonic data
- Pattern: `while (left <= right)` or `while (left < right)`
- Watch for integer overflow: `mid = left + (right - left) / 2`

**Sorting Algorithms**: Quick sort, merge sort, heap sort.

**Tips:**
- Merge sort: O(n log n), stable, good for linked lists
- Quick sort: O(n log n) average, in-place
- When to sort: if sorting helps reduce complexity

### Problems to Solve
- [ ] Binary Search (Easy) - LC #704
- [ ] Search in Rotated Sorted Array (Medium) - LC #33
- [ ] Find First and Last Position (Medium) - LC #34
- [ ] Kth Largest Element in Array (Medium) - LC #215
- [ ] Merge Intervals (Medium) - LC #56

---

## Day 5: Trees (BFS & DFS)

### Concepts
**DFS (Depth-First Search)**: Explore as deep as possible before backtracking.

**Tips:**
- Use recursion or stack
- Patterns: preorder (root→left→right), inorder, postorder
- Good for: path problems, tree structure questions

**BFS (Breadth-First Search)**: Explore level by level.

**Tips:**
- Use queue
- Good for: shortest path, level-order traversal
- Process all nodes at current level before next

### Problems to Solve
- [ ] Maximum Depth of Binary Tree (Easy) - LC #104
- [ ] Binary Tree Level Order Traversal (Medium) - LC #102
- [ ] Validate Binary Search Tree (Medium) - LC #98
- [ ] Binary Tree Right Side View (Medium) - LC #199
- [ ] Lowest Common Ancestor of BST (Easy) - LC #235

---

## Day 6: Graphs & Advanced Search

### Concepts
**Graph Traversal**: DFS and BFS on graphs.

**Tips:**
- Use visited set to avoid cycles
- Adjacency list for sparse graphs
- DFS for connectivity, BFS for shortest path

**Union-Find**: Track connected components efficiently.

**Tips:**
- Use path compression and union by rank
- Good for: dynamic connectivity problems

### Problems to Solve
- [ ] Number of Islands (Medium) - LC #200
- [ ] Clone Graph (Medium) - LC #133
- [ ] Course Schedule (Medium) - LC #207
- [ ] Pacific Atlantic Water Flow (Medium) - LC #417
- [ ] Network Delay Time (Medium) - LC #743

---

## Day 7: Dynamic Programming & Greedy

### Concepts
**Dynamic Programming**: Break problem into overlapping subproblems, store results.

**Tips:**
- Identify: "can I break this into smaller identical problems?"
- Start with recursion + memoization, then convert to tabulation
- Common patterns: 1D DP, 2D DP, knapsack, LCS

**Greedy**: Make locally optimal choice at each step.

**Tips:**
- Works when local optimum leads to global optimum
- Prove correctness before coding
- Common: intervals, scheduling problems

### Problems to Solve
- [ ] Climbing Stairs (Easy) - LC #70
- [ ] House Robber (Medium) - LC #198
- [ ] Coin Change (Medium) - LC #322
- [ ] Longest Increasing Subsequence (Medium) - LC #300
- [ ] Jump Game (Medium) - LC #55

---

## Learning Resources

### Visual Learning Platforms
1. **VisuAlgo** (visualgo.net) - Interactive visualizations of algorithms
2. **Algorithm Visualizer** (algorithm-visualizer.org) - Step-by-step animations
3. **CS50** (cs50.harvard.edu) - Excellent video explanations
4. **Programiz** (programiz.com/dsa) - Clear diagrams and explanations

### Practice Platforms
1. **LeetCode** (leetcode.com) - Main problem source
2. **NeetCode** (neetcode.io) - Video solutions and patterns
3. **Tech Interview Handbook** (techinterviewhandbook.org) - Curated lists

### Pattern Recognition
- **14 Patterns to Ace Any Coding Interview** (educative.io)
- **Grokking the Coding Interview** - Pattern-based learning

---

## Study Tips

1. **Don't just read solutions** - Try for 30-45 minutes first
2. **Understand patterns** - Same pattern applies to multiple problems
3. **Code without looking** - After understanding solution, code it yourself
4. **Review regularly** - Revisit problems after 3 days, then 7 days
5. **Track your progress** - Maintain a spreadsheet of solved problems
6. **Time yourself** - Simulate interview conditions (45 mins per problem)

## Daily Routine Suggestion
- **Morning (1-2 hours)**: Learn new concept, watch videos
- **Afternoon (1-2 hours)**: Solve 2-3 problems
- **Evening (30 mins)**: Review and document learnings

**Total Problems**: 35 problems over 7 days (~5 per day)

Good luck with your DSA journey! 🚀