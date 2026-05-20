# BARCHAT

Meet strangers at Bangkok bars with a 15-minute countdown.

## Tech Stack

- [Next.js 14](https://nextjs.org/) — App Router with React Server Components
- [TypeScript](https://www.typescriptlang.org/) — Strict mode enabled
- [Tailwind CSS](https://tailwindcss.com/) — Mobile-first utility classes
- [Supabase](https://supabase.com/) — Database and real-time subscriptions
- [Google Gen AI](https://ai.google.dev/) — Gemini 2.5 Flash for AI features

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase project with your database configured
- A Google AI API key for Gemini access

### Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Or edit `.env.local` directly with your values (see Environment Variables below).

3. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Your Supabase anonymous/public key |
| `GEMINI_API_KEY` | Server only | Your Google AI API key for Gemini |

All variables are required. The app will throw an error at startup if any are missing.

## Security

> **⚠️ Hackathon Build — RLS Disabled**

Supabase Row Level Security (RLS) is **disabled** on all tables for this hackathon build. RLS is disabled to simplify development during the hackathon.

**RLS must be enabled before any production deployment.** Without RLS, any client with the anon key can read and write all rows in every table. Before going live:

1. Enable RLS on every table in the Supabase dashboard
2. Write appropriate row-level policies for each table
3. Test that unauthorized access is properly denied

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Create an optimized production build |
| `npm start` | Run the production server |
| `npm run lint` | Run ESLint to check for code issues |
