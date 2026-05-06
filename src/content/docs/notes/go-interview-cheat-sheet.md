---
title: Go Interview Cheat Sheet
difficulty: intermediate
---
Goal: by the end of this, you can write idiomatic, production-grade Go on a whiteboard and discuss the gotchas that bite teams. New Relic's JD says **"Strong proficiency in GoLang (primary language — non-negotiable)."** This is the round where they verify that claim.

---

## 1. Overview

At Lead level, Go interviews test three things:

1. **Idiomatic code**: do you write Go *the Go way*, or Go-flavored Java?
2. **Concurrency mastery**: goroutines, channels, context, sync — without races
3. **Production instincts**: error handling, lifecycle, observability, performance

You don't need to know every stdlib package. You **must** know `context`, `sync`, errors, `io`, `encoding/json`, `net/http`, `testing`. Everything else you can look up.

> 💡 **Staff-level insight:** The single biggest signal of a real Go engineer vs. someone who's "used Go" is comfort with `context.Context` propagation. Pass it as the first argument to every function that does I/O. Cancel it. Wrap it. Respect it. Get this right and you sound senior in the first 5 minutes.

---

## 2. Idiomatic Go — The Non-Negotiables

### 2.1 The Style That Marks You as Real

| Idiom          | Bad (Java/Python brain)                        | Good (Go brain)                                                                     |
| -------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| Receiver names | `func (this *Server)`                          | `func (s *Server)` (1–2 letters, consistent)                                        |
| Interfaces     | Big upfront contracts (`UserServiceInterface`) | Small, defined where used (`type Reader interface { Read(p []byte) (int, error) }`) |
| Error returns  | `try/catch` style wrappers                     | Explicit `if err != nil { return ... }`                                             |
| Constructors   | `NewFooBuilder().withX().withY().build()`      | `func NewFoo(x, y int) *Foo` or functional options                                  |
| Naming         | `getUserId()`, `IUserRepository`               | `UserID()` (no get prefix), `UserRepo`                                              |
| Package names  | `utils`, `helpers`, `common`                   | `httpx`, `tokens`, `pipeline` (intent-revealing, no junk drawers)                   |
| Errors         | `panic` for control flow                       | `panic` only for truly unrecoverable; return errors otherwise                       |
| Init           | `func init()` doing real work                  | Avoid `init()`; explicit setup in `main`                                            |

### 2.2 "Accept Interfaces, Return Structs"

```go
// BAD: forces caller to depend on your concrete type, hurts testability
func ProcessFile(f *os.File) error { ... }

// GOOD: accept the smallest interface you actually need
func ProcessFile(r io.Reader) error { ... }
```

Define the interface **on the consumer side**, not the producer side. Java engineers struggle with this — Go interfaces are implicit. Don't pre-declare every interface "in case."

### 2.3 Error Handling at Staff Bar

```go
// Sentinel error: comparable
var ErrNotFound = errors.New("pipeline: not found")

// Typed error: carries context
type ValidationError struct {
    Field   string
    Message string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s: %s", e.Field, e.Message)
}

// Wrap with context — % w preserves the chain
func (s *Service) GetPipeline(ctx context.Context, id string) (*Pipeline, error) {
    p, err := s.db.Get(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("get pipeline %s: %w", id, err)
    }
    return p, nil
}

// Inspect at the call site
if errors.Is(err, ErrNotFound) {           // sentinel
    return http.StatusNotFound
}
var verr *ValidationError                   // typed
if errors.As(err, &verr) {
    return verr.Field
}
```

**Rules:**
- `%w` to wrap, `%v` to embed without wrapping
- `errors.Is` for sentinel comparison, `errors.As` for typed extraction
- Wrap at boundaries that add context (function name, ID), not at every line
- Define sentinels as package-level `var`, typed errors as `struct`

### 2.4 Context — The Most-Misunderstood Thing

