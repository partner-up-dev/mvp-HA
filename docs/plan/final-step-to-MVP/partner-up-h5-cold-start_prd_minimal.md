# PartnerUp H5 Client – L1 PRD (Iteration v3 – Density + Batching + L2 Preparation)

## 1. Product Positioning (L1 Context)

This H5 client is not:

- A social platform
- A continuous open marketplace
- A user-identity-based network

It is:

> A liquidity compression and trust-triggering interface embedded into predefined offline micro-events.

Goal at L1:
Validate that fixed-time, fixed-location, fixed-theme events can reliably:

1. Reach minimum group size
2. Maintain controllable attendance
3. Generate repeat participation

(Aligned with Cold Start L1 strategic baseline.)

---

## 2. Design Principles

1. Login remains optional for browsing/creation, but participation actions require WeChat OpenID binding
2. No profile feed
3. No open browsing marketplace
4. Extremely low cognitive load

Identity Rule:

- At L1, all PR participation actions require login (OpenID bound): join / exit / confirm / check-in.
- Community PR can still be explored and shared without login.

1. Status becomes:

- PR remains **OPEN** as long as current < max and join is allowed.
- When current ≥ min, PR enters **READY** ("Min reached"), and join remains open.
- When current == max → **FULL**.
- When event window starts (from READY/FULL), PR enters **ACTIVE**.
- When event window ends, PR enters **EXPIRED**.

Rationale:
READY communicates viability before the event starts.  
ACTIVE communicates "in progress" timing and supports downstream operational rules.

System behavior:

- Real-time slot counter update
- Visual signal when minimum is reached

---

### 5.2 Confirmation Mechanism (Reliability-Controlled + Late Join Logic)

Pure H5 cannot push reminders.
Attendance reliability becomes noisy.

L1 introduces WeChat login as a participation baseline.

Flow:

1. Open inside WeChat
2. One-click login (OpenID bind)
3. Optional subscription to official account notification

Reminder schedule (for normal joins):

- T-24h reminder
- T-2h reminder

If not confirmed by T-1h:

- Slot auto-released

---

Late Join Case (Edge Condition)

If user joins after T-1h:

Case 1 — Join between T-1h and T-30min:

- Immediate confirmation required
- "Join" and "Confirm" merged into one action
- Slot counts as CONFIRMED instantly

Case 2 — Join after T-30min:
→ Disallow join (event locked)

Reason:

- Protect synchronization
- Avoid unreliable arrivals
- Maintain controllable attendance metric
- Preserve fairness for confirmed participants

Reliability measurement accuracy remains prioritized.

This prepares infrastructure for L2 while preserving L1 experimental integrity.

---

### 5.3 Check-in (Trust Return Loop)

Check-in is optional.

Reality constraint:

- Some venues may not allow QR placement
- Some scenes are mobile (e.g., commuting)

Mechanisms:

Option A — QR On-site Check-in

- "Arrived" button
- Timestamp recorded

Option B — Self-Report After Event

- "Did you attend?" (Yes / No)
- "Would you join again?" (Yes / No)

Check-in is not mandatory for PR completion.

Purpose:

- Approximate attendance rate
- Capture repeat intent

We accept slight measurement noise in exchange for operational flexibility.

Offline trust should flow back into product memory.&#x20;

---

## 6. State Machine + Batching Model

### 6.1 PR State vs Slot State

PR State (object-level):
DRAFT
→ OPEN
→ READY (min reached, join still open)
→ FULL (max reached)
→ ACTIVE (event window started)
→ EXPIRED
→ CLOSED

Slot State (per participant):
JOINED
→ CONFIRMED
→ RELEASED
→ ATTENDED (optional)

Note:

- CONFIRMED is used for reliability control (Section 5.2)
- PR readiness is based on joined count, not confirmed count (to avoid late-confirm measurement bias)

Important:
PR state is derived from aggregated slot states.
Example:

- When joined slots ≥ min → PR becomes READY (still joinable)
- When joined slots == max → PR becomes FULL

PR is structural.
Slot state represents individual commitment.

---

### 6.2 Anchor Event Batching + Capacity Strategy

