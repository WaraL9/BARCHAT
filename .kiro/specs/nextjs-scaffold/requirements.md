# Requirements Document

## Introduction

This feature scaffolds the foundational Next.js 14 project for the BARCHAT application. It sets up the App Router with TypeScript and Tailwind CSS, installs required dependencies (Supabase JS client and Google Gen AI SDK), creates utility modules for Supabase and Gemini clients, and provides environment variable placeholders. The scaffold establishes the base upon which all subsequent BARCHAT features are built.

## Glossary

- **Scaffold**: The initial project structure created by `create-next-app` including configuration files, directory layout, and base dependencies.
- **App_Router**: Next.js 14 routing system using the `app/` directory convention with file-based routing.
- **Browser_Client**: A Supabase client instance configured for use in client-side (browser) React components.
- **Server_Client**: A Gemini AI client instance restricted to server-side execution only (not importable in client components).
- **Environment_File**: The `.env.local` file containing environment-specific configuration values as key-value pairs.
- **Workspace_Directory**: The root directory where the project is scaffolded (`c:\uni_file\intania_year2_semester_2\competition\BARCHAT`).

## Requirements

### Requirement 1: Project Initialization

**User Story:** As a developer, I want a Next.js 14 App Router project scaffolded with TypeScript and Tailwind CSS in the workspace directory, so that I have a working foundation to build the BARCHAT application.

#### Acceptance Criteria

1. WHEN the scaffold is created, THE Scaffold SHALL use Next.js version 14 with the App Router directory structure (an `app/` directory at the project root containing at least one `layout.tsx` and one `page.tsx`).
2. WHEN the scaffold is created, THE Scaffold SHALL configure TypeScript as the project language with a `tsconfig.json` that parses without errors and enables strict mode.
3. WHEN the scaffold is created, THE Scaffold SHALL configure Tailwind CSS with a `tailwind.config.ts` whose content paths include the `app/` directory, and include the three Tailwind directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`) in the global stylesheet.
4. WHEN the scaffold is created, THE Scaffold SHALL place all project files in the Workspace_Directory.
5. THE Scaffold SHALL NOT include any external CSS frameworks beyond Tailwind CSS, UNLESS Tailwind CSS fails to configure properly, THEN THE Scaffold SHALL allow external CSS frameworks as fallbacks.
6. THE Scaffold SHALL NOT include any state management libraries.

### Requirement 2: Dependency Installation

**User Story:** As a developer, I want `@supabase/supabase-js` and `@google/genai` packages installed, so that I can interact with Supabase and Google Gemini AI services.

#### Acceptance Criteria

1. WHEN the scaffold is created, THE Scaffold SHALL include `@supabase/supabase-js` version 2.x as a runtime dependency in the `dependencies` section of `package.json`.
2. WHEN the scaffold is created, THE Scaffold SHALL include `@google/genai` as a runtime dependency in the `dependencies` section of `package.json`.
3. WHEN dependencies are installed, THE Scaffold SHALL generate a lock file that is consistent with `package.json` and contains resolved versions for all declared dependencies without integrity or peer-dependency errors.
4. WHEN dependencies are installed, THE Scaffold SHALL allow importing `@supabase/supabase-js` and `@google/genai` in TypeScript files without module resolution errors.

### Requirement 3: Supabase Browser Client Module

**User Story:** As a developer, I want a `lib/supabase.ts` module that exports a configured Supabase browser client, so that client-side components can interact with the Supabase backend.

#### Acceptance Criteria

1. WHEN the scaffold is created, THE Scaffold SHALL create a file at `lib/supabase.ts`.
2. THE Browser_Client SHALL be initialized by calling `createClient` from `@supabase/supabase-js` with the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables.
3. THE Browser_Client SHALL be exported as a named or default export from `lib/supabase.ts` for use in client-side components.
4. IF `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing at runtime, THEN THE module SHALL export `undefined` or `null` instead of a configured client instance, allowing the module to load without throwing.
5. THE `lib/supabase.ts` module SHALL export a single shared client instance such that multiple imports across components reuse the same object.

### Requirement 4: Gemini Server Client Module

**User Story:** As a developer, I want a `lib/gemini.ts` module that exports a configured Gemini AI client for server-side use only, so that server actions and route handlers can call the Gemini API.

#### Acceptance Criteria