```go
// Rule 1: ctx is ALWAYS the first parameter
func (s *Service) DoThing(ctx context.Context, in Input) (Output, error)

// Rule 2: NEVER store ctx in a struct
type Server struct { ctx context.Context }  // ❌ bad; pass it through

// Rule 3: derive child contexts; always cancel
ctx, cancel := context.WithTimeout(parentCtx, 5*time.Second)
defer cancel()  // even if you don't time out — releases resources

// Rule 4: respect cancellation in long loops
for {
    select {
    case <-ctx.Done():
        return ctx.Err()
    case msg := <-ch:
        process(msg)
    }
}

// Rule 5: ctx.Value is for request-scoped data ONLY (request ID, auth principal)
// NOT for passing config, logger, or service dependencies — those go in the struct
```

> 💡 **Staff-level insight:** When asked "how do you implement graceful shutdown?", say: *"Top-level context cancelled by signal handler, propagated to all goroutines, each respects ctx.Done in its select loops, http.Server uses Shutdown(ctx) with a timeout."* That's the staff answer in three sentences.

---

## 3. Concurrency — Where Interviews Are Won or Lost

### 3.1 The Four Patterns You Must Know Cold

#### (a) Worker Pool

```go
func WorkerPool(ctx context.Context, in <-chan Job, workers int) <-chan Result {
    out := make(chan Result)
    var wg sync.WaitGroup

    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            for {
                select {
                case <-ctx.Done():
                    return
                case job, ok := <-in:
                    if !ok { return }
                    select {
                    case out <- process(job):
                    case <-ctx.Done():
                        return
                    }
                }
            }
        }(i)
    }

    go func() {
        wg.Wait()
        close(out)  // close output AFTER all workers done
    }()
    return out
}
```

**Why this is the "right" version**:
- Bounded concurrency (worker count)
- Cancellation respected on both `select`s (input AND output)
- Output channel closed by a single owner (the wg-waiting goroutine)
- Caller can range over `out` and get a clean signal when done

#### (b) Fan-Out / Fan-In

```go
func FanOut(ctx context.Context, in <-chan int, n int) []<-chan int {
    outs := make([]<-chan int, n)
    for i := 0; i < n; i++ {
        c := make(chan int)
        outs[i] = c
        go func(out chan<- int) {
            defer close(out)
            for v := range in {
                select {
                case out <- v * 2:
                case <-ctx.Done():
                    return
                }
            }
        }(c)
    }
    return outs
}

func FanIn(ctx context.Context, ins ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    for _, c := range ins {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for v := range c {
                select {
                case out <- v:
                case <-ctx.Done():
                    return
                }
            }
        }(c)
    }
    go func() { wg.Wait(); close(out) }()
    return out
}
```

#### (c) errgroup — The Modern Standard

```go
import "golang.org/x/sync/errgroup"

func FetchAll(ctx context.Context, urls []string) ([]Resp, error) {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10)  // cap concurrency

    results := make([]Resp, len(urls))
    for i, u := range urls {
        i, u := i, u  // capture (Go 1.22+ no longer needed in for loops)
        g.Go(func() error {
            r, err := fetch(ctx, u)
            if err != nil {
                return err  // first error cancels ctx for all peers
            }
            results[i] = r
            return nil
        })
    }
    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

**Why use errgroup**:
- First error cancels the shared context → other goroutines stop
- `Wait()` returns the first error
- `SetLimit` for bounded concurrency (Go 1.20+)
- Vastly less code than manual WaitGroup + error channel + cancel

> 💡 **Staff-level insight:** If you reach for `sync.WaitGroup` + manual error channel in 2026, you're doing it the 2018 way. `errgroup` is the answer 95% of the time.

#### (d) Pipeline

```go
func Pipeline(ctx context.Context, src <-chan Input) <-chan Output {
    stage1 := stage1Process(ctx, src)
    stage2 := stage2Process(ctx, stage1)
    return stage3Process(ctx, stage2)
}
```

Each stage closes its output channel when its input is exhausted. Cancellation cascades through `ctx`.

### 3.2 Channels — Owner Discipline

The single rule that prevents 90% of channel bugs:

> **The goroutine that creates a channel owns it. The owner is the only one who closes it. Receivers never close.**

If multiple goroutines write to the same channel, none of them owns it — wrap with `sync.WaitGroup` and let a coordinator close after `Wait()` (see Worker Pool above).

### 3.3 Channels vs Mutexes — The Right Tool

| Use a channel when...                        | Use a mutex when...                  |
| -------------------------------------------- | ------------------------------------ |
| Passing ownership of data between goroutines | Protecting shared state read by many |
| Coordinating work (signal, fan-out)          | Caching, counters, maps              |
| Implementing pipelines                       | Internal state of a struct           |

**The famous Rob Pike quote**: *"Don't communicate by sharing memory; share memory by communicating."* But in practice, mutexes are often simpler. Both are correct Go.

### 3.4 The Loop Variable Capture Bug (Pre-Go-1.22)

```go
// PRE-1.22: BUG — all goroutines see the same i
for i := 0; i < 10; i++ {
    go func() { fmt.Println(i) }()  // probably all print 10
}

