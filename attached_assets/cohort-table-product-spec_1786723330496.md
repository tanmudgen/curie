# Cohort Table — Live Q&A product specification

## Purpose

Cohort Table is a live, mobile-friendly question queue used alongside a Zoom class. It replaces a fast, repetitive Zoom chat with one shared place where questions accumulate context, votes, and replies.

The product principle is: **a question becomes more useful as more cohort members need it.**

Questions and replies are open by default. TAs coordinate and answer; they do not approve, gate, or make an answer “official.” A TA’s reply is simply identified with a small `TA` label so readers know who wrote it.

## Reference prototype

The prototype at `cohort-table-prototype/index.html` establishes the visual direction:

- paper-table aesthetic; a prominent question composer; question cards with a vote column
- shared `Rising`, `Unanswered`, and `Answered` controls above the question list
- a desktop-only right-side TA desk and a narrow/mobile single-column layout
- a card-based interaction model that can be extended for TA-created question groups

This document changes behavior and information architecture only; it does not require changes to that prototype file.

## Interaction and motion direction

**Hyper-realistic, tactile motion is a core product requirement.** The room should feel like a living table covered in physical question cards—not a conventional dashboard with generic fades and slides. Motion makes live activity understandable: a new question has landed, a vote joined a thread, or a TA picked up a card.

- New questions land into the stack with slight paper rotation, weight, and a short settling bounce; existing cards make room naturally.
- Upvotes create a compact physical pop on the vote marker, not a full-card redraw or distracting celebration.
- When a TA creates a question group, the selected cards should feel collected into a light shared stack, while each remains readable and independent.
- Expanding replies unfolds the bottom of a card; hiding them folds the thread back into the card while keeping the summary visible.
- A TA claim feels like placing a subtle stamp or sticky note on the card. It must not imply approval or resolution.
- The TA desk pulls out from the top-right arrow with a tactile drawer motion and a slight depth/shadow change; it should feel attached to the table edge.
- Use small, varied rotations and shadows to avoid a perfectly uniform card grid, but do not let motion make reading or clicking harder.
- Respect `prefers-reduced-motion`: retain clear state changes while removing bouncing, rotation, and nonessential animation.

Animations should be quick enough for a high-volume live class and should never delay posting, voting, sorting, or opening a reply thread.

## Roles

### Cohort member

No account is required. A member joins a room from its shared link or room code and can:

- ask a named or anonymous question
- upvote a question once
- mark themselves blocked by a question
- follow a question
- add a reply, clarification, or peer answer
- mark a reply helpful
- sort/filter the shared question list
- show and hide reply threads
- find questions they asked and threads in which they replied

### TA

A TA has every cohort-member capability plus the TA desk. They can:

- claim a question to signal that they are handling it
- release a claim when they are no longer handling it
- group related questions, including already-answered questions, without removing or merging any original thread
- flag/remove only spam or abusive content
- send a high-interest question to the instructor’s live queue
- mark a question for after-class follow-up

TAs do **not** approve questions or replies. They should not have a “mark official,” “verify,” or “resolve” action. The `Answered` state only means that a question has at least one visible reply.

## Room and question states

- A room is tied to a cohort and a class session. It has a shareable link/code and opens before the Zoom session.
- A question is visible as soon as it is posted.
- `Unanswered`: no replies exist.
- `Answered`: one or more replies exist, from any cohort member or TA.
- `Rising`: an ordering, not a permanent status. It ranks questions using recent upvotes, blocked count, and unanswered waiting time.
- `Claimed`: a TA coordination signal displayed to everyone as, for example, “Nina is looking into this.” It does not prevent replies or hide the question.
- `Grouped`: a question belongs to a TA-created related-question group. It remains its own visible card, with all of its votes, replies, and activity intact.

## Shared question-list controls

Every visitor—student or TA—gets the same control strip above the list. The selected control changes only their local view and never changes the room for others.

| Control | Behavior |
|---|---|
| `Rising` | Default view. Sort by momentum: recent votes, blocked members, unanswered age, and whether a TA has claimed it. A claim lowers coordination urgency but does not hide it. |
| `Unanswered` | Show questions with no replies, ordered by rising score. |
| `Answered` | Show questions with one or more replies, newest activity first. |
| `My activity` | Show questions the current browser asked **or** has replied to. Show a count badge when applicable. |

In `My activity`, cards must explain why they appear with compact labels:

- `You asked this`
- `You replied`
- `You asked this · You replied`

`My activity` is based on the anonymous device identity stored in that browser. It does not require a student account and does not expose that identity to other members.

## Question card and replies

Each question card contains the current vote count, author choice/name, time asked, title/body, tags, block count, and lightweight actions: `Upvote`, `Follow`, `I’m blocked`, and `Reply`.

Replies are collapsed by default to keep the live queue scannable.

- If replies exist, show a button such as `Show 3 replies` in the card action row.
- Selecting it expands the inline reply thread and changes the label to `Hide replies`.
- The state is per card and per viewer; opening a thread does not affect anyone else.
- The reply composer appears only after the thread is expanded or the viewer chooses `Reply`.
- Each reply shows its author label, time, role tag when the author is a TA, optional helpful count, and reply text.
- A collapsed card still displays a short summary such as `3 replies · last reply 1 min ago`.

Students may reply freely. Replies are never pre-moderated. Abuse reports should hide content only after a TA’s explicit removal action.

## TA-created question groups

Students always post their question directly. The composer does not block, redirect, or suggest that a student join an existing thread. Every question is answerable by every cohort member.

A TA can create a group for questions that share an underlying topic—even if some already have replies. Grouping is additive, not destructive:

