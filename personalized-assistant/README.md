# Personalized Assistant

A single assistant that actually knows your situation — notepad, goals, a career
learning path, and a financial advisor, all feeding one context that a Claude-backed
chat reads from on every message instead of starting cold each time.

## Architecture

- **Next.js 14 (App Router) + TypeScript**, Tailwind for styling.
- **Prisma + SQLite** for data (swap `DATABASE_URL` for Postgres in production — the
  schema is provider-agnostic aside from SQLite's lack of a native array type, which
  is why `Note.tags` is a comma-separated string instead of `String[]`).
- **NextAuth (database sessions)** for identity, with `Account` rows as the multi-account
  model: one `User` can hold several linked OAuth providers.
- **Anthropic SDK** for the assistant chat itself.
- Every API route re-derives the signed-in user server-side (`lib/session.ts`) and
  scopes every Prisma query by `userId` — there is no client-supplied user id anywhere
  in the request path.

```
src/
  app/
    api/            # REST-ish route handlers, one per resource
    notes/ goals/ learning-path/ finance/ assistant/ connections/
  lib/
    db.ts           # Prisma client singleton
    auth.ts         # NextAuth config (providers, adapter, session strategy)
    anthropic.ts    # Claude client, only constructed if ANTHROPIC_API_KEY is set
    memory.ts        # Builds assistant context from all modules; extracts facts from chat
```

## The "learns me" mechanism

`lib/memory.ts:buildUserContext()` pulls active goals, in-progress learning items,
pinned/recent notes, a financial snapshot, and stored `MemoryFact` rows into one
text block, injected as the system prompt's context on every `/assistant/chat` call.
After each reply, a second (small, cheap) Claude call extracts up to 3 durable facts
from the exchange and upserts them into `MemoryFact` — this is what lets the
assistant remember "wants to be a staff engineer by 2028" across sessions without
re-reading the whole chat history every time.

`/connections` also has a manual **memory import** path: paste a JSON export (or
just plain text) from another AI tool and it's parsed into the same `MemoryFact`
table, tagged `source: "imported"`. That's the actual, working version of "connect
with my other AI" today — there's no live API bridge to any specific assistant.

## Setup

```bash
cp .env.example .env      # fill in at least DATABASE_URL and NEXTAUTH_SECRET
npm install
npm run db:push           # creates prisma/dev.db from schema.prisma
npm run dev
```

Minimum to run at all: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and one
OAuth provider pair (`GOOGLE_CLIENT_ID`/`SECRET` or `GITHUB_CLIENT_ID`/`SECRET`) so
you can sign in. Add `ANTHROPIC_API_KEY` to get real assistant replies — without it,
the chat responds with a clear "not configured" message instead of failing silently.

## What's actually working vs. scaffolded

**Working today:**
- Sign-in via Google and/or GitHub, whichever you configure.
- Full CRUD on notes, goals (with progress + category), and a career learning path
  (optionally linked to a goal).
- Manual financial accounts + transactions, with a rule-based insights endpoint
  (budget overages, savings rate) that needs no LLM call at all.
- The assistant chat, wired to Claude, reading live context from every module above.
- Fact extraction from chat, and manual memory import from a pasted export.
- Multi-account linking for Google + GitHub when they share a verified email
  (`allowDangerousEmailAccountLinking`) — this is a real NextAuth feature, not a stub.

**Scaffolded, not wired up:**
- `ConnectedService` model exists for future integrations (Plaid, Notion, Spotify,
  etc.) but nothing writes to it yet — the Connections page lists these as planned,
  not connected.
- Bank account sync (Plaid) is env-var-ready (`PLAID_*` in `.env.example`, commented
  out) but there's no Plaid Link flow or webhook handler.
- Account linking when providers use *different* emails needs a custom `signIn`
  callback that reads the existing session before NextAuth creates a new user —
  the current linking only covers matching-email cases.
- No push/email notifications, no mobile app — this is the web app only.

## A note on scope

"Connect to all my accounts" is a real product, not a single session's build:
each integration (bank, calendar, another AI's memory, etc.) needs its own OAuth
app registration, secrets, and (for anything financial) a real security review
before going anywhere near production. This scaffold is built so each of those is
a self-contained addition — a new `ConnectedService` row, a new provider in
`lib/auth.ts`, or a new section in `lib/memory.ts`'s context builder — rather than
a rewrite.
