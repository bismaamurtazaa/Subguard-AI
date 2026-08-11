# SubGuard AI — Subscription & Renewal Guardian

An AI-powered subscription tracker that connects to your Gmail, automatically detects your subscriptions, scores how much you actually use each one, flags redundant overlaps, and tells you exactly what to cancel to save money — all without a single manual entry.

Built during **NativeBuilder's "Build Without Limits" Hackathon** (lablab.ai, Aug 3–10, 2026).

**Live app:** https://7edtm73x7pv9c99d94qxspqlp.nativelyai.app/
**Hackathon submission:** https://lablab.ai/ai-hackathons/nativebuilder-build-without-limits/iu-aicis-team-bisma/subguard-ai-subscription-and-renewal-guardian

---

## The Problem

People sign up for multiple subscriptions and free trials — streaming, SaaS tools, apps — and often forget about them. Free trials silently convert into paid charges, renewals go unnoticed, and manually tracking every billing date is tedious enough that most people simply give up. This leads to real, ongoing wasted spend, especially for students and budget-conscious users juggling many small recurring costs.

## The Solution

SubGuard AI removes the manual effort entirely. Connect your Gmail once, and the app:

1. **Detects** — scans your inbox for subscription-related emails (keywords + known sender domains)
2. **Extracts** — an AI agent pulls out service name, price, billing cycle, and renewal/trial-end dates
3. **Analyzes** — scores how actively each subscription is used, and flags overlapping/redundant services
4. **Recommends** — generates ranked, explainable suggestions on what to cancel and how much you'd save
5. **Alerts** — urgency-ranked notifications before renewals and trial-ends hit
6. **Assists** — one-click links to each service's own cancellation page

## Key Features

- 🔐 **Zero manual entry** — Gmail OAuth (read-only) + Supabase Auth, multi-user
- 🤖 **AI Extraction Agent** — parses subscription emails via OpenRouter (Gemini 2.0 Flash), with rule-based fallback
- 📊 **Usage-Value Scoring** — 0–100 score + label (rarely / occasional / moderate / frequent) from email activity signals
- 🔗 **Overlap Detection** — groups subscriptions serving the same purpose (e.g. two music streaming apps)
- 💡 **Recommendation Agent** — ranked cancel/save suggestions with reasoning and savings estimates
- ⏰ **Urgency-Ranked Alerts** — 7 / 3 / 1-day renewal and trial-end notifications
- 🖱️ **Cancel Assist** — curated direct cancellation links, with an auto-generated search-link fallback
- 📈 **Spend Dashboard** — monthly/yearly totals, spend-by-category breakdown
- 🛡️ **Graceful AI fallbacks** — every AI call has a heuristic backup, so the app never breaks if the AI is temporarily unavailable

## Tech Stack

| Layer | Technology |
|---|---|
| Platform | [native.builder](https://nativelyai.com) — AI-native app builder |
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Supabase (Auth, Postgres, Edge Functions) |
| Email Access | Gmail API (OAuth, read-only scope) |
| AI | OpenRouter (Google Gemini 2.0 Flash) |

## How It Was Built

This project was built end-to-end using [native.builder](https://nativelyai.com), an AI-native app-building platform, through a pipeline of specialized AI agents:

- **Product Architect** — scoped requirements into a PRD
- **Task Planner** — broke the PRD into an ordered build plan
- **Builder** — generated and iterated on the actual code
- **QA Agent** — ran type checks, builds, and automated smoke tests before every deploy

The core Gmail scanning and AI-analysis logic lives in a single Supabase Edge Function (`supabase/functions/scan-gmail`), which handles the full pipeline: Gmail search → rule-based + AI extraction → usage scoring → overlap detection → recommendation generation → database writes, with heuristic fallbacks at every AI-dependent step.

## Project Structure

```
├── src/                          # React frontend (Dashboard, Subscriptions,
│                                    Recommendations, Alerts, Settings pages)
├── public/                       # Static assets
├── supabase/
│   └── functions/
│       └── scan-gmail/           # Core Edge Function: Gmail scan + AI pipeline
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Known Limitations

This was built under a hackathon timeline, and a few things are still being refined:

- Gmail-based detection occasionally produces false positives for multi-purpose sender domains (e.g. flags a promotional email as a subscription)
- Detection accuracy for some services can be inconsistent depending on email content
- Price extraction falls back to typical/estimated pricing when the exact amount isn't present in the scanned email

These are actively being worked on post-hackathon. Contributions and suggestions are welcome.

## Team

Built by **Team AICIS (Team Bisma)** — AI, Advanced Computing & Information Security Society, Iqra University

- **Bisma Murtaza** — Team Lead
- **Yusra Fazal** — Team Member

## License

This project was built for NativeBuilder's "Build Without Limits" Hackathon on lablab.ai.