#### Hierarchy

Anchor Event (locks **type**, provides a pool of locations and time windows)
├── Anchor Event Batch (locks **time window**; batch full = no more available locations under this time window)
│   ├── Anchor PR #1 (locks **location** + time window)
│   ├── Anchor PR #2 (locks **location** + time window)
│   └── ...
├── Anchor Event Batch (different time window)
│   ├── Anchor PR ...
│   └── ...
└── ...

Key distinctions:

- **Anchor Event** = a type of activity (e.g., badminton, KTV, running). It defines the pool of available locations and time windows.
- **Anchor Event Batch** = a specific time window within an Anchor Event. It draws from the Anchor Event's location pool.
- **Anchor PR** = a concrete partner request that locks both a specific location and the batch's time window.

#### When an Anchor PR becomes FULL

System behavior can combine three mechanisms simultaneously:

Option A — Mark Current Anchor PR as FULL

- Current PR becomes FULL
- Remains visible for transparency

Option B — Auto-create New Anchor PR Under Same Batch

- Triggered automatically when an Anchor PR reaches max capacity
- The new PR is created from the **same Anchor Event Batch** (same time window)
- Assigns a **different available location** from the Anchor Event's location pool
- current reset to 0

Option C — Suggest Alternative Anchor Event Batch

- Shown when user views a FULL Anchor PR
- Suggests batches with a **different time window** but the **same location** (or nearby locations)
- If user accepts, a **new batch** is created (if not already existing for that time window), a **new Anchor PR** is created under it, and the user is **automatically joined**

These three are not mutually exclusive.
They operate together to preserve liquidity surface.

#### Special Case — Anchor Event Fully Exhausted

When: all time windows × all locations are occupied → no more available batches can be created.

System behavior:

1. **Prompt user to subscribe** to the WeChat Official Account for notifications when capacity becomes available (e.g., slot released, new Anchor PR created under this event).
2. **Prompt user to discover other types of events** at the Event Plaza page.

Analytics separation:

- Anchor Event density
- Batch fill rate
- Cross-batch suggestion conversion
- Exhaustion → subscription conversion rate

---

## 7. Venue Responsibility + Incentive Structure + Payment Model

For Anchor PR:

System responsibility includes:

- Venue reservation (if required)
- Resource booking (court, table, room, etc.)
- Discount arrangement (e.g., 20% off badminton court)
- Optional bundled consumption (e.g., tea set for salon event)

Users are NOT responsible for:

- Booking venue
- Negotiating discount
- Handling logistics

This must be explicitly shown on PR page:

- "Venue reserved by PartnerUp"
- "Exclusive discount applied"
- "How payment works" (clear rule per event)

---

### 7.1 Payment Application Models (Operational Clarified Strategy)

At L1 / Early L2 stage:

Model C — Platform Fully Subsidizes (Free Event)
Condition:

- cost\_per\_person ≤ 12 CNY

Clarification:

- Location, venue, and max capacity are fixed in advance.
- No dynamic subsidy pool logic is required.
- No risk of "budget exhaustion" inside a single Anchor Event.

Typical scenarios:

- Tea session (each participant chooses beverage ≤ 12 CNY, or average ≤ 12 CNY)
- Low-cost campus court session

Operational complexity differs by scene:

- Some resources ordered on-site (e.g., beverage)
- Some resources require advance booking (e.g., badminton court one week earlier)

Risk consideration:
Platform may prepay or reserve resource before attendance certainty.
This creates no-show risk.

Therefore, Model C requires:

- Reliable confirmation mechanism (Section 5.2)
- Lock join after T-30min
- Clear cancellation window before booking deadline (if applicable)

---

Model A — User Pays Merchant Directly (Reimbursement Model)
Use case:

- User-customized location (e.g., different badminton court)
- Venue not reserved by platform

Mechanism:

- User pays merchant directly
- After PR status becomes EXPIRED (activity finished), reimbursement process may begin for eligible attendees
- If PR becomes EXPIRED due to cancellation or failure to reach min, reimbursement not applicable

Rules:

