---
title: Behavior Star L
difficulty: intermediate
---
Goal: by the end of this, you can deliver behavioral answers that signal **Lead Software Engineer** to a New Relic interviewer — not "senior who's been around a while." This is the round that most experienced engineers underprepare and where the title decision is often made.

---

## 1. Why Behavioral Decides the Title

Coding rounds tell them: "can he code?"
Design rounds tell them: "can he architect?"
Behavioral rounds tell them: **"is he Lead-level, or is he a strong Senior?"**

The same person, with the same projects, can come across as either depending on how they tell the story. Lead-level means:

- **Scope**: cross-team, cross-org, multi-quarter — not "I shipped a feature"
- **Influence without authority**: convinced peers/leadership, not "my manager told me to"
- **Trade-off thinking**: chose A over B for *these* reasons, accepted *this* cost
- **Outcomes, not activities**: "reduced p99 by 60%" not "I refactored the API layer"
- **Lessons + reflection**: what would you do differently, what did the team learn

> 💡 **Staff-level insight:** The interviewer is mentally filling a scorecard. Each story you tell should tick 2–3 boxes on it: technical depth, leadership, communication, ownership, judgment. A great story without an outcome ticks zero boxes. Always land the outcome.

---

## 2. The STAR-L Framework — Tuned for Lead

| Letter            | What it is                                       | Time budget (4-min answer) |
| ----------------- | ------------------------------------------------ | -------------------------- |
| **S** — Situation | Context: team, system, scale, constraints        | 30s                        |
| **T** — Task      | What was your responsibility / the problem       | 20s                        |
| **A** — Action    | **What YOU did** (not "we")                      | 2 min                      |
| **R** — Result    | Measurable outcome + business impact             | 45s                        |
| **L** — Learnings | What you'd do differently / what you generalized | 30s                        |

**The two most-fumbled parts:**
1. **A**: candidates say "we" when interviewers want "I." Be specific about your contribution within team work. "I drove X. Two engineers built Y under my technical direction. I did the design review with the staff engineer in the platform team."
2. **L**: most candidates skip this. The L is what separates Lead from Senior. *Always include it.*

---

## 3. The Story Inventory — What You Need

You need **8–10 stories** total, but each one should map to **multiple themes** (interviewers ask different angles of the same situation). Aim for stories that cover the matrix below.

### 3.1 Theme Matrix

| Theme                                | What they're probing                                       |
| ------------------------------------ | ---------------------------------------------------------- |
| **Technical leadership**             | Drove a major design decision; wrote/championed an RFC     |
| **Cross-team influence**             | Got peers in another team to change their plan             |
| **Disagreement / conflict**          | Pushed back on a senior person; resolved a peer conflict   |
| **Production incident / on-call**    | 3 AM page; root caused; long-term fix                      |
| **Mentoring / growing others**       | Specific person, specific growth, specific outcome         |
| **Ownership of failure**             | Something you broke / missed; how you handled it           |
| **Saying no / scope reduction**      | Killed or descoped a feature with reasoning                |
| **Migration / legacy modernization** | Strangler fig, rollout, risk management                    |
| **Ambiguous / undefined problem**    | No spec, you defined it                                    |
| **Customer empathy**                 | Talked to users, changed direction based on what you heard |

### 3.2 Inventory Template (Build This Today)

| #   | One-line title                                           | Themes covered                        | Quantified outcome                       |
| --- | -------------------------------------------------------- | ------------------------------------- | ---------------------------------------- |
| 1   | Migrated SOAR-lite from monolith to event-driven (Kafka) | Tech leadership, migration, ambiguity | 70% latency reduction; 5 teams unblocked |
| 2   | Designed Kafka consumer proxy after 3 outages            | Incident, RFC, cross-team             | Zero rebalance outages in 6 months       |
| 3   | Pushed back on Postgres-as-queue, proposed RabbitMQ      | Disagreement, judgment                | Avoided $X migration; saved 2 quarters   |
| 4   | On-call: cascading destination failures                  | Production, RCA                       | Built circuit breaker; MTTR 45m → 4m     |
| 5   | Mentored junior into running her own design review       | Mentorship                            | Promoted to mid-level in 9 months        |
| 6   | Killed planned feature after 3 customer interviews       | Saying no, customer                   | Pivoted team to feature with 5x adoption |
| 7   | Owned regression that broke a customer's SLA             | Failure ownership                     | Wrote post-mortem; led blameless review  |
| 8   | Drove cross-team incident response framework             | Influence, scope                      | Adopted by 4 teams; reduced MTTR 30%     |