// PRE-1.22 FIX:
for i := 0; i < 10; i++ {
    i := i  // shadow
    go func() { fmt.Println(i) }()
}

// GO 1.22+: fixed in the language. Each iteration gets its own i.
```

**Interview move**: mention you know about this AND that 1.22 fixed it. Signals you stay current.

### 3.5 Goroutine Leaks — The Production Killer

A goroutine leak happens when a goroutine blocks forever and is never garbage-collected. Common causes:

```go
// LEAK: receiver never reads, sender blocks forever
func Bad(ctx context.Context) {
    ch := make(chan int)
    go func() { ch <- expensive() }()  // blocks here forever if no one reads
    // ... never reads ch ...
}

// FIX: buffered channel OR select with ctx
func Good(ctx context.Context) (int, error) {
    ch := make(chan int, 1)  // buffered: send doesn't block
    go func() { ch <- expensive() }()
    select {
    case v := <-ch:
        return v, nil
    case <-ctx.Done():
        return 0, ctx.Err()  // goroutine still finishes; ch is buffered so it can complete
    }
}
```

**Detect leaks**: `go.uber.org/goleak` in tests, `pprof goroutine` in prod.

### 3.6 Race Conditions

`go test -race` catches most data races. Run it in CI.

```go
// RACE: two goroutines write the same map
m := map[string]int{}
go func() { m["a"] = 1 }()
go func() { m["b"] = 2 }()

// FIX: sync.Map (concurrent-safe) OR mutex
var mu sync.Mutex
go func() { mu.Lock(); m["a"] = 1; mu.Unlock() }()
```

`sync.Map` is for two specific patterns: write-once-read-many, or disjoint key sets per goroutine. Otherwise prefer `map + RWMutex`.

---

## 4. Performance — What Staff Engineers Watch

### 4.1 Allocations Are the Enemy

Go is GC'd. The fastest allocation is the one you don't make.

```go
// BAD: allocates a new []byte every call
func badJoin(parts []string) []byte {
    var out []byte
    for _, p := range parts {
        out = append(out, p...)  // possibly grows many times
    }
    return out
}

// GOOD: pre-size
func goodJoin(parts []string) []byte {
    n := 0
    for _, p := range parts { n += len(p) }
    out := make([]byte, 0, n)  // single allocation
    for _, p := range parts { out = append(out, p...) }
    return out
}
```

### 4.2 sync.Pool for High-Allocation Hot Paths

```go
var bufPool = sync.Pool{
    New: func() any { return new(bytes.Buffer) },
}

func handle(w io.Writer) {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() { buf.Reset(); bufPool.Put(buf) }()  // reset before put!
    // use buf
}
```

**Caveats**: pool entries can be GC'd at any time; not for connection pooling (use a real pool). Profile first — pool overhead can hurt low-throughput paths.

### 4.3 Escape Analysis — Stack vs Heap

```go
// Stack: cheap, freed on return
func stack() int {
    x := 42
    return x  // x stays on stack
}

// Heap: allocated, GC pressure
func heap() *int {
    x := 42
    return &x  // x escapes; goes to heap
}
```

Run `go build -gcflags="-m"` to see escape decisions. Don't over-optimize — but know that returning pointers to locals, putting things in interfaces, and capturing in closures all force heap allocations.

### 4.4 Profiling — `pprof` in 90 Seconds

```go
import _ "net/http/pprof"

go func() {
    log.Println(http.ListenAndServe("localhost:6060", nil))
}()

