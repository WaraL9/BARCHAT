# BARCHAT

> **Honest 1-on-1 connection at Bangkok bars, with a 15-minute timer that forces you off the screen and into the room.**

Built solo for the **SEABW 2026 Vibe Coding Hackathon** (Bangkok, May 20–21 2026).
Vibe-coded end-to-end with [Kiro IDE](https://kiro.dev).

---

## The problem

Dating apps reward infinite swiping. You match with someone two metres away and never speak. Bars are full of strangers who'd actually get along, but nobody wants to be the person who walks up cold.

## The product

BARCHAT is a web app that lets two strangers **at the same bar tonight** match, chat, send each other a drink, and meet in person before a countdown runs out.

Three things make it different:

1. **Honest intent, not endless swiping.** Before you see anyone, you declare why you're out tonight: drink buddy, casual date, language exchange, new in town, or something serious. The floor view only shows people whose intent is compatible with yours. No bait, no mismatch.
2. **A wingman in your pocket.** The moment two people match, Gemini generates a one-sentence icebreaker grounded in the actual bar, the song that's playing, and both bios. It's not generic. It's the line you wish you'd thought of.
3. **The match dies in 15 minutes.** No DMs, no follow-ups, no opening the app tomorrow. Either you walk over and tap "I met them," or the match expires. The friction is the product.

> Inspired by **Shon-ma!** (LINE HACK 2023 winner). Extended for 2026 with AI-generated context, intent-honest matching, and venue-verified trust marks.

---

## The hero feature

`/match/[id]` is the page everything else exists to deliver you to.

- A massive `MM:SS` countdown ticking on both phones, in sync, via Supabase realtime.
- An AI icebreaker card the moment the match is created.
- A live chat with text and "send a drink" system messages.
- A sticky **"I met them"** button. Tap it on either phone and the timer freezes green on both screens.
- Let the timer hit zero and both screens go gray. The match is gone.

The countdown is the emotional centerpiece. It pulses red in the final two minutes. It goes green together. It is the moment the demo is built around.

## Demo flow (90 seconds)

Two phones on stage.

1. Phone A scans a QR code → lands on `/checkin?venue=craft-draft-thonglor`.
2. Creates a profile (name, age, intent), gets dropped onto the bar floor at `/bar`.
3. Sees six other patrons at the same venue, filtered to compatible intents. Verified-patron checkmarks on three of them.
4. Phone A taps like on Mai. Mai already liked back (seeded). A Postgres trigger creates the match.
5. Both phones redirect to `/match/[id]`. **The 15:00 countdown starts.** The Gemini icebreaker appears within ~2 seconds.
6. Quick chat. Phone A sends a 🍺 Beer ฿120 — system message lands on both screens. Phone B taps "Redeem at counter."
7. Phone A walks across the stage to Phone B, taps **"I met them."** The countdown freezes at ~12:30. Both screens go green.

---

## Architecture at a glance

```
┌─────────────────┐    realtime     ┌──────────────────┐
│  Next.js 14     │◀───────────────▶│  Supabase        │
│  (App Router)   │                 │  Postgres + RT   │
│                 │                 │                  │
│  /checkin       │   server-only   │  profiles        │
│  /venue-map     │ ──────────────▶ │  venues          │
│  /bar           │                 │  presence        │
│  /match/[id]    │                 │  likes           │
│                 │                 │  matches         │
│  /api/icebreaker│──┐              │  messages        │
└─────────────────┘  │              │  drinks          │
                     │              └──────────────────┘
                     │   one call per match
                     ▼
            ┌──────────────────┐
            │  Gemini 2.5 Flash│
            │  structured JSON │
            └──────────────────┘
```

- **No auth system.** Identity is a `profile_id` written to `localStorage` after first check-in. Honest about the scope.
- **No payments.** Drinks are a Web2 simulation: `pending → redeemed`.
- **No state library.** React state plus Supabase realtime subscriptions.
- **Mutual likes auto-create matches** via a Postgres trigger that sets `expires_at = now() + 15 minutes`. The client never computes the deadline.
- **The AI call is non-blocking.** A 5-second timeout falls back to a hardcoded line. The match flow never waits on Gemini.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router, TS strict) | Server actions + route handlers in one tree |
| Styling | [Tailwind CSS](https://tailwindcss.com/) | Mobile-first, no second framework to learn |
| Data + realtime | [Supabase](https://supabase.com/) | Postgres + realtime subscriptions in one client |
| AI | [`@google/genai`](https://ai.google.dev/) — `gemini-2.5-flash` | Sub-second on short prompts, 1/8 the cost of Pro, schema-enforced JSON output |
| Map | [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) | Open tiles, no API key needed for the venue picker |
| Hosting | Vercel | One-click deploy from the repo |

Why not Gemini 3 Pro? The icebreaker is a one-sentence task. Flash is stable, fast, and cheap. Preview models are deliberately avoided so the demo doesn't get rate-limited on stage.

---

## Run it locally

### Prerequisites

- Node.js 18+
- A Supabase project with the schema applied (see below)
- A Google AI API key

### Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anonymous key |
| `GEMINI_API_KEY` | server only | Google AI key for the wingman call |

All three are required. The app fails fast at startup if any are missing.

### Database

The full schema, the mutual-like trigger, and seed data live in `BARCHAT.md` (section 5). One seeded venue (`Craft & Draft Thonglor`), six demo profiles, three of them flagged as verified patrons.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on `:3000` |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run lint` | ESLint |

---

## Project layout

```
app/
  page.tsx              # Landing
  venue-map/            # Leaflet map of partner bars
  checkin/              # First-time profile + intent + presence
  bar/                  # Floor view, intent-filtered, like buttons
  match/[id]/           # HERO — countdown, icebreaker, chat, drinks
  api/icebreaker/       # Gemini route handler (server-only)
lib/
  supabase.ts           # Browser client
  gemini.ts             # Server-only wingman client
  intent.ts             # Intent compatibility map
  geo.ts                # Venue distance helpers
BARCHAT.md              # The source-of-truth product spec
.kiro/specs/            # Per-feature specs Kiro worked from
```

## Built with Kiro

Every feature in this repo was scoped, designed, and implemented through a Kiro spec. The specs live under `.kiro/specs/` — one per feature, each with `requirements.md`, `design.md`, and `tasks.md`. The product spec at `BARCHAT.md` was the single source of truth Kiro referenced before generating or modifying code.

---

## Security note

> **⚠️ Hackathon build — RLS is disabled.**

Supabase Row Level Security is **off** on every table. Anyone with the anon key can read and write any row. That's a deliberate trade-off for a 24-hour build, not a recommendation.

Before this ever sees production:

1. Enable RLS on every table in the Supabase dashboard.
2. Write per-table policies (e.g. profiles readable by all, writable only by self; matches readable only by participants).
3. Move privileged writes behind server actions with a service-role key.
4. Verify unauthorized access is denied with a real test.

## Roadmap (not in this build)

- **Trust on-chain.** Verified-patron status as a soulbound credential portable across venues.
- **Drink-sends settle in stablecoin.** So kindness between strangers is verifiable, not just simulated.
- **Multi-venue.** One bar tonight, every bar in Thonglor next.

## Credits

- Pattern inspired by [**Shon-ma!**](https://linedevth.medium.com/) — LINE HACK 2023 winner.
- Built solo, on stage, with [Kiro IDE](https://kiro.dev).