> Fill this out for **your** career today. The act of writing it forces you to find your strongest material. Most senior engineers underestimate how good their stories are because they've never enumerated them.

---

## 4. The Anti-Patterns That Kill You

| Anti-pattern                    | What it sounds like                                                   | Fix                                                                                            |
| ------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **The "we" trap**               | "We decided..., we built..., we shipped..."                           | "I proposed... I led the design review where we decided..."                                    |
| **The activity dump**           | "I refactored the auth layer, then I added tests, then I deployed..." | Frame as a problem → decision → outcome, not a Jira log                                        |
| **The hero narrative**          | "I single-handedly rebuilt the entire system..."                      | Credit the team explicitly; clarify *your* contribution                                        |
| **The vague impact**            | "It was a big improvement to performance"                             | "p99 dropped from 800ms to 120ms; saved $40k/yr in infra"                                      |
| **The 12-minute story**         | Wandering, no climax                                                  | Stick to the 4-min budget. Interviewer asks for more if interested.                            |
| **The brag without trade-off**  | "We chose Kafka because it's the best"                                | "We chose Kafka over RabbitMQ; we accepted higher ops complexity for the throughput we needed" |
| **The "perfect outcome" story** | Everything went great, no learnings                                   | Include what didn't work; what you'd do differently                                            |
| **The interview prep tell**     | "Per the STAR framework..."                                           | Just tell the story. Don't narrate the framework.                                              |

---

## 5. A Worked Example (End-to-End)

I'll use a fictional scenario you can map to your own work. Let's pretend you led the Kafka consumer proxy work in your notes.

### The interviewer asks:
> *"Tell me about a time you drove a significant technical decision across teams."*

### A weak version (Senior level):

> *"At my last company, we had problems with our Kafka consumers. They kept rebalancing and causing outages. So I designed a consumer proxy that decoupled the consumers from Kafka. We built it and it worked well. The team was happy with it."*

What's wrong: no scale, no scope, no trade-offs, no influence, no metrics, no learning. This sounds like a competent senior engineer. Not Lead.

### A strong version (Lead level):

**Situation (30s):**
> "About a year ago, our destination services — about 40 microservices that consume from Kafka and write to customer endpoints like Splunk and MS Sentinel — were causing roughly one P1 incident per month. The trigger was always the same: a slow consumer would hold up its partition, the consumer group would rebalance, and we'd cascade into a 20-minute outage. We're talking ~500K events/sec at peak across these services."

**Task (20s):**
> "I was the senior backend engineer on the destinations team. There was no formal mandate to fix this — leadership knew it was painful but it had been classified as 'cost of doing business.' I decided to make it my problem because we were burning ~3 engineer-weeks per incident on response and post-mortem."

