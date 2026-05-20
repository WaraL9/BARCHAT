# Implementation Plan: Next.js Scaffold for BARCHAT

## Overview

Scaffold the foundational Next.js 14 project for BARCHAT with App Router, TypeScript, and Tailwind CSS. Install Supabase JS client and Google Gen AI SDK, create utility modules with environment variable validation, configure mobile-first viewport, and ensure the project builds cleanly.

## Tasks

- [x] 1. Initialize Next.js 14 project with App Router, TypeScript, and Tailwind CSS
  - [x] 1.1 Create Next.js 14 project using `create-next-app` with TypeScript, Tailwind CSS, App Router, and no `src/` directory in the workspace directory
    - Run `npx create-next-app@14 . --typescript --tailwind --app --no-src-dir --eslint --import-alias "@/*"` in the workspace root
    - Verify `app/layout.tsx`, `app/page.tsx`, `tsconfig.json`, and `tailwind.config.ts` are created
    - Ensure `tsconfig.json` has `strict: true`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Configure `tailwind.config.ts` content paths to include `app/` and `lib/` directories
    - Ensure content paths include `"./app/**/*.{ts,tsx}"` and `"./lib/**/*.{ts,tsx}"`
    - Verify Tailwind's default mobile-first breakpoint strategy is preserved
    - _Requirements: 1.3, 6.2_

  - [x] 1.3 Configure `app/globals.css` with Tailwind directives
    - Ensure the file contains `@tailwind base;`, `@tailwind components;`, and `@tailwind utilities;`
    - Add minimal base styles for mobile-first 390px target
    - _Requirements: 1.3, 6.3_

- [x] 2. Install additional dependencies
  - [x] 2.1 Install `@supabase/supabase-js` version 2.x and `@google/genai` as runtime dependencies
    - Run `npm install @supabase/supabase-js@2 @google/genai`
    - Verify both packages appear in `dependencies` section of `package.json`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Install `server-only` package for server boundary enforcement
    - Run `npm install server-only`
    - This package causes build-time errors if a server module is imported in a client component
    - _Requirements: 4.3_

- [x] 3. Create Supabase browser client module
  - [x] 3.1 Create `lib/supabase.ts` with environment variable validation and singleton client export
    - Import `createClient` from `@supabase/supabase-js`
    - Validate `NEXT_PUBLIC_SUPABASE_URL` is defined, throw `Error("Missing NEXT_PUBLIC_SUPABASE_URL")` if not
    - Validate `NEXT_PUBLIC_SUPABASE_ANON_KEY` is defined, throw `Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY")` if not
    - Create and export a single shared `supabase` client instance using `createClient(url, anonKey)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 3.2 Write unit tests for `lib/supabase.ts`
    - Test that missing `NEXT_PUBLIC_SUPABASE_URL` throws the expected error message
    - Test that missing `NEXT_PUBLIC_SUPABASE_ANON_KEY` throws the expected error message
    - Test that with both vars set, the module exports a SupabaseClient instance
    - Test singleton identity: multiple imports return the same object reference
    - **Property 1: Env var validation fails fast on missing variables**
    - **Property 2: Supabase client singleton identity**
    - **Validates: Requirements 3.4, 3.5**

- [x] 4. Create Gemini server client module
  - [x] 4.1 Create `lib/gemini.ts` with server-only enforcement, env var validation, and client export
    - Import `"server-only"` at the top of the file
    - Import `GoogleGenAI` from `@google/genai`
    - Validate `GEMINI_API_KEY` is defined, throw `Error("Missing GEMINI_API_KEY")` if not
    - Create and export `ai` as a `GoogleGenAI` instance initialized with `{ apiKey: process.env.GEMINI_API_KEY }`
    - Export `DEFAULT_MODEL` constant set to `"gemini-2.5-flash"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 4.2 Write unit tests for `lib/gemini.ts`
    - Test that missing `GEMINI_API_KEY` throws the expected error message
    - Test that with the var set, the module exports a GoogleGenAI instance
    - Test that `DEFAULT_MODEL` equals `"gemini-2.5-flash"`
    - **Property 1: Env var validation fails fast on missing variables**
    - **Validates: Requirements 4.5, 4.6**

- [x] 5. Checkpoint - Verify core modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Configure environment variables and root layout
  - [x] 6.1 Create `.env.local` with placeholder values for all required environment variables
    - Add `NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url`
    - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key`
    - Add `GEMINI_API_KEY=your-gemini-api-key`
    - Use standard dotenv syntax, one KEY=value per line, no quoting
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.2 Configure `app/layout.tsx` with viewport meta tag and mobile-first container
    - Set metadata with viewport `width=device-width, initial-scale=1`
    - Set title to "BARCHAT" and description to "Meet strangers at Bangkok bars with a 15-minute countdown"
    - Apply `max-w-[390px] mx-auto` to the body element for mobile-first 390px target
    - Import `globals.css`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.3 Create `app/page.tsx` as a minimal landing page placeholder
    - Render BARCHAT title and a "Scan QR to join" message
    - Ensure no horizontal overflow at 390px viewport width
    - _Requirements: 1.1, 6.3_

- [x] 7. Create README with security acknowledgment
  - [x] 7.1 Write `README.md` with project setup instructions and security section
    - Include project title and one-liner description
    - Include tech stack list (Next.js 14, TypeScript, Tailwind CSS, Supabase, Google Gen AI)
    - Include getting started / setup instructions (`npm install`, env vars, `npm run dev`)
    - Include environment variables table
    - Include **Security** section stating RLS is disabled on all tables for this hackathon build
    - State that RLS must be enabled before any production deployment
    - Place security section after setup instructions and before any contribution/license section
    - Include available scripts section
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 8. Build verification and final checkpoint
  - [x] 8.1 Verify `npm install` completes with zero peer-dependency conflicts
    - Run `npm install` and confirm exit code 0
    - _Requirements: 8.1_

  - [x] 8.2 Verify `npm run build` completes with zero TypeScript and Next.js errors
    - Run `npm run build` and confirm exit code 0
    - Fix any type errors or build warnings
    - _Requirements: 8.2_

  - [x] 8.3 Final checkpoint - Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.
    - _Requirements: 8.1, 8.2, 8.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design explicitly notes that property-based testing provides limited value for this scaffold feature — unit tests with example-based assertions are the primary testing strategy
- The `server-only` package provides build-time enforcement of the server boundary (Property 3) — this is verified by the build step itself rather than a separate test
- TypeScript is the implementation language throughout (Next.js 14 with TypeScript configuration)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "4.1", "6.1"] },
    { "id": 3, "tasks": ["3.2", "4.2", "6.2", "6.3"] },
    { "id": 4, "tasks": ["7.1"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3"] }
  ]
}
```