- Anchor Event defines default discount\_rate and subsidy\_cap
- Anchor Event Batch can override discount\_rate and subsidy\_cap
- PR settlement uses resolved policy: `batch override > event default`
- reimbursement = min(actual\_cost × resolved discount\_rate, resolved subsidy\_cap)

Important:
Reimbursement REQUIRES attendance confirmation.
Only participants with slot status = ATTENDED can request reimbursement, and only when PR successfully occurred (not cancelled).

Model B (Platform prepay + collect from users) remains excluded at L1.

---

Model B — Platform Prepays / Reserves, Then Collects From Users

- Platform pays venue in advance (or signs agreement)
- Users pay platform (possibly via WeChat Pay)

Pros:

- Strong control
- Clean user experience
- Scalable for L2

Cons:

- Cash flow risk
- Attendance uncertainty risk

---

Model C — Platform Fully Subsidizes (Free Event)

- Platform covers venue cost
- User pays 0

Pros:

- Maximum join conversion
- Strong trust signal
- Useful for early density seeding

Cons:

- Burn rate
- Cannot scale long-term

---

### 7.2 L1 Strategic Clarification

Cold Start Logic:

- ≤ 12 CNY per person → Model C
- User-selected venue → Model A
- No prepay model at L1

Economic control is necessary but must not introduce heavy operational noise.

Model A is acceptable if:

- Reimbursement process is semi-automated
- Subsidy cap is strictly enforced
- Event default + optional batch override define discount\_rate in advance

---

- no receipt\_upload field in H5 (Model A uses WeCom customer service chat to collect bill materials)
- reimbursement\_amount (calculated)
- reimbursement\_status (none | pending | approved | rejected | paid)

---

### 8.1 Product Requirements to Support Model C

Model C does NOT require dynamic subsidy budget tracking.

Required capabilities:

1. Keep a lightweight entry card on PR detail page, and show full economic rules on a dedicated rule page:

   - "Free for participants"
   - Per-person limit (≤ 12 CNY)
   - Any selection constraints

2. Booking deadline field in Anchor Event:

   - resource\_booking\_deadline
   - e.g., "Court booked 7 days before event"

3. Cancellation policy display:

   - If user releases before confirmation deadline → no risk
   - At booking deadline, apply the same auto-release effect as T-1h for unconfirmed slots (idempotent)
   - After booking deadline, confirmed slots are locked from manual release

4. Admin-side manual booking checklist (operational, not system-complex)

Model C relies more on operational discipline than complex financial system.

---

### 8.2 Product Requirements to Support Model A (WeChat Ecosystem First)

Instead of building a heavy internal admin backend at L1,
leverage WeChat ecosystem tools:

H5 Requirements:

