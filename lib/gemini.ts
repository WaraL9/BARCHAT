import "server-only";
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY ?? "";

export const ai = new GoogleGenAI({ apiKey });

export const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Wall-clock deadline for the Gemini wingman call, enforced via AbortController.
 * Per BARCHAT.md section 7: the call must fall back if it takes longer than 5s.
 */
export const WINGMAN_TIMEOUT_MS = 5000;

/**
 * Hardcoded fallback used whenever the Gemini call fails, times out, aborts,
 * or returns unparseable / incomplete data. Verbatim from BARCHAT.md section 7.
 */
export const FALLBACK_RESULT = {
  icebreaker: "Just say hi 👋",
  tip: "Ask what they're drinking.",
} as const;

/**
 * Inputs needed to render the BARCHAT.md section 7 prompt template.
 * All fields come from the Match_Context loaded by the icebreaker route.
 */
export interface WingmanPromptInput {
  venue: {
    name: string;
    vibe_description: string | null;
    current_song: string | null;
  };
  profileA: {
    display_name: string;
    age: number | null;
    bio: string | null;
  };
  profileB: {
    display_name: string;
    age: number | null;
    bio: string | null;
  };
  intentA: string;
  intentB: string;
}

/**
 * The structured wingman result, derived either from a successful parsed
 * Gemini response or from FALLBACK_RESULT.
 */
export interface WingmanResult {
  icebreaker: string;
  tip: string;
}

/**
 * Renders the BARCHAT.md section 7 wingman prompt verbatim, interpolating
 * venue, profile, and intent fields from `input`.
 *
 * Null handling (per task spec):
 * - `age === null` → rendered as empty string
 * - `bio === null` → rendered as empty string
 * - `venue.vibe_description === null` and `venue.current_song === null` →
 *   rendered as empty string
 *
 * The prompt deliberately contains no "return JSON" instruction; the
 * structured-JSON `responseSchema` enforces output shape.
 */
export function renderWingmanPrompt(input: WingmanPromptInput): string {
  const { venue, profileA, profileB, intentA, intentB } = input;

  const vibe = venue.vibe_description ?? "";
  const song = venue.current_song ?? "";
  const ageA = profileA.age === null ? "" : String(profileA.age);
  const ageB = profileB.age === null ? "" : String(profileB.age);
  const bioA = profileA.bio ?? "";
  const bioB = profileB.bio ?? "";

  return `You are a wingman helping two strangers at a bar break the ice.

Context:
- Bar: ${venue.name}
- Vibe: ${vibe}
- Currently playing: ${song}
- User A: ${profileA.display_name}, ${ageA}, "${bioA}", intent: ${intentA}
- User B: ${profileB.display_name}, ${ageB}, "${bioB}", intent: ${intentB}

Generate exactly:
1. A 1-sentence icebreaker (under 20 words) either could send to start the chat.
   Grounded in bar context or shared interests, NOT generic.
   Casual Thai-English voice if natural.
2. A 1-sentence tip (under 15 words) for what to talk about when they meet at the counter.`;
}


/**
 * Structured-JSON response schema for the wingman call. Matches BARCHAT.md
 * section 7 verbatim: an object with required `icebreaker` and `tip` strings.
 */
const wingmanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    icebreaker: { type: Type.STRING },
    tip: { type: Type.STRING },
  },
  required: ["icebreaker", "tip"],
};

/**
 * Calls Gemini with the BARCHAT.md section 7 prompt + structured-JSON schema
 * and returns a parsed `WingmanResult`, or `null` on any failure.
 *
 * Failure modes that map to `null`:
 * - `signal` is already aborted on entry
 * - The SDK rejects, throws, or aborts mid-flight
 * - `response.text` is undefined or not parseable JSON
 * - The parsed object is missing `icebreaker` / `tip`, or either is not a
 *   non-empty string
 *
 * The `signal` from the caller's `AbortController` is forwarded to the SDK
 * via `config.abortSignal`. The `@google/genai` SDK supports it natively
 * (see `GenerateContentConfig.abortSignal` in its type declarations), so no
 * promise race is required to honor the timeout.
 */
export async function generateIcebreaker(
  input: WingmanPromptInput,
  signal: AbortSignal,
): Promise<WingmanResult | null> {
  if (signal.aborted) {
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: renderWingmanPrompt(input),
      config: {
        responseMimeType: "application/json",
        responseSchema: wingmanResponseSchema,
        thinkingConfig: { thinkingBudget: 0 },
        abortSignal: signal,
      },
    });

    const text = response.text;
    if (typeof text !== "string" || text.length === 0) {
      return null;
    }

    const parsed: unknown = JSON.parse(text);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    const obj = parsed as Record<string, unknown>;
    const icebreaker = obj.icebreaker;
    const tip = obj.tip;

    if (
      typeof icebreaker !== "string" ||
      icebreaker.length === 0 ||
      typeof tip !== "string" ||
      tip.length === 0
    ) {
      return null;
    }

    return { icebreaker, tip };
  } catch {
    return null;
  }
}
