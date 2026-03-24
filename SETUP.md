# Copilot — Setup Guide

## Prerequisites

1. **Node.js 18+** — https://nodejs.org (download LTS)
2. **PostgreSQL** — https://www.postgresql.org/download/ (or use a cloud DB like [Neon](https://neon.tech) — free tier)
3. **Anthropic API key** — https://console.anthropic.com

---

## Step 1 — Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/copilot"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."
```

**Quick NEXTAUTH_SECRET** (run in terminal):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Step 2 — Install Dependencies

```bash
cd copilot
npm install
```

---

## Step 3 — Database Setup

```bash
# Push schema to your DB
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed with demo data
npm run db:seed
```

---

## Step 4 — Run the App

```bash
npm run dev
```

Open http://localhost:3000

**Demo login:** `alex@demo.com` / `demo1234`

---

## Project Structure

```
copilot/
├── app/
│   ├── (auth)/           # Login & Register pages
│   ├── (dashboard)/      # All 6 module pages
│   │   ├── page.tsx      # Main dashboard
│   │   ├── jobs/         # Job Discovery
│   │   ├── resume/       # Resume Tailor
│   │   ├── apply/        # Auto-Apply tracker
│   │   ├── network/      # Network Contacts
│   │   ├── interview/    # Interview Prep
│   │   └── readiness/    # Readiness Score
│   ├── api/              # All API routes (streaming Claude)
│   └── onboarding/       # First-time setup flow
├── components/
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Sidebar + layouts
├── lib/
│   ├── anthropic.ts      # Claude streaming helpers
│   ├── auth.ts           # NextAuth config
│   ├── prisma.ts         # DB client
│   └── utils.ts          # Utilities
├── prisma/
│   ├── schema.prisma     # Full DB schema
│   └── seed.ts           # Demo data
└── types/index.ts        # TypeScript types
```

---

## Features

| Module | What it does |
|--------|-------------|
| **Job Discovery** | Enter role + location → AI surfaces 8 curated jobs with match scores |
| **Resume Tailor** | Upload resume + select job → AI rewrites it with a diff view |
| **Auto-Apply** | One-click AI fills applications → live status tracker |
| **Network** | Enter company → AI finds contacts + drafts outreach messages |
| **Interview Prep** | Select job → AI generates questions → practice + get scored feedback |
| **Readiness Score** | Composite score from all activity + prioritized action plan |

---

## Optional: Neon DB (Free PostgreSQL)

1. Go to https://neon.tech and create a free project
2. Copy the connection string
3. Paste as DATABASE_URL in .env
4. Run `npm run db:push && npm run db:seed`