// Then:
// go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30  (CPU)
// go tool pprof http://localhost:6060/debug/pprof/heap                 (memory)
// go tool pprof http://localhost:6060/debug/pprof/goroutine            (leaks)
// go tool trace ...                                                    (scheduler)
```

**Interview move**: when asked "how would you debug a Go service eating CPU?", lead with `pprof`. Then: flame graph → top function → optimize. Mention you'd compare before/after with benchmarks.

### 4.5 Benchmarks That Matter

```go
func BenchmarkParse(b *testing.B) {
    input := generateInput()
    b.ResetTimer()         // ignore setup
    b.ReportAllocs()       // show allocs/op — critical metric
    for i := 0; i < b.N; i++ {
        _ = Parse(input)
    }
}

// Run: go test -bench=. -benchmem -count=10 | benchstat -
```

Always look at `allocs/op` and `B/op` alongside `ns/op`. Use `benchstat` to compare runs statistically.

---

## 5. Testing at Staff Bar

### 5.1 Table-Driven Tests (The Default)

```go
func TestValidate(t *testing.T) {
    tests := []struct {
        name    string
        input   Pipeline
        wantErr error
    }{
        {"empty name", Pipeline{}, ErrEmptyName},
        {"valid", Pipeline{Name: "x", Source: "k1"}, nil},
        {"bad source", Pipeline{Name: "x", Source: ""}, ErrEmptySource},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()  // run subtests concurrently
            err := Validate(tt.input)
            if !errors.Is(err, tt.wantErr) {
                t.Errorf("got %v, want %v", err, tt.wantErr)
            }
        })
    }
}
```

### 5.2 Test Doubles in Go

```go
// Define interface where used (consumer side)
type pipelineRepo interface {
    Get(ctx context.Context, id string) (*Pipeline, error)
}

type Service struct {
    repo pipelineRepo
}

// In tests, use a fake or generated mock
type fakeRepo struct {
    getFn func(context.Context, string) (*Pipeline, error)
}
func (f *fakeRepo) Get(ctx context.Context, id string) (*Pipeline, error) {
    return f.getFn(ctx, id)
}
```

Prefer **hand-written fakes** for simple cases, **mockgen** (`go.uber.org/mock`) for complex contracts. Avoid mock-everything — integration tests catch what unit tests miss.

### 5.3 testing.T Patterns to Know

- `t.Helper()` in helpers → cleaner failure line numbers
- `t.Cleanup(fn)` → defer-like, but composable
- `t.Parallel()` → speeds up subtests, catches shared-state bugs
- `t.TempDir()` → auto-cleaned temp directory
- `httptest.NewServer` → real HTTP server for integration

---

## 6. Lifecycle — Graceful Shutdown (Common Question)

```go
func main() {
    ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer cancel()

    srv := &http.Server{Addr: ":8080", Handler: router()}
    workers := startBackgroundWorkers(ctx)

    g, gctx := errgroup.WithContext(ctx)

    // HTTP server
    g.Go(func() error {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            return err
        }
        return nil
    })

    // Shutdown coordinator
    g.Go(func() error {
        <-gctx.Done()
        shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        return srv.Shutdown(shutdownCtx)
    })

    // Workers shutdown
    g.Go(func() error {
        <-gctx.Done()
        return workers.Stop(30 * time.Second)
    })

    if err := g.Wait(); err != nil {
        log.Fatalf("shutdown: %v", err)
    }
}
```

This is one of the most common live-coding asks. Memorize the shape. Key points:
- Signal handling via `signal.NotifyContext` (Go 1.16+)
- Separate context for shutdown (with timeout) — don't reuse the cancelled one for `Shutdown`
- Graceful HTTP via `Server.Shutdown`
- Errgroup coordinates all moving parts

---

## 7. Generics — When to Use

Generics arrived in Go 1.18. Use them for:

```go
// Container types
func Filter[T any](in []T, pred func(T) bool) []T {
    out := make([]T, 0, len(in))
    for _, v := range in {
        if pred(v) { out = append(out, v) }
    }
    return out
}