1. WHEN the scaffold is created, THE Scaffold SHALL create a file at `lib/gemini.ts`.
2. THE Server_Client SHALL be initialized using `GoogleGenAI` from `@google/genai` with `{ apiKey: process.env.GEMINI_API_KEY }`.
3. THE Server_Client SHALL be restricted to server-side execution only (using the `server-only` package or equivalent mechanism).
4. THE Server_Client SHALL export the initialized `GoogleGenAI` instance for use in route handlers and server actions. IF `GEMINI_API_KEY` is missing at runtime, THEN THE module SHALL still export the client instance, allowing individual method calls to handle the error.
5. THE Server_Client SHALL specify `gemini-2.5-flash` as the default model identifier via an exported constant.
6. IF `GEMINI_API_KEY` is missing at runtime, THEN THE Server_Client SHALL allow the module to load successfully without throwing at import time.

### Requirement 5: Environment Variable Configuration

**User Story:** As a developer, I want a `.env.local` file with placeholder values for all required environment variables, so that I can quickly configure the project for local development.

#### Acceptance Criteria

1. WHEN the scaffold is created, THE Scaffold SHALL create a `.env.local` file in the Workspace_Directory.
2. THE Environment_File SHALL contain a placeholder entry for `NEXT_PUBLIC_SUPABASE_URL`.
3. THE Environment_File SHALL contain a placeholder entry for `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. THE Environment_File SHALL contain a placeholder entry for `GEMINI_API_KEY`.
5. THE Environment_File SHALL assign each variable a placeholder value that identifies the expected credential source or format (e.g., `your-supabase-project-url`, `your-supabase-anon-key`, `your-gemini-api-key`) rather than an empty string or generic filler such as `xxx` or `TODO`.
6. THE Environment_File SHALL use standard dotenv syntax with one `KEY=value` entry per line and no quoting around placeholder values.

### Requirement 6: Mobile-First Viewport Configuration

**User Story:** As a developer, I want the project configured for mobile-first development targeting a 390px viewport, so that all subsequent UI work defaults to the correct responsive baseline.

#### Acceptance Criteria

1. WHEN the scaffold is created, THE Scaffold SHALL include a viewport meta tag in the HTML `<head>` with `width=device-width` and `initial-scale=1`.
2. THE Scaffold SHALL use Tailwind CSS with its default mobile-first breakpoint strategy (styles apply at minimum viewport width and scale upward via `sm`, `md`, `lg` prefixes).
3. WHEN any page is rendered at a viewport width of 390px, THE Scaffold SHALL display all content without horizontal overflow (no horizontal scrollbar appears).
4. THE Scaffold SHALL set a maximum content width of 390px as the base design target, so that unprefixed Tailwind utility classes produce the layout intended for a 390px-wide screen. Small deviations above 390px (e.g., up to 5px) SHALL be acceptable.

### Requirement 7: README Security Acknowledgment

**User Story:** As a developer, I want the README to acknowledge that Supabase RLS is disabled, so that the security trade-off is documented for the hackathon build.

#### Acceptance Criteria

1. WHEN the scaffold is created, THE Scaffold SHALL include a dedicated section in the README file with a heading containing the word "Security" that states Supabase Row Level Security (RLS) is disabled on all tables for this hackathon build.
2. THE Scaffold SHALL state in the same README security section that RLS is disabled to simplify development during the hackathon and that RLS must be enabled before any production deployment.
3. THE Scaffold SHALL place the security acknowledgment section after the project setup instructions and before any contribution or license section, so that it is visible without scrolling past unrelated content.

### Requirement 8: Build Verification

**User Story:** As a developer, I want the scaffolded project to build and run without errors, so that I can immediately begin feature development.

#### Acceptance Criteria

1. WHEN `npm install` is executed in the project root, THE Scaffold SHALL install all dependencies with zero peer-dependency conflicts and exit with code 0.
2. WHEN `npm run build` is executed, THE Scaffold SHALL complete the TypeScript compilation and Next.js production build with zero errors and exit with code 0.
3. WHEN `npm run dev` is executed, THE Scaffold SHALL start the Next.js development server on port 3000 and respond with HTTP status 200 on `http://localhost:3000` within 30 seconds of invocation.
4. THE Scaffold SHALL produce a Next.js application that deploys to Vercel using only the default Next.js build settings, requiring no custom build commands, no additional Vercel plugins, and no configuration beyond the environment variables listed in `.env.local`.
