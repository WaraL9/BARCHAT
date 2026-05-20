# BARCHAT — Spec Document

> **This file is the source of truth for the BARCHAT project.**
> Kiro: always reference this file before generating or modifying code.
> If a request conflicts with this spec, ask before proceeding.

---

## 1. Product summary

**BARCHAT** is a web app that lets two strangers at the same Bangkok bar match, chat, send each other a drink, and meet in person — with a 15-minute countdown that forces them off the screen and into the room.

It extends the Shon-ma! (LINE HACK 2023 winner) pattern with three things they couldn't ship in 2023: honest intent-declared matching, an AI wingman that generates context-aware icebreakers, and verified-patron trust marks from partner venues.

**Hackathon:** SEABW 2026 Vibe Coding Hackathon, Bangkok, May 20–21 2026.
**Builder:** Solo. Vibe-coded with Kiro IDE.

---

## 2. The hero feature (non-negotiable)

**The 15-minute countdown on `/match/[id]`** must work flawlessly on two devices in realtime. If anything else breaks, this still has to work. It is the demo's emotional peak.

Hero behavior:
- When a match is created, `expires_at` is set to `created_at + 15 minutes`.
- Both users' `/match/[id]` pages subscribe to the match row via Supabase realtime.
- The countdown ticks visibly on both screens, in sync.
- If either user taps **"I met them"**, `met_at` is set. Both screens immediately freeze the timer and show a success state ("You met! Have a great night ✨").
- If `expires_at` passes without `met_at` being set, both screens show an expired state ("Match expired — maybe next time").
- The timer typography is huge and dramatic. This is the visual centerpiece.

---

## 3. Feature list (priority order)

1. **Hero**: 15-min countdown match page with realtime sync and "I met them" flow
2. QR-based venue check-in (`/checkin?venue=<slug>`)
3. Profile + intent declaration on first check-in
4. Bar floor view: see other patrons at same venue, filtered by compatible intent
5. Like → mutual like → auto-match (handled by DB trigger)
6. AI wingman: Gemini generates a context-aware icebreaker + meet-up tip on match
7. Real-time chat on the match page (text + system messages for drinks)
8. Send a drink (Web2 simulation: pending → redeemed)
9. Verified-patron checkmark on profile cards

Fallback order when behind schedule: sacrifice polish on #6 first, then #7, then #8. Never sacrifice #1.

---

## 4. Constraints

**Tech stack** (do not deviate without asking):
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase (Postgres + realtime + JS client v2)
- Google Gen AI SDK (`@google/genai`) — model: `gemini-2.5-flash`
- Vercel for hosting

**Hard rules:**
- No authentication system. User identity is a `profile_id` stored in `localStorage` after first check-in.
- No payments. Drinks are a Web2 simulation. No Stripe, no payment processor, no crypto.
- No external CSS frameworks beyond Tailwind. No Material UI, no shadcn unless explicitly added later.
- No state management library. React state + Supabase realtime is enough.
- No server framework beyond Next.js server actions and route handlers.
- Mobile-first. Everything must render correctly on a 390px viewport.
- Supabase RLS is **disabled** on all tables for this hackathon build. Add a comment in the README acknowledging this.