// Generic constraints
type Number interface { ~int | ~int64 | ~float64 }
func Sum[T Number](xs []T) T {
    var sum T
    for _, x := range xs { sum += x }
    return sum
}
```

**Don't use generics for:**
- Business logic with one or two types — just write the function twice
- Replacing interfaces — interfaces still win for polymorphism with behavior
- "It might be reusable someday" — wait until you have 3 use cases

> 💡 **Staff-level insight:** Most Go codebases barely need generics. Knowing when *not* to use them is the senior signal. Say: *"Generics for containers and algorithms — `slices`, `maps`, custom collections. Stick with interfaces for behavior abstraction."*

---

## 8. The Common Live-Coding Asks

Practice writing these on a whiteboard, no IDE, in 20 minutes each.

### 8.1 LRU Cache

```go
type LRU struct {
    cap   int
    mu    sync.Mutex
    ll    *list.List              // doubly linked list (most-recent at front)
    items map[string]*list.Element
}

type entry struct{ k string; v any }

func New(cap int) *LRU {
    return &LRU{cap: cap, ll: list.New(), items: map[string]*list.Element{}}
}

func (c *LRU) Get(k string) (any, bool) {
    c.mu.Lock(); defer c.mu.Unlock()
    e, ok := c.items[k]
    if !ok { return nil, false }
    c.ll.MoveToFront(e)
    return e.Value.(*entry).v, true
}

func (c *LRU) Put(k string, v any) {
    c.mu.Lock(); defer c.mu.Unlock()
    if e, ok := c.items[k]; ok {
        e.Value.(*entry).v = v
        c.ll.MoveToFront(e)
        return
    }
    e := c.ll.PushFront(&entry{k, v})
    c.items[k] = e
    if c.ll.Len() > c.cap {
        oldest := c.ll.Back()
        c.ll.Remove(oldest)
        delete(c.items, oldest.Value.(*entry).k)
    }
}
```

### 8.2 Token-Bucket Rate Limiter

```go
type Bucket struct {
    mu       sync.Mutex
    capacity float64
    tokens   float64
    rate     float64  // tokens per second
    last     time.Time
}

func New(rate, capacity float64) *Bucket {
    return &Bucket{rate: rate, capacity: capacity, tokens: capacity, last: time.Now()}
}

func (b *Bucket) Allow() bool {
    b.mu.Lock(); defer b.mu.Unlock()
    now := time.Now()
    elapsed := now.Sub(b.last).Seconds()
    b.tokens = math.Min(b.capacity, b.tokens + elapsed*b.rate)
    b.last = now
    if b.tokens >= 1 {
        b.tokens--
        return true
    }
    return false
}
```

### 8.3 Concurrent Map with TTL

```go
type item struct { v any; expires time.Time }

type TTLMap struct {
    mu sync.RWMutex
    m  map[string]item
}

func New() *TTLMap {
    t := &TTLMap{m: map[string]item{}}
    go t.gc()  // production: pass ctx; here for brevity
    return t
}

func (t *TTLMap) Set(k string, v any, ttl time.Duration) {
    t.mu.Lock(); defer t.mu.Unlock()
    t.m[k] = item{v, time.Now().Add(ttl)}
}

func (t *TTLMap) Get(k string) (any, bool) {
    t.mu.RLock(); defer t.mu.RUnlock()
    it, ok := t.m[k]
    if !ok || time.Now().After(it.expires) { return nil, false }
    return it.v, true
}

func (t *TTLMap) gc() {
    for range time.Tick(1 * time.Second) {
        now := time.Now()
        t.mu.Lock()
        for k, it := range t.m {
            if now.After(it.expires) { delete(t.m, k) }
        }
        t.mu.Unlock()
    }
}
```

### 8.4 Other Common Asks
- Bounded concurrent crawler (errgroup + visited map)
- Timeout wrapper around an operation
- Graceful HTTP server with middleware
- Producer/consumer with backpressure
- Implement `io.Reader` / `io.Writer` for a custom stream

---

## 9. Gotchas — The 20-Year Veteran's Trap List

### 9.1 `nil` Interfaces Aren't `nil`

```go
var err *MyError = nil
var i error = err
fmt.Println(i == nil)  // false! Interface has a type, even if value is nil
```

**Rule**: return `error` directly, not a typed pointer that's nil. `return nil` if no error.

### 9.2 Slice Sharing Bug

```go
a := []int{1, 2, 3, 4, 5}
b := a[:2]
b = append(b, 99)
fmt.Println(a)  // [1 2 99 4 5] — appended into a's backing array!
```

**Fix**: `b := append([]int(nil), a[:2]...)` to copy, or use full-slice expression `a[:2:2]` to cap capacity.

### 9.3 Range Over Channel + Goroutine Exit

```go
for v := range ch {  // blocks until ch is closed
    process(v)
}
// If no one ever closes ch, this blocks forever — goroutine leak
```

### 9.4 Defer in a Loop

```go
for _, f := range files {
    fp, _ := os.Open(f)
    defer fp.Close()  // ⚠️ all defers fire at function end — file leak in long loops
    // process
}

