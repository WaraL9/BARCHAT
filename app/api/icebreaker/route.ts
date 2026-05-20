import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  FALLBACK_RESULT,
  WINGMAN_TIMEOUT_MS,
  generateIcebreaker,
  type WingmanResult,
} from "@/lib/gemini";

/**
 * The fully-loaded `Match_Context` that downstream stages need to render the
 * Gemini prompt. Field shapes mirror `WingmanPromptInput` from `lib/gemini.ts`
 * so the loader output drops directly into `renderWingmanPrompt`.
 */
type LoadedMatchContext = {
  profileA: { display_name: string; age: number | null; bio: string | null };
  profileB: { display_name: string; age: number | null; bio: string | null };
  intentA: string;
  intentB: string;
  venue: {
    name: string;
    vibe_description: string | null;
    current_song: string | null;
  };
};

/**
 * Loads both profiles, both most-recent presence rows at `match.venue_id`,
 * and the venue row in parallel. Returns `null` to signal "context missing"
 * when any of the five sub-fetches errors or returns `null` data — the caller
 * uses that signal to take the fallback branch (Requirement 4.3).
 *
 * The five reads are independent, so they run concurrently via `Promise.all`.
 * Per BARCHAT.md section 5, presence rows are scoped per `(profile_id,
 * venue_id, checked_in_at)`; we order by `checked_in_at DESC LIMIT 1` to pick
 * up the latest check-in for each profile at the match's venue.
 */
async function loadMatchContext(
  client: NonNullable<typeof supabase>,
  match: { profile_a: string; profile_b: string; venue_id: string },
): Promise<LoadedMatchContext | null> {
  const [profileARes, profileBRes, presenceARes, presenceBRes, venueRes] =
    await Promise.all([
      client
        .from("profiles")
        .select("display_name, age, bio")
        .eq("id", match.profile_a)
        .maybeSingle(),
      client
        .from("profiles")
        .select("display_name, age, bio")
        .eq("id", match.profile_b)
        .maybeSingle(),
      client
        .from("presence")
        .select("intent")
        .eq("profile_id", match.profile_a)
        .eq("venue_id", match.venue_id)
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("presence")
        .select("intent")
        .eq("profile_id", match.profile_b)
        .eq("venue_id", match.venue_id)
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("venues")
        .select("name, vibe_description, current_song")
        .eq("id", match.venue_id)
        .maybeSingle(),
    ]);

  if (profileARes.error || !profileARes.data) return null;
  if (profileBRes.error || !profileBRes.data) return null;
  if (presenceARes.error || !presenceARes.data) return null;
  if (presenceBRes.error || !presenceBRes.data) return null;
  if (venueRes.error || !venueRes.data) return null;

  return {
    profileA: {
      display_name: profileARes.data.display_name,
      age: profileARes.data.age,
      bio: profileARes.data.bio,
    },
    profileB: {
      display_name: profileBRes.data.display_name,
      age: profileBRes.data.age,
      bio: profileBRes.data.bio,
    },
    intentA: presenceARes.data.intent,
    intentB: presenceBRes.data.intent,
    venue: {
      name: venueRes.data.name,
      vibe_description: venueRes.data.vibe_description,
      current_song: venueRes.data.current_song,
    },
  };
}

/**
 * POST /api/icebreaker
 *
 * Generates and persists a context-aware icebreaker + tip for a match.
 * See `.kiro/specs/ai-wingman/design.md` for the full algorithm and
 * state machine.
 *
 * Implemented stages:
 *   - 2.1 Body validation / 400 path
 *   - 2.2 Match lookup, 404 path, idempotency short-circuit
 *   - 2.3 Match-context loader for the active path
 *   - 2.4 Gemini call with 5s AbortController timeout + fallback branch
 *   - 2.5 Persistence write + 200 / 500 response branches
 */