**Action (2 min — *the meat*):**
> "First, I spent two weeks doing actual data analysis. I pulled six months of incident data and showed that 80% of rebalances came from one of three failure modes: slow downstream APIs, OOM kills, and bad deploys. That data was important — it shifted the conversation from 'Kafka is flaky' to 'we have a coupling problem.'
>
> I then drafted an RFC for a **consumer proxy**: a thin Go service that owned the Kafka consumer connections, buffered locally, and exposed a gRPC interface to the destination services. The destinations became stateless workers — they could crash, restart, or scale without triggering rebalances.
>
> The hard part wasn't the design — it was the politics. Two teams pushed back. The platform team wanted us to use a managed Kafka client they were building. The streaming team thought a proxy was an anti-pattern. I did three things:
>
> One, I ran a one-week prototype with one destination service and showed a 90% reduction in rebalances on a synthetic load test. Real numbers killed most of the abstract objections.
>
> Two, I rewrote the RFC with explicit trade-offs — the proxy added a network hop and ~5ms latency, it required us to operate a new service, and it introduced a new failure mode if the proxy itself died. I didn't hide these. I argued they were acceptable given our problem.
>
> Three, I scoped a phased rollout — one service first, then five, then the rest. I let the platform team's managed client be the future migration path; the proxy was an intermediate step. That gave them a face-saving win.
>
> The build itself was four engineers over three months. I architected it, wrote the core proxy code, and reviewed every PR. Two engineers built the gRPC interface and the buffering. One engineer built the rollout automation."

**Result (45s):**
> "We rolled out across all 40 services over two quarters. Rebalance-triggered incidents went from one a month to zero in the six months after full rollout. MTTR for the incidents we *did* still have dropped from 45 minutes to about four — because the proxy isolated the failure to a single service. Conservatively, we saved about 30 engineer-weeks of incident response per year. The pattern got picked up by another team for their own use case."

**Learnings (30s):**
> "Two things I'd do differently. One, I underestimated how much operating the proxy itself would cost — we ended up needing a dedicated on-call rotation for it within six months, which I hadn't sized. Two, I rolled it out service-by-service when I could have batched the last 20. The phased rollout was the right call for the first 10 services where we were learning, but I burned an extra month being cautious past that point. The bigger lesson I generalized was: **when you're proposing a controversial design, prototype before you RFC**. Numbers from running code beat a 10-page document every time."

### Why this version works
- **Scope**: 40 services, 500K events/sec, a year of work
- **You vs we**: explicit about what *you* did, what others did
- **Influence**: how you handled two pushback teams
- **Trade-offs**: stated explicitly (latency, ops cost, new failure mode)
- **Outcome**: quantified — incidents, MTTR, eng-weeks saved
- **Learnings**: two specific things, plus a generalized principle
- **Time**: ~4 minutes total — interviewer can ask follow-ups

---

## 6. The Story Build Worksheet

For each of your 8–10 stories, fill this out. Keep it under one page each.

```
Title: ____________________________________________
Themes: __________________________________________
One-line outcome: _________________________________

SITUATION (30s):
- Team / company context
- System / scale (numbers!)
- Why it mattered (cost? incidents? blocker?)

TASK (20s):
- What was YOUR role
- Was this assigned or did you self-direct?

ACTION (2 min) — The story, with these beats:
- The decision point (what choice did you face?)
- The data / analysis you did before deciding
- The trade-offs you weighed (alternatives considered + rejected, with reasons)
- How you got buy-in (who pushed back, how you handled it)
- Your specific contribution vs the team's
- Anything that went wrong mid-flight

RESULT (45s):
- Quantified business outcome
- Quantified technical outcome
- Second-order effects (did pattern spread? team grew? customer reaction?)

LEARNINGS (30s):
- 1-2 specific things you'd do differently
- The generalized principle you took forward
- (Optional) where you've since applied this lesson
```

---

## 7. The Question → Story Map

Most behavioral questions are variations on a small number of themes. Practice mapping:

| Question phrasing                                      | Maps to theme        | Pull from                  |
| ------------------------------------------------------ | -------------------- | -------------------------- |
| "Tell me about your most impactful project"            | Tech leadership      | Story #1 or #2             |
| "Time you disagreed with someone"                      | Disagreement         | Story #3                   |
| "Time you failed / something didn't go as planned"     | Ownership of failure | Story #7                   |
| "How do you mentor junior engineers?"                  | Mentorship           | Story #5                   |
| "Time you had to make a decision with incomplete info" | Ambiguity            | Story #1 or #6             |
| "Hardest production issue you've debugged"             | Incident             | Story #4                   |
| "Time you influenced without authority"                | Cross-team           | Story #2 or #8             |
| "Time you said no"                                     | Saying no            | Story #6                   |
| "How do you handle conflict?"                          | Disagreement         | Story #3                   |
| "What are you most proud of?"                          | Tech leadership      | Strongest story            |
| "What would you do differently in your career?"        | Reflection           | Use Learnings from a story |