// FIX: extract to a function
for _, f := range files {
    func() {
        fp, _ := os.Open(f)
        defer fp.Close()
        // process
    }()
}
```

### 9.5 Time Zone & Time.Equal

```go
t1.Equal(t2)  // compares the instant; correct
t1 == t2      // compares ALL fields including monotonic clock — usually wrong
```

### 9.6 JSON Tag Mistakes

```go
type Foo struct {
    Name string `json:"name"`
    Pwd  string `json:"-"`              // never serialize
    Opt  string `json:"opt,omitempty"`  // omit if zero
}
```

`omitempty` doesn't work for non-pointer struct fields (they're never zero in the JSON sense). Use pointers for "really optional."

### 9.7 Interface Method Sets: Pointer vs Value Receivers

```go
type Animal interface { Speak() }

type Dog struct{}
func (d *Dog) Speak() {}  // pointer receiver

var a Animal = Dog{}      // ❌ compile error: Dog doesn't implement Animal
var a Animal = &Dog{}     // ✅ works
```

**Rule**: be consistent — all pointer or all value receivers per type. Pointer is the default unless you have a small immutable value type.

### 9.8 Map Iteration Is Randomized

Go intentionally randomizes map iteration order. Don't rely on order; sort keys explicitly when you need deterministic output (and especially in workflows — see Temporal section).

### 9.9 Closure Over Loop Variable (in goroutines)

Already covered, but worth restating: **pre-Go-1.22 this was THE most common bug.** Know that 1.22 fixed it. If asked which Go version a codebase is on, this matters.

---

## 10. The Lead-Level Verbal Tells

When discussing Go in interviews, sprinkle these to signal real depth:

- "I'd pass `ctx` as the first argument and respect cancellation in the select."
- "I'd use `errgroup` for that — first-error cancellation is what we want."
- "Let me think about who owns this channel and where it gets closed."
- "I'd run `go test -race` in CI; without that we'd ship races."
- "I'd profile first with `pprof` rather than guess at the hot path."
- "I'd avoid `init()` here — explicit setup makes testing easier."
- "I'd accept `io.Reader` not `*os.File` — easier to test, more reusable."
- "Wrap the error with `%w` so the caller can `errors.Is` for the sentinel."
- "I'd worry about a goroutine leak here — let me check the receiver side."

---

## 11. Versus Other Languages (Probable Question)

| Aspect                | Go                            | Java                    | Node.js                    | Rust                   |
| --------------------- | ----------------------------- | ----------------------- | -------------------------- | ---------------------- |
| **Concurrency model** | Goroutines + channels         | Threads + executors     | Single-thread + event loop | Async + ownership      |
| **GC**                | Yes (tuned for low latency)   | Yes                     | Yes (V8)                   | No (compile-time)      |
| **Error handling**    | Explicit return               | Exceptions              | Exceptions / Promises      | `Result<T, E>`         |
| **Generics**          | Limited (1.18+)               | Rich                    | Dynamic                    | Rich                   |
| **Compile time**      | Very fast                     | Slow                    | N/A                        | Slow                   |
| **Best for**          | Backend services, infra, CLIs | Enterprise, large teams | I/O-heavy APIs, glue       | Systems, perf-critical |

**One-liner for "why Go for this work?":** *"Go gives us cheap concurrency for I/O-bound services, fast builds for tight CI loops, a single static binary that deploys trivially, and a strict standard that makes large codebases readable across teams. For control-plane work — lots of network I/O, lots of concurrent reconciliation — it's a near-perfect fit."*

---

## 12. References

- **The Go Programming Language** — Donovan & Kernighan (the canonical book)
- **100 Go Mistakes and How to Avoid Them** — Teiva Harsanyi (single best Go-quality book)
- **Effective Go**: https://go.dev/doc/effective_go
- **Go Blog** (`go.dev/blog`): "Pipelines and cancellation," "Go Concurrency Patterns," "Worked example of context"
- **Dave Cheney's blog**: https://dave.cheney.net (errors, performance, mechanical sympathy)
- **GopherCon talks** on YouTube: search "concurrency", "context", "performance"
- **`golang/go` wiki** — production tips, code review comments

---

## 13. Interview Questions to Expect

### Q1: "Implement a worker pool that processes URLs concurrently with a max of 10 in flight."
**Show:** errgroup + SetLimit, ctx cancellation, returning first error.

### Q2: "Explain how you'd shut down this service gracefully."
**Show:** signal handling, ctx cancellation, server.Shutdown, errgroup, timeout.

### Q3: "Walk me through how Go's GC works."
**Cover:** concurrent mark-and-sweep, tri-color, write barriers, GOGC, that you avoid GC pressure by reducing allocations not by tuning the GC.

### Q4: "Channels vs mutexes — when do you pick which?"
**Cover:** channels for ownership transfer / coordination; mutexes for internal protected state. Don't say "channels always" — that's junior.

### Q5: "How do you find a goroutine leak in production?"
**Cover:** pprof goroutine profile, look for stacks that shouldn't exist, check select statements with no ctx.Done case.

### Q6: "What's the difference between buffered and unbuffered channels?"
**Cover:** unbuffered = synchronous handoff (rendezvous); buffered = decouples up to N. Buffered useful for "send and forget when caller doesn't wait" but be careful — backpressure is what stops cascading failures.

### Q7: "How do you test code that uses time?"
**Cover:** inject a clock interface (`Now() time.Time`), use `clockwork` or hand-rolled fake. Don't do `time.Sleep` in tests — flaky.

### Q8: (curveball) "Why doesn't Go have try/catch?"
**Cover:** explicit error returns force you to handle errors at every site, exceptions hide control flow. Trade-off: more verbose. Most senior Go engineers see this as a feature, not a bug.

---

## 14. Common Mistakes Lead Candidates Make

| Mistake                                                  | Fix                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| Reaching for raw `sync.WaitGroup` when `errgroup` fits   | Use errgroup; signals current Go knowledge                         |
| Forgetting `defer cancel()` after `WithTimeout`          | Always pair them                                                   |
| Using `interface{}` / `any` everywhere                   | Type properly; use generics if truly needed                        |
| Catching panics with `recover()` for normal control flow | Errors only; recover in top-level handlers / supervisor goroutines |
| `time.Sleep` in production code                          | Use `select` with `time.After` or `ctx.Done`                       |
| `fmt.Println` for logging                                | Structured logging (`slog` from 1.21+, or `zap`/`zerolog`)         |
| Not respecting ctx in long-running loops                 | Always have `<-ctx.Done()` in select                               |
| Mocking the world                                        | Prefer integration tests + fakes over heavy mocking                |

---

## 15. The 30-Second Self-Pitch on Go

> *"I've been writing Go in production for years — primarily backend services with heavy concurrency. I'm strong on the things that bite teams at scale: context propagation, goroutine lifecycle, cancellation, error wrapping, and graceful shutdown. I default to errgroup over hand-rolled WaitGroups, accept interfaces and return structs, and I run `-race` in CI because I've been bitten by data races more than once. I treat profiling with pprof as a normal part of debugging, not a last resort."*

---

## 16. The 7-Day Go Drill

| Day | Practice                                                                |
| --- | ----------------------------------------------------------------------- |
| 1   | Re-implement worker pool, fan-out/fan-in, errgroup pipeline from memory |
| 2   | Live-code LRU cache + token bucket rate limiter                         |
| 3   | Live-code graceful shutdown HTTP server with workers                    |
| 4   | Read 5 chapters from *100 Go Mistakes* — focus on concurrency + errors  |
| 5   | Profile a small service with pprof; reduce allocs by 50%                |
| 6   | Write table-driven tests with t.Parallel + a hand-rolled fake           |
| 7   | Mock interview: 45-min Go problem, no IDE — Excalidraw + a peer         |

---
