# THE MORNING BRIEF — Product Specification

## 🧠 Product Overview

**The Morning Brief** is a modern, AI-powered digital newspaper that generates a personalized morning intelligence briefing.

It aggregates global news, AI developments, markets, and regional intelligence into a single, high-signal daily edition optimized for mobile reading.

The goal is to eliminate information overload and replace it with a **curated, ranked, and summarized morning briefing**.

---

## ⚙️ System Architecture

### Frontend

- Next.js (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui (minimal usage)
- Deployed on **Cloudflare Pages (OpenNext adapter)**
- Fully responsive + PWA-enabled

---

### Backend

- Cloudflare Workers (Hono framework)
- Responsibilities:
  - News ingestion
  - Story clustering
  - AI summarization orchestration
  - Market data aggregation
  - Daily edition generation

---

### Scheduling

- Cloudflare Cron Triggers (free tier)
  - 05:30 AM Asia/Riyadh → generate morning edition
  - Frequent market refresh jobs
  - Background retry on failure

---

### Database

- Supabase Postgres

Stores:

- articles
- story_clusters
- daily_editions
- market_snapshots
- sources
- user_preferences (optional)

---

### AI Layer

- OpenAI Responses API (server-side only in Workers)

Used for:

- story clustering
- ranking importance
- summarization
- “Why it matters” generation

---

### Caching (optional but recommended)

- Cloudflare KV
  - latest edition cache
  - fast homepage load
  - fallback when Supabase is slow

---

## 📰 Core Product Behavior

The system generates a **daily morning edition** that behaves like a digital newspaper.

It must:

- aggregate multiple sources per story
- deduplicate identical news
- cluster related reporting into single story units
- rank by importance, not volume
- avoid repetition and noise
- prioritize high-impact global events

---

## 🧭 Content Priorities

Stories must be ranked in this order:

1. Artificial Intelligence
2. Saudi Arabia
3. Middle East geopolitics
4. US political & economic developments
5. Global major events
6. Markets (stocks, crypto, oil, macro)
7. Cybersecurity, GRC, enterprise tech
8. Saudi tech, startups, Vision 2030

---

## 🗞️ Page Structure

### 1. Masthead

- “THE MORNING BRIEF”
- Riyadh date
- Edition timestamp
- Status: Live / Updating / Stale
- Manual refresh button

---

### 2. Front Page (Top Stories)

3–5 most important global stories.

Each includes:

- Headline
- 2–3 sentence summary
- “Why it matters” (1 sentence)
- Sources
- Timestamp
- Category
- Link to original reporting

---

### 3. AI & Technology

- AI model releases
- Big tech updates
- Chips & infrastructure
- AI regulation
- Enterprise AI adoption

---

### 4. Saudi Arabia

- Government policy
- Economy & Vision 2030
- PIF activity
- Tech ecosystem

---

### 5. Middle East

- geopolitics
- diplomacy
- conflicts
- regional security

---

### 6. US & World

- major political developments
- global macro events
- international policy shifts

---

### 7. Markets Dashboard

Includes:

- TASI
- S&P 500
- Nasdaq
- Dow Jones
- Bitcoin
- Brent crude
- WTI crude
- Gold
- USD/SAR

Each instrument includes:

- value
- % change
- direction
- timestamp

Also includes:

- AI-generated market summary

---

### 8. On My Radar

- cybersecurity
- enterprise tech
- Saudi startups
- AI tooling

Only shown when meaningful stories exist.

---

### 9. What to Watch Today

- earnings
- macro data releases
- central bank decisions
- geopolitical events
- scheduled announcements

---

## 🧠 Data Pipeline

### Step 1: Ingestion

Workers fetch from:

- RSS feeds
- news APIs
- financial APIs
- crypto APIs
- commodity APIs

---

### Step 2: Normalization

Convert all sources into unified schema:

- title
- content
- source
- timestamp
- url
- category
- region

---

### Step 3: Deduplication

- remove identical URLs
- detect near-duplicate stories
- cluster semantically similar articles

---

### Step 4: Ranking

Score based on:

- global impact
- source credibility
- number of independent sources
- recency
- relevance to Saudi/Middle East/AI

---

### Step 5: AI Summarization

OpenAI generates:

- summary (2–3 sentences)
- why it matters (1 sentence)
- structured JSON output

Rules:

- no hallucination
- no speculation
- no political bias
- must remain source-grounded

---

### Step 6: Storage

Store:

- story clusters
- daily editions
- market snapshots
- metadata

---

## ⏱️ Scheduling System

Using Cloudflare Cron:

### 05:30 AM Riyadh

- generate full morning edition

### Market Refresh

- frequent updates throughout the day

### Fallback Logic

If edition is missing:

- serve last cached version
- trigger background regeneration

---

## 📱 UX / Design System

Design must feel like a **premium modern newspaper**.

Principles:

- serif headlines
- clean editorial spacing
- minimal UI chrome
- strong hierarchy
- mobile-first reading experience
- sepia + dark + light modes
- no dashboard aesthetics
- no clutter

---

## 🚀 Deployment

- Cloudflare Pages → frontend
- Cloudflare Workers → backend
- Supabase → database
- Wrangler CLI → deployment tool

---

## 🔐 Security

- API keys remain server-side only
- Workers handle all external API calls
- no secrets in frontend
- rate limit refresh endpoints
- protect cron endpoints with secret header

---

## 📦 MVP Completion Criteria

The system is complete when:

- homepage loads a real morning edition
- stories are deduplicated and clustered
- AI summaries are generated server-side
- markets are live and timestamped
- cron job generates daily edition automatically
- UI is mobile-first and readable
- deployment works on Cloudflare Pages
- no Vercel dependency remains

---

## 🧠 Final Note

This system is designed to be:

- low-cost (Cloudflare free tier)
- AI-native
- scalable
- production-ready from day one