> 💡 **Staff-level insight:** Same story can answer 3–4 different questions if you re-frame the opening sentence. "Tell me about a disagreement" and "tell me about influencing without authority" can both be answered with the same proxy story — you just lead with the disagreement angle in one and the persuasion angle in the other.

---

## 8. New Relic-Specific Behavioral Probes

Given the JD ("you build it, you run it", DevOps, on-call, mentorship), expect these specifically:

### Q1: "Tell me about an on-call incident where you owned both the response and the long-term fix."
**Hit these notes:** initial triage steps, blast radius assessment, communication during the incident (status updates, customer notifications), RCA quality, the *long-term* fix you drove (not just the patch), and how you reduced future on-call burden.

### Q2: "How do you decide what to alert on vs what to log?"
**Hit these notes:** SLO-based alerting, alert fatigue as a real cost, "every alert should be actionable," runbooks, and a specific story where you tuned alerts for your team.

### Q3: "Tell me about a time you mentored someone."
**Hit these notes:** *one specific person*, the gap they had, what you did concretely (not "I gave feedback" — "I pair-programmed for two weeks on Y, then had her run her own design review on Z"), the outcome (promotion, project they led, etc.).

### Q4: "How do you balance tech debt vs feature work?"
**Hit these notes:** a framework you've used (e.g., 20% of every sprint, or paying down debt that blocks the next feature, or treating reliability as a feature), AND a specific story where you successfully advocated for paying down debt.