- Each original question remains visible, independently answerable, and keeps its votes, followers, blocked signals, and replies.
- A group has a short title, such as `Agent tool loops`, and shows its related-question count.
- A TA can add a single group reply that appears as shared context on every card in the group. The TA can still write a more specific reply on any individual card.
- A group can help the TA answer several related open questions at once or connect a new question to useful answers that already exist.
- Membership may change as the discussion evolves; ungrouping a question does not remove its content.

The TA desk should provide a compact selection mode for creating and editing groups. It should never turn grouped questions into redirects or hide them from the public queue.

## Collapsible TA desk

The TA desk is a private slide-out panel, not a permanent third column.

- It is available only to signed-in TAs.
- A compact side-arrow handle sits at the **top-right edge of the app** on desktop and mobile. It uses an accessible label: `Open TA desk` / `Close TA desk`.
- The desk is closed by default, preserving the same focused queue experience for TAs and students.
- Selecting the arrow slides the desk in from the right. On wide screens it occupies a right-side panel while the question list remains visible; on small screens it is an overlay drawer above the list.
- Closing the drawer returns focus to the arrow. Escape closes it on desktop.

The desk contains four short sections:

1. `My claims` — questions claimed by the current TA, with release and quick-reply actions.
2. `Needs a TA` — high-rising unanswered questions without a claim.
3. `Question groups` — related cards selected for a shared group reply or answer context.
4. `Live queue` — questions that crossed the instructor-discussion vote threshold, with `Send to instructor`.

The desk must not create a second, hidden question universe: every question in it links back to the same public card and thread.

## Live-class and after-class behavior

When a question crosses a configurable threshold (for example, 10 votes), it becomes eligible for the live queue. A TA can forward it to the instructor. The instructor-facing view may display a clean presenter card; after discussion, any member or TA can add a written reply.

After the session, the room remains read-only for new questions by default but preserves its Q&A as a searchable recap. Follow-up behavior—allowing later replies or reopening the room—is configurable per cohort.

## Technical architecture — Replit MVP

Build Cohort Table as one full-stack TypeScript application in Replit. Keep the first release deliberately small: one client, one application server, one persistent database, and one Autoscale deployment.

```text
React client (browser)
        │ HTTPS API; polling every 3–5 seconds while room is open
        ▼
Express API server (same Replit project)
        │ database queries and writes
        ▼
Replit-managed Neon Postgres
```

### Client responsibilities

The React client renders the question-card experience, tactile animations, sort controls, reply drawers, `My activity`, and the TA desk. It keeps only temporary UI state locally: selected sort, expanded reply threads, open/closed desk state, and animation state.

For responsiveness, writes are optimistic: when someone posts, votes, replies, follows, or marks themselves blocked, the card updates and animates immediately. The client then reconciles the state with the server’s response.

### Server responsibilities

The Express server is the source of truth. It validates every write, identifies the browser or TA, applies role checks, calculates Rising ordering, and persists all Q&A state. The client must not connect to the database directly and must never contain TA secrets.

Start with short polling rather than sockets. Refresh the list every 3–5 seconds while the room is active and immediately after a successful write. This is sufficient for a cohort-sized session and keeps the deployment simple. Server-Sent Events or WebSockets are a later optimization only if the delay becomes visibly harmful.

### Persistence

Use Replit-managed Neon Postgres. Do not store room content in the published filesystem or rely on browser storage for questions and replies.

Suggested tables:

```text
cohorts
rooms
questions
replies
votes
follows
blocked_signals
ta_members
ta_sessions
ta_claims
question_groups
question_group_members
group_replies
```

`question_group_members` is the crucial non-destructive link: a question can belong to a related-question group without being merged, redirected, hidden, or losing its individual replies and votes.

### Identity and access

Students do not sign in. On a first room visit, the server issues a random anonymous device ID, which the browser retains locally and sends on later actions. It supports one-vote-per-question enforcement and the `My activity` view without exposing identity to the cohort.

TAs sign in by choosing a name from the pre-created TA roster and entering the shared TA password. The server checks the password hash, then creates a secure HTTP-only session cookie. Only this session can open the TA desk or call TA-only actions such as claim, grouping, and removal of abuse/spam.

Store the TA password hash and session secret in Replit Secrets, not in client code or committed files.

### Initial API surface

```text
GET  /api/rooms/:roomCode/questions?view=rising|unanswered|answered|mine
POST /api/rooms/:roomCode/questions
POST /api/questions/:id/vote
POST /api/questions/:id/replies
POST /api/questions/:id/follow
POST /api/questions/:id/blocked
POST /api/ta/login
POST /api/ta/questions/:id/claim
POST /api/ta/question-groups
POST /api/ta/question-groups/:id/reply
```

## MVP scope

1. Join a room without student login.
2. TA roster login and private TA desk.
3. Create a question directly; any student can reply to any question.
4. Upvote, follow, and mark blocked.
5. Add replies; show/hide reply threads.
6. Shared controls: `Rising`, `Unanswered`, `Answered`, and `My activity`.
7. TA claims and non-destructive question groups with group replies.
8. Save all questions, replies, votes, follow state, and claims in the database.

Out of scope for the first release: automated technical answers, Zoom-native installation, public answer verification, and a long-term cross-cohort knowledge base.

## Acceptance criteria

- A student can enter a live room, ask a question, and see it after a page refresh.
- A student’s `My activity` view includes both their authored questions and any question they replied to, with the correct labels.
- Any visitor can select `Rising`, `Unanswered`, or `Answered`, and can independently expand or collapse a question’s replies.
- A TA can open/close the top-right TA desk, claim a question, and have the claim visible on the public card.
- A grouped question retains its own votes, follows, blocked signals, and replies; a shared group reply is visible without replacing that thread.
- No question or reply needs TA approval to appear.