export async function POST(req: Request): Promise<Response> {
  // [wingman] route entered — visible in the dev terminal so we can see
  // whether the request even reaches the server.
  console.log("[wingman] POST /api/icebreaker received");

  // ---- Body validation (Requirement 4.1) ---------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Malformed JSON — req.json() rejects.
    console.warn("[wingman] 400: malformed JSON body");
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    console.warn("[wingman] 400: body not a plain object");
    return NextResponse.json(
      { error: "match_id is required" },
      { status: 400 },
    );
  }

  const matchId = (body as Record<string, unknown>).match_id;
  if (typeof matchId !== "string" || matchId.length === 0) {
    console.warn("[wingman] 400: missing match_id");
    return NextResponse.json(
      { error: "match_id is required" },
      { status: 400 },
    );
  }

  console.log("[wingman] match_id:", matchId);

  // ---- Match lookup + idempotency (Requirements 3.1, 3.2, 3.3, 4.2) ------
  if (!supabase) {
    console.error("[wingman] 500: supabase client unavailable");
    return NextResponse.json(
      { error: "Supabase client unavailable" },
      { status: 500 },
    );
  }

  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("id, profile_a, profile_b, venue_id, icebreaker, icebreaker_tip")
    .eq("id", matchId)
    .maybeSingle();

  if (matchErr || !match) {
    console.warn("[wingman] 404: match not found", matchErr);
    return NextResponse.json(
      { error: "Match not found" },
      { status: 404 },
    );
  }

  if (match.icebreaker !== null && match.icebreaker_tip !== null) {
    console.log("[wingman] idempotent short-circuit (already populated)");
    return NextResponse.json(
      { icebreaker: match.icebreaker, tip: match.icebreaker_tip },
      { status: 200 },
    );
  }

  // ---- Narrow match FK columns before passing to the loader --------------
  // Schema-wise (BARCHAT.md section 5) the trigger that inserts `matches`
  // always supplies non-null `profile_a`, `profile_b`, and `venue_id`. The
  // columns are not declared NOT NULL though, so guard before passing them
  // into the loader's narrower signature. A null FK here is effectively a
  // bad row and is indistinguishable from "match not found" for our caller.
  if (
    !match.profile_a ||
    !match.profile_b ||
    !match.venue_id
  ) {
    return NextResponse.json(
      { error: "Match not found" },
      { status: 404 },
    );
  }

  // ---- Load full match context (Requirements 1.1, 4.3) -------------------
  const ctx = await loadMatchContext(supabase, {
    profile_a: match.profile_a,
    profile_b: match.profile_b,
    venue_id: match.venue_id,
  });
  console.log("[wingman] context loaded:", ctx === null ? "MISSING" : "OK");
  // ctx may be null — task 2.4 will route the null branch to the fallback
  //   path and the non-null branch to the Gemini call.

  // ---- Gemini call with timeout + fallback (Requirements 1.3, 2.1, 2.2,
  //      2.3, 2.5, 4.3) ----------------------------------------------------
  // Context-missing branch (Req 4.3): when `loadMatchContext` returned null
  // the route skips Gemini entirely and uses `FALLBACK_RESULT`. On the active
  // branch we run Gemini under a 5s `AbortController` deadline; any failure
  // mode (timeout, abort, network error, parse failure, missing fields) is
  // collapsed to `null` by `generateIcebreaker` and folded into the fallback
  // via `?? FALLBACK_RESULT` per Requirements 2.2, 2.3, 2.5.
  let result: WingmanResult;
  if (ctx === null) {
    result = FALLBACK_RESULT;
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      WINGMAN_TIMEOUT_MS,
    );
    let parsed: WingmanResult | null;
    const t0 = Date.now();
    try {
      parsed = await generateIcebreaker(ctx, controller.signal);
    } finally {
      clearTimeout(timeout);
    }
    console.log(
      "[wingman] gemini call:",
      parsed === null ? "FAILED (using fallback)" : "OK",
      `${Date.now() - t0}ms`,
    );
    result = parsed ?? FALLBACK_RESULT;
  }

  // ---- Persist + respond (Requirements 1.4, 2.4, 2.6, 4.4) ---------------
  // The DB write is the only writer for `icebreaker` / `icebreaker_tip`,
  // so both the success path and the fallback path land here. Per Req 2.6,
  // a write failure returns 500 even if `result` came from the fallback.
  // Column-name mapping: in the DB the columns are `icebreaker` and
  // `icebreaker_tip`, but in `WingmanResult` the field is `tip`.
  const { error: updateErr } = await supabase
    .from("matches")
    .update({
      icebreaker: result.icebreaker,
      icebreaker_tip: result.tip,
    })
    .eq("id", matchId);

  if (updateErr) {
    console.error("[wingman] 500: persistence failed", updateErr);
    return NextResponse.json(
      { error: "Failed to persist icebreaker" },
      { status: 500 },
    );
  }

  console.log("[wingman] 200: persisted icebreaker for", matchId);
  return NextResponse.json(
    { icebreaker: result.icebreaker, tip: result.tip },
    { status: 200 },
  );
}