1. Simple "Apply for Reimbursement" button (visible only when PR is ended (`EXPIRED`/`CLOSED`) and current user's slot status = `ATTENDED`)

2. Redirect to:

   - WeCom service account (cause only this channel can make transfer to user)

3. Copy the PR link for user and prompt user to send this in WeCom customer service chat

Bill handling (via WeCom customer service):

- No receipt upload form in H5
- User sends bill details/materials in WeCom customer service chat
- Manual review by operations
- Manual transfer via WeChat Pay

System-side minimal tracking:
Slot fields:

- reimbursement\_requested (boolean)
- reimbursement\_status (none | pending | approved | paid | rejected)

No full admin dashboard required at L1.
WeChat becomes lightweight operations backend.

---

Economic layer affects:

- Join seriousness
- Attendance reliability (Model C risk)
- User trust perception
- Platform burn rate control

---

Economic layer affects:

- Join seriousness
- Attendance reliability
- User trust perception
- Platform burn rate control

Payment + subsidy become behavioral levers, not just accounting tools.

---

---

Venue + discount are first-class properties of Anchor Event, with optional per-batch overrides.

---

## 9. Safety (Minimal but Non-Negotiable) (Minimal but Non-Negotiable)

L1 Safety Baseline:

- Public venue only
- Clear written rules
- Report button (simple form)

No complex identity verification yet.
But visible safety posture must exist.

---

## 8. Metrics (Embedded Instrumentation)

H5 must record:

1. Page views
2. Join conversion rate
3. Min-group success rate
4. Confirmation rate
5. Actual check-in rate
6. Repeat join within 14 days

These correspond directly to L1 validation criteria.&#x20;

No vanity metrics.

---

## 9. Explicitly Not in L1

- No algorithmic matching
- No recommendation feed
- No user browsing marketplace
- No DM system
- No profile graph
- No cross-campus visibility

Marketplace is derivative layer, not entry point.&#x20;

---

## 10. Definition of Success (L1 + L2 Preparation)

L1 Structural Success:

1. ≥ 60% of Anchor Events reach minimum size without manual push
2. ≥ 70% of confirmed users check in
3. ≥ 30% of participants join another Anchor Event within 14 days

Community PR Metrics (Exploratory Only):

- Share-to-join conversion
- Fill rate per PR
- Natural scenario diversity

L2 Readiness Indicators:

- Anchor Event can self-replicate via batching
- Homepage traffic converts without offline push
- Confirmation system maintains reliability > 65%

If structural metrics fail:
Do not add features.
Re-adjust constraint design.

---

## 11. One-Line Product Identity (L1)

At L1 stage, this H5 is:

> A batched liquidity engine with controlled reliability enforcement.

It supports:

- Anchor density experiments
- Controlled user-generated PR observation

It is not yet:

- A full marketplace
- A social graph product

---

## 12. Risk Control Notes

Allowing Community PR introduces risks:

1. Visible zero-response PR
2. Social discouragement
3. Low fill optics

Mitigations:

- No global feed
- No exposure without share
- Auto-hide PR with 0 joins after configurable time
- Separate analytics pipeline from Anchor PR

Anchor PR remains the structural density experiment core.

---

## 13. L1 → L2 Structural Preparation Layer

L1 validates density.
L2 requires scalable coordination.

Preparation must happen quietly during L1.

### 13.1 Identity Foundation

At L1:

- All PR participation actions require OpenID binding.
- Community PR remains discoverable/shareable without login.

System must internally support:

- Stable OpenID binding
- Cross-event participation history
- Slot reliability scoring (internal only)

L2 will require:

- Persistent user identity
- Reputation abstraction
- Reliability weighting in batching

L1 must not block this evolution.

---

### 13.2 Event Template System

Anchor Events should be built from reusable templates:

Template includes:

- type
- typical capacity
- booking\_deadline logic
- cost model (A or C)
- discount\_rate rules

Why:
L2 scaling means replicating across:

- Multiple campuses
- Multiple operators

Templates reduce operational entropy.

---

### 13.3 Economic Evolution Path

L1:

- Model C (≤12 CNY)
- Model A (reimbursement)

L2 should introduce:

- Model B (prepay + collect)
- Optional deposit mechanism for reliability enforcement

Therefore L1 system must:

- Keep payment\_model scoped to current L1 models only (A/C)
- Keep slot-level payment\_status generic for current reimbursement workflow

No Model B field reservation is required at L1.

---

### 13.4 Reliability Scoring (Internal Only at L1)

From Slot history, compute:

- join\_to\_confirm\_ratio
- confirm\_to\_attend\_ratio
- release\_frequency

At L1: not exposed.
At L2: may influence batching priority or deposit requirement.

---

### 13.5 Lightweight Ops Abstraction

Currently:

- WeChat acts as backend

For L2 readiness:

- All reimbursement and booking actions must log structured records
- Avoid purely conversational records

Minimal requirement:

- Each PR has operation\_log array
- Timestamped admin actions stored

This prevents L2 migration chaos.

---

### 13.6 Scenario Taxonomy Layer

Community PR at L1 generates demand signals.

System should log:

- PR type frequency
- Share-to-join ratio per type
- Fill rate per type

This builds scenario ranking foundation for L2 expansion.

---

### 13.7 Transition Principle

L1 is a density experiment.
L2 is controlled semi-market.

Preparation rule:

Do not add visible complexity.
But design invisible extensibility.

---

## 14. Product Identity at Iteration v4

At late L1, this H5 client becomes:

> A density engine with latent platform architecture.

Visible simplicity.
Hidden scalability.

---

End of Minimal PRD.