### Q5: "Tell me about a time you disagreed with a more senior engineer."
**Hit these notes:** specific technical disagreement (not personality), how you brought data, how you respected their experience while pushing back, the resolution (could be either way — sometimes you change your mind, that's also a good story).

### Q6: "Why New Relic?"
**Hit these notes:** Don't waste this question. Tie to (1) observability matters for the control-plane work you're describing, (2) "you build it, you run it" matches your operating philosophy, (3) Go-first stack matches your strength, (4) something specific you read about their engineering blog or product. Avoid generic flattery.

---

## 9. Delivery Mechanics (The Things Coaches Don't Tell You)

| Habit                                        | Why                                                                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Pause before you start**                   | 5 seconds of thinking beats 30 seconds of "umm." Say "let me think of a good example" — it's professional, not weak. |
| **Signpost transitions**                     | "So that's the situation. The decision I had to make was..." — helps the interviewer follow + take notes             |
| **Drop one number per minute**               | Anchors the story in reality. "About 40 services," "p99 was 800ms," "took three months."                             |
| **Explicitly name trade-offs**               | "We accepted X cost to get Y benefit." Single most-Senior-vs-Lead-distinguishing habit.                              |
| **Stop on time**                             | If you've been talking 4 minutes, end. Don't backfill. Let them ask for more.                                        |
| **Don't be the smartest person in the room** | Credit teammates by name (or role). "The platform engineer caught a flaw I'd missed."                                |
| **Have one self-deprecating moment**         | Where you got something wrong or learned late. Builds credibility, makes the wins more believable.                   |

---

## 10. Common Mistakes Lead Candidates Make

| Mistake                                   | What to do                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| Telling Senior-level stories              | Pick stories that affected ≥2 teams or ≥6 month timelines               |
| All wins, no learnings                    | Every story needs at least one "what I'd do differently"                |
| Vague metrics ("a lot," "much faster")    | Hard numbers or honest estimates ("about 30%")                          |
| Skipping the data/analysis step           | Lead engineers do diligence before deciding — show that work            |
| Not mentioning customer / business impact | Always tie back: "this mattered because customers were experiencing..." |
| Soft on disagreement stories              | Don't sanitize. Real disagreements with real resolutions.               |
| Forgetting the L                          | Add 30 seconds of reflection to every story                             |
| One-dimensional stories                   | Each story should hit 2–3 themes (tech + leadership + outcome)          |

---

## 11. The Pre-Interview Drill (Day Before)

1. **Print your inventory table** (Section 3.2). 8–10 stories on one page.
2. **Pick your top 3** — the ones you can tell in your sleep, with strongest outcomes. These are your default answers.
3. **Pick 1–2 backups** for each common theme — for when an interviewer pushes "tell me a *different* story."
4. **Practice the opening sentence** of your top 3 out loud. The first 30 seconds set the tone.
5. **Time yourself**: each story under 5 minutes including follow-ups.
6. **Prepare your "why New Relic"** in 60 seconds. Specific. Not generic.
7. **Prepare 3 questions to ask each interviewer.** (See list below.)

---

## 12. Questions to Ask Them (Lead-Level Signal)

Asking dumb questions leaks junior. Ask these:

- "What does success look like for this role at 6 months and at 18 months?"
- "What's the team's biggest piece of tech debt that, if fixed, would unlock the most velocity?"
- "How is on-call structured? What's the typical page volume per week?"
- "How are technical decisions documented and revisited? Do you use ADRs/RFCs?"
- "Where on the maturity curve is the control plane today — greenfield, growing pains, or mature with refactor needs?"
- "What's the relationship between this team and the data plane teams? How do conflicts get resolved?"
- "What would you change about how this team works if you could?" (asking the manager — this is gold)
- "What's the most surprising thing about working at New Relic that I wouldn't learn from the website?"

> 💡 **Staff-level insight:** Asking about *failure modes of the team/role* — tech debt, conflicts, what they'd change — signals you're evaluating fit, not just hoping for an offer. That confidence reads as Lead.

---

## 13. References

- *Cracking the PM Interview* — Gayle McDowell (the behavioral chapters apply directly)
- *Staff Engineer* — Will Larson (chapters on scope, influence, writing) — single best book for this
- *The Manager's Path* — Camille Fournier (chapter on tech leadership without people management)
- **Lara Hogan**'s blog on managing up and influence: https://larahogan.me
- **Will Larson's blog**: https://lethain.com — search "staff engineer"
- **Charity Majors** on observability + on-call culture: https://charity.wtf — read her, *before* the New Relic interview

---

## 14. Interview Questions to Practice

Stand up, set a 5-minute timer, answer each out loud. Record yourself once if you can stand it.

1. Walk me through a project where you owned the design end-to-end.
2. Tell me about a time you disagreed with a manager or senior engineer.
3. Describe an incident you were on-call for that taught you something.
4. Tell me about a time you said no to a feature or scope.
5. How have you grown another engineer? Be specific.
6. Tell me about a time you got something wrong.
7. Tell me about a time you had to make a decision without enough information.
8. How do you decide what to work on when everything is on fire?
9. Tell me about influencing a team or org without formal authority.
10. What's a piece of your past work you'd architect differently today?

---

## 15. The 30-Second Self-Pitch (Your Opening)

Many interviews start with "tell me about yourself." Have this drilled:

> *"I'm a backend engineer with 10 years of experience, mostly in Go, building distributed systems at production scale. The last few years I've focused on event-driven architectures with Kafka — designing systems that operate hundreds of services end-to-end. I'm at the point where I want to lead larger technical scope: owning the architecture for a control-plane-sized system, mentoring engineers around me, and being on-call for what I build. New Relic's pipeline control plane work matches that exactly, which is why I'm here."*

Tune the wording to your real background — but keep that arc: experience → focus area → what you want next → why this role.

---

## What to Do This Week

1. **Today**: fill out the inventory table (Section 3.2) for your real career. Don't overthink it — get 10 candidates down.
2. **Tomorrow**: write up your top 3 in full STAR-L (Section 6 worksheet).
3. **Day 3–4**: write up your remaining 5–7 in shorter form.
4. **Day 5**: practice telling the top 3 out loud, timed.
5. **Day 6**: do a mock with a peer or recorded.
6. **Day 7**: revise based on what was awkward.

---