**Anti-goals (do not build these even if asked mid-build):**
- User accounts, password reset, email verification
- Reporting / blocking / moderation flows
- Multiple venues (one seeded venue only)
- Push notifications (polling or realtime is fine)
- Onboarding tutorial, settings page, profile editing after creation
- Analytics, tracking, A/B testing
- Anything mentioning blockchain, tokens, or wallets (it's on the roadmap slide, not in code)

---

## 5. Database schema

The full schema is below. It is already applied to the Supabase project. Do not modify schema without updating this section first.

```sql
-- profiles
create table profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  age int,
  photo_url text,
  bio text,
  is_verified_patron boolean default false,
  created_at timestamptz default now()
);

-- venues
create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vibe_description text,
  current_song text,
  qr_slug text unique not null
);

-- presence (who is currently at which venue)
create table presence (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  venue_id uuid references venues(id) on delete cascade,
  intent text not null check (intent in (
    'drink_buddy', 'casual_date', 'language_exchange', 'new_in_town', 'serious'
  )),
  checked_in_at timestamptz default now(),
  checked_out_at timestamptz,
  unique (profile_id, venue_id, checked_in_at)
);

-- likes (one-way)
create table likes (
  id uuid primary key default gen_random_uuid(),
  from_profile uuid references profiles(id) on delete cascade,
  to_profile uuid references profiles(id) on delete cascade,
  venue_id uuid references venues(id) on delete cascade,
  created_at timestamptz default now(),
  unique (from_profile, to_profile, venue_id)
);

-- matches (auto-created by trigger on mutual likes)
create table matches (
  id uuid primary key default gen_random_uuid(),
  profile_a uuid references profiles(id) on delete cascade,
  profile_b uuid references profiles(id) on delete cascade,
  venue_id uuid references venues(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  met_at timestamptz,
  icebreaker text,
  icebreaker_tip text
);

-- messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'system_drink')),
  content text not null,
  created_at timestamptz default now()
);

-- drinks
create table drinks (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  from_profile uuid references profiles(id) on delete cascade,
  to_profile uuid references profiles(id) on delete cascade,
  drink_type text not null,
  price_thb int not null,
  status text not null default 'pending'
    check (status in ('pending', 'redeemed')),
  created_at timestamptz default now(),
  redeemed_at timestamptz
);

-- realtime
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table drinks;
alter publication supabase_realtime add table presence;

-- mutual-like → auto-match trigger
create or replace function create_match_on_mutual_like()
returns trigger as $$
declare mutual_exists boolean;
begin
  select exists(
    select 1 from likes
    where from_profile = new.to_profile
      and to_profile   = new.from_profile
      and venue_id     = new.venue_id
  ) into mutual_exists;

  if mutual_exists then
    insert into matches (profile_a, profile_b, venue_id, expires_at)
    values (
      least(new.from_profile, new.to_profile),
      greatest(new.from_profile, new.to_profile),
      new.venue_id,
      now() + interval '15 minutes'
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_mutual_like
after insert on likes
for each row execute function create_match_on_mutual_like();
```

Seed data: one venue (`Craft & Draft Thonglor`, slug `craft-draft-thonglor`) and six demo profiles already checked in with varying intents. Three of the six (`Mai`, `Tan`, `Ploy`) are `is_verified_patron = true`.

---

## 6. Intent compatibility

When listing other patrons on `/bar`, filter to **compatible intents only**:

| User intent | Sees patrons with intent |
|---|---|
| `drink_buddy` | `drink_buddy`, `new_in_town` |
| `casual_date` | `casual_date`, `serious` |
| `language_exchange` | `language_exchange`, `new_in_town` |
| `new_in_town` | All intents |
| `serious` | `casual_date`, `serious` |

Implement this as a const map in `lib/intent.ts`. Do not hardcode the logic in components.

---

## 7. AI wingman (Gemini call)

On match creation, server-side (via a route handler `app/api/icebreaker/route.ts`), call Gemini with this prompt:

```
You are a wingman helping two strangers at a bar break the ice.

Context:
- Bar: {venue.name}
- Vibe: {venue.vibe_description}
- Currently playing: {venue.current_song}
- User A: {profileA.display_name}, {profileA.age}, "{profileA.bio}", intent: {presenceA.intent}
- User B: {profileB.display_name}, {profileB.age}, "{profileB.bio}", intent: {presenceB.intent}

Generate exactly:
1. A 1-sentence icebreaker (under 20 words) either could send to start the chat.
   Grounded in bar context or shared interests, NOT generic.
   Casual Thai-English voice if natural.
2. A 1-sentence tip (under 15 words) for what to talk about when they meet at the counter.
```

**Use Gemini's native structured JSON output** (do NOT ask the model to "return JSON" in the prompt — let the schema enforce it). Reference implementation:

```typescript
// app/api/icebreaker/route.ts
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt, // the rendered prompt above
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        icebreaker: { type: Type.STRING },
        tip:        { type: Type.STRING },
      },
      required: ["icebreaker", "tip"],
    },
    // Keep latency low — disable thinking for this short task
    thinkingConfig: { thinkingBudget: 0 },
  },
});

const parsed = JSON.parse(response.text);
// parsed.icebreaker and parsed.tip are guaranteed strings
```

Write `parsed.icebreaker` and `parsed.tip` back to `matches.icebreaker` and `matches.icebreaker_tip`. Cache them on the row — never call the API twice for the same match.

**Fallback:** If the call fails, throws, or takes >5 seconds (use `AbortController` with a timeout), write the hardcoded fallback:
```json
{"icebreaker": "Just say hi 👋", "tip": "Ask what they're drinking."}
```

The match flow must NEVER block on this call. The icebreaker appears on the match page when ready; it does not gate the timer or the chat.

**Why `gemini-2.5-flash` and not Gemini 3 Pro?** Flash is stable, sub-second on short prompts, and 1/8 the cost. The icebreaker is a one-sentence task — Pro is overkill. Preview models (e.g. `gemini-3-flash-preview`) are deliberately avoided because they can be deprecated or rate-limited on demo day.

---

## 8. Routes and pages

| Route | Purpose |
|---|---|
| `/` | Marketing landing (logo, tagline, "Scan QR to join"). Keep minimal. |
| `/checkin?venue=<slug>` | First-time check-in: name, age, photo URL, bio, intent. Inserts profile + presence. Stores `profile_id` in localStorage. Redirects to `/bar`. |
| `/bar` | Lists other patrons at user's current venue, filtered by intent. Like button on each card. Subscribes to `matches` table; on new match involving this user, redirects to `/match/[id]`. |
| `/match/[id]` | **Hero page.** Both photos, countdown to `expires_at`, "I met them" button, AI icebreaker, chat, send-drink panel. |
| `/api/icebreaker` | Server route. Called once on match creation. Writes icebreaker to match row. |

---

## 9. Match page (`/match/[id]`) layout

Single mobile-first column. Top to bottom:

1. **Header** — Both profile photos side by side with names, intent badges, verified checkmark if applicable.
2. **Countdown** — Massive `MM:SS`. Centered. Pulses red in the final 2 minutes. Freezes and turns green when `met_at` is set. Turns gray when expired.
3. **AI icebreaker card** — Soft background, the icebreaker quoted, "Use this" button copies to chat input.
4. **Chat** — Scrollable. Text messages. System-drink messages styled with 🍺 and a "Redeem at counter" button if recipient is current user and status is `pending`.
5. **Drink panel** — Three buttons: 🍺 Beer ฿120, 🍸 Cocktail ฿250, 🥤 Mocktail ฿150. Tap inserts a `drinks` row + a `messages` row with `kind='system_drink'`.
6. **"I met them" button** — Sticky bottom. Sets `met_at`. Prominent but not above the countdown.

---

## 10. Demo choreography (rehearse this exact flow)

Two phones on stage. Phone A is "you," Phone B is the other half of the demo match.

1. Phone A scans QR → `/checkin?venue=craft-draft-thonglor`.
2. Phone A creates profile: name "Nine", age 21, intent `drink_buddy`.
3. Phone A lands on `/bar`. Sees the 6 seeded patrons. Filters to drink_buddy + new_in_town.
4. Phone B (a friend, or a second browser) is logged in as "Mai" (pre-seeded, also `drink_buddy`). Mai has already liked Nine (seed a `likes` row from Mai → Nine before demo).
5. Phone A taps like on Mai → trigger fires → match row appears → realtime subscription redirects both to `/match/[id]`.
6. **15:00 countdown starts on both screens.** AI icebreaker appears within ~2 seconds.
7. Quick chat: Nine sends "yo where are you sitting"; Mai replies.
8. Nine taps 🍺 Beer ฿120 → system message appears in both chats. Mai taps "Redeem at counter" → status update.
9. Nine walks across stage to Phone B, taps "I met them" → countdown freezes at ~12:30 → green success state on both screens.

Total runtime: 90 seconds.

---

## 11. Kiro task list (work through in order)

Each task should be a separate Kiro session. After each, manually test before moving to the next.

- [ ] **Task 1 — Scaffold.** `create-next-app` with TS + Tailwind + App Router. Install `@supabase/supabase-js` and `@google/genai`. Create `lib/supabase.ts` (browser client) and `lib/gemini.ts` (server-only). Add `.env.local` with Supabase URL, anon key, and `GEMINI_API_KEY`. Deploy to Vercel and confirm the live URL loads.
- [ ] **Task 2 — Check-in.** Build `/checkin` page. Form fields, intent dropdown, photo URL input (no upload). Insert `profiles` + `presence`. Save `profile_id` to localStorage. Redirect to `/bar`.
- [ ] **Task 3 — Bar floor.** Build `/bar`. Read `profile_id` from localStorage, find current `presence` (most recent with `checked_out_at = null`), list other patrons at same venue with compatible intent. Card UI with photo, name, intent badge, verified checkmark.
- [ ] **Task 4 — Likes + match subscription.** Like button inserts to `likes`. Subscribe to `matches` table filtered on `profile_a = me OR profile_b = me`. On new row, redirect to `/match/[id]`.
- [ ] **Task 5 — HERO timer.** Build `/match/[id]`. Subscribe to the match row. Render the countdown. "I met them" button sets `met_at`. Handle expired and met states on both screens. **Test on two devices until it feels perfect. Spend extra time here.**
- [ ] **Task 6 — AI wingman.** Build `/api/icebreaker`. Call Gemini with the structured-JSON schema from section 7. Write to match row. Display on match page. Fallback after 5s.
- [ ] **Task 7 — Chat.** Subscribe to `messages` for this match. Input + send. Render text and system_drink kinds.
- [ ] **Task 8 — Drinks.** Drink panel. Insert drink + system message. Redeem button updates status + inserts second system message.
- [ ] **Task 9 — Polish pass.** Countdown typography (giant, monospaced numerals). Mobile viewport check. Loading states. Fallback strings everywhere.
- [ ] **Task 10 — Demo dry-run.** Run the choreography in section 10 on two devices three times. Fix what breaks.

---

## 12. Files Kiro should not touch without asking

- `BARCHAT.md` (this file)
- `DEMO.md` (the dry-run checklist)
- `.env.local`
- Supabase migration files once applied

---

## 13. Pitch positioning (for README and deck reference)

**One-liner:** Honest 1-on-1 connection at Bangkok bars, with a 15-minute timer that forces you off the screen and into the room.

**Three originality wedges** (use these exact phrases in the pitch):
1. *Honest intent, not endless swiping* — intent matching
2. *A wingman in your pocket* — AI icebreaker grounded in the room
3. *Match dies in 15 minutes* — the friction is the product

**Inspiration credit:** "Inspired by Shon-ma! (LINE HACK 2023 winner). Extended for 2026 with AI-generated context, intent-honest matching, and venue-verified trust."

**Roadmap slide (Phase 2, not built):** Trust goes on-chain — soulbound patron reputation portable across venues; drink-sends settle in stablecoin so kindness is verifiable.

---

*End of spec. Kiro: when in doubt, reread this file.*
