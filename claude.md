# Chronicle AI - AI-Powered Privacy-First Journal

## Product Vision
A next-generation journaling app that automatically captures life context while respecting privacy. Combines the best of Diarium's one-time pricing and cross-platform sync with modern AI assistance and ambient data capture.

**Tagline:** "Your life story, written for you."

**App Store Title:** "Chronicle AI - Auto Journal & Memory Diary"

**Positioning:** The only AI-powered journal that respects your privacy with local AI, auto-capture, and one-time pricing.

---

## Core Value Proposition
- **Auto-Context Capture**: Photos, location, weather, music pulled automatically
- **Privacy-First AI**: Local LLM for search, insights, and writing assistance
- **One-Time Purchase**: $49 base, $99 lifetime AI features (no subscriptions)
- **Cross-Platform Sync**: Windows, Mac, iOS, Android with E2E encryption
- **Rich Memory Recall**: Semantic search, pattern detection, relationship tracking

---

## Target User Profile

### Demographics
- Age: 28-55
- Tech-savvy but values simplicity
- Multi-device user (desktop + mobile)
- Income: $50k-$100k+
- Willing to pay premium for quality tools

### Psychographics
- Values privacy and data ownership
- Anti-subscription mindset
- Journaling is a daily habit (tried 5-10 other apps)
- Wants to capture everything with minimal effort
- Reviews past entries for reflection and patterns

### Pain Points Solved
1. Manual attachment of photos/context is tedious
2. Subscription fatigue from other journal apps
3. Privacy concerns with cloud AI services
4. Difficulty finding old entries beyond keyword search
5. Lack of insights/patterns from years of journaling

---

## Feature Specifications

### Phase 1: MVP (Core Journaling)

#### 1.1 Entry Creation
```typescript
interface JournalEntry {
  id: string;
  date: Date;
  content: string; // Markdown support
  mood?: 'great' | 'good' | 'okay' | 'bad' | 'awful';
  tags: string[];
  location?: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  weather?: {
    temp: number;
    condition: string;
    icon: string;
  };
  attachments: {
    photos: Photo[];
    videos: Video[];
    audio: Audio[];
    files: File[];
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    deviceId: string;
    wordCount: number;
  };
}
```

**Features:**
- Rich text editor with Markdown
- Quick mood selector (5 emotions)
- Tag autocomplete with suggestions
- Auto-save every 5 seconds
- Distraction-free writing mode

#### 1.2 Auto-Context Capture
- **Photos**: Auto-scan device photo library for today's images
- **Location**: GPS coordinates + reverse geocode to readable name
- **Weather**: Fetch from OpenWeather API based on location
- **Time**: Auto-timestamp with timezone awareness

#### 1.3 Timeline & Calendar View
- Chronological feed (infinite scroll)
- Calendar heatmap (color by activity)
- Filter by: date range, tags, mood, location
- Quick navigation: today, this week, this month, this year

#### 1.4 Search (Basic)
- Full-text search across all entries
- Filter by date, tags, mood
- Sort by relevance or date
- Highlight matching text

### Phase 2: AI Features (Post-MVP)

#### 2.1 Local AI Assistant
**Tech Stack:**
- Ollama (local LLM runner)
- Model: Llama 3.2 3B or Phi-3 Mini (privacy + performance)
- Vector DB: ChromaDB for semantic search

**Features:**
- **Semantic Search**: "Find entries where I felt anxious about work"
- **Writing Prompts**: AI suggests reflection questions based on entry
- **Auto-Summarization**: Weekly/monthly summaries
- **Sentiment Analysis**: Track emotional trends over time
- **Entity Extraction**: Auto-detect people, places, activities mentioned

#### 2.2 Pattern Insights
```typescript
interface Insight {
  type: 'person' | 'place' | 'activity' | 'emotion' | 'trend';
  title: string;
  description: string;
  frequency: number;
  dateRange: { start: Date; end: Date };
  relatedEntries: string[]; // entry IDs
}
```

**Examples:**
- "You've mentioned 'Sarah' 47 times this year"
- "You tend to journal more on Sundays"
- "Last time you felt this way was June 2023"
- "Your stress levels peak on Mondays"

#### 2.3 Smart Auto-Import
- **Google Photos**: OAuth integration, pull photos by date
- **Spotify**: "What you listened to today"
- **Apple Health / Google Fit**: Steps, workouts, sleep data
- **Calendar**: Meetings/events from that day
- **Optional Browser History**: Highlights from visited sites

### Phase 3: Advanced Features

#### 3.1 Media Enhancements
- Auto-compress photos/videos for storage
- Video trimming/clipping in-app
- Multi-photo collage maker
- OCR on photos (extract text from tickets, notes)
- Audio transcription (voice memos → text)

#### 3.2 Relationship Tracking
- Auto-detect people mentioned in entries
- "People" tab: see all mentions of each person
- Relationship timeline: when/how often you interact
- Reminders: "You haven't written about Mom in 2 months"

#### 3.3 Advanced Export
- PDF with formatting + embedded media
- HTML website (static site generator)
- Markdown files (Obsidian-compatible)
- JSON backup (full data export)

---

## Technical Architecture

### Tech Stack

#### Frontend
- **Framework**: React (Web), React Native (Mobile)
- **UI Design**: Use Claude's frontend-design skill for production-grade, distinctive UI
- **UI Library**: Tailwind CSS + shadcn/ui (following frontend-design patterns)
- **State**: Zustand or Jotai (lightweight)
- **Editor**: TipTap (rich text with Markdown)
- **Date Picker**: React DayPicker (styled via frontend-design)
- **Calendar Heatmap**: Custom D3.js component (designed via frontend-design skill)

#### Backend / Sync
- **Database**: SQLite (local) + PostgreSQL (cloud)
- **ORM**: Drizzle ORM
- **Sync Engine**: Custom CRDT-based (or use ElectricSQL)
- **Encryption**: E2E with libsodium (XChaCha20-Poly1305)
- **Storage**: Local files + S3-compatible (Backblaze B2)

#### AI/ML
- **Local LLM**: Ollama (Llama 3.2 3B)
- **Vector DB**: ChromaDB (embeddings for semantic search)
- **Embeddings**: nomic-embed-text (local, fast)
- **Transcription**: Whisper.cpp (local audio → text)

#### Platform
- **Desktop**: Tauri (Rust + web tech) - smaller than Electron
- **Mobile**: React Native with local SQLite
- **Cloud**: Cloudflare Workers (serverless sync API)

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Devices                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Desktop  │  │  iPhone  │  │  Android │  │    iPad  │   │
│  │ (Tauri)  │  │   (RN)   │  │   (RN)   │  │   (RN)   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                         │                                    │
│                         ▼                                    │
│              ┌──────────────────────┐                       │
│              │   Local SQLite DB    │                       │
│              │  (Encrypted at Rest) │                       │
│              └──────────┬───────────┘                       │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Sync Engine (CRDT)  │
              │  E2E Encrypted Diffs  │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Cloud Sync Server   │
              │  (Cloudflare Workers) │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   PostgreSQL (Cloud)  │
              │   + S3 Media Storage  │
              └───────────────────────┘
```

### Database Schema (SQLite)

```sql
-- Core tables
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  date INTEGER NOT NULL, -- Unix timestamp
  content TEXT NOT NULL,
  mood TEXT,
  location_name TEXT,
  location_lat REAL,
  location_lng REAL,
  weather_temp REAL,
  weather_condition TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  word_count INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  synced_at INTEGER
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE entry_tags (
  entry_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (entry_id, tag_id),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'photo', 'video', 'audio', 'file'
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Local path or S3 URL
  file_size INTEGER,
  mime_type TEXT,
  thumbnail_path TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE TABLE people (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  first_mentioned INTEGER,
  last_mentioned INTEGER,
  mention_count INTEGER DEFAULT 0
);

CREATE TABLE entry_people (
  entry_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  PRIMARY KEY (entry_id, person_id),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

-- AI features
CREATE TABLE embeddings (
  entry_id TEXT PRIMARY KEY,
  embedding BLOB NOT NULL, -- Vector embedding for semantic search
  model_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE TABLE insights (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL
);

-- Sync metadata
CREATE TABLE sync_log (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'create', 'update', 'delete'
  timestamp INTEGER NOT NULL,
  synced INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_entries_date ON entries(date DESC);
CREATE INDEX idx_entries_synced ON entries(synced_at);
CREATE INDEX idx_attachments_entry ON attachments(entry_id);
CREATE INDEX idx_entry_tags_entry ON entry_tags(entry_id);
CREATE INDEX idx_entry_tags_tag ON entry_tags(tag_id);
CREATE INDEX idx_sync_log_device ON sync_log(device_id, timestamp);
```

---

## File Structure

```
chronicle-ai/
├── apps/
│   ├── desktop/              # Tauri app
│   │   ├── src-tauri/        # Rust backend
│   │   └── src/              # React frontend
│   ├── mobile/               # React Native
│   │   ├── ios/
│   │   ├── android/
│   │   └── src/
│   └── web/                  # Optional web client
│       └── src/
├── packages/
│   ├── db/                   # Drizzle ORM schemas
│   ├── sync/                 # CRDT sync engine
│   ├── ai/                   # Local AI utilities
│   ├── ui/                   # Shared React components
│   └── types/                # Shared TypeScript types
├── services/
│   ├── sync-server/          # Cloudflare Workers
│   └── media-storage/        # S3 upload handlers
└── docs/
    ├── ARCHITECTURE.md
    ├── API.md
    └── DEPLOYMENT.md
```

---

## Monetization Strategy

### Pricing Tiers

#### Free (Limited)
- 30 entries max
- Basic search (keyword only)
- 100MB storage
- Single device (no sync)
- **Goal**: Let users fall in love with the app

#### One-Time Purchase - $49
- Unlimited entries
- Cross-platform sync (E2E encrypted)
- 5GB cloud storage
- Basic auto-capture (photos, location, weather)
- Export to PDF/HTML/Markdown
- **Upgrade Path**: 60% convert after hitting 30-entry limit

#### Lifetime AI - $99 (or $29 upgrade from base)
- All features from $49 tier
- Local AI assistant (semantic search, insights)
- Auto-import (Google Photos, Spotify, Health apps)
- Relationship tracking
- Advanced media tools (OCR, transcription)
- 20GB cloud storage
- Priority support
- **Upsell**: After 6 months of daily use, users see value

### Revenue Projections (Year 1)

**Conservative:**
- 1,000 users × $49 = $49,000
- 200 users × $99 = $19,800
- **Total**: $68,800

**Optimistic:**
- 5,000 users × $49 = $245,000
- 1,500 users × $99 = $148,500
- **Total**: $393,500

**Key Metrics:**
- Free → Paid conversion: 15-25%
- Base → AI upgrade: 30-40% after 6 months
- Churn: <5% (one-time purchase, very sticky)

---

## Competitive Differentiation

| Feature | Chronicle AI | Diarium | Day One | Notion |
|---------|-----------|---------|---------|---------|
| **Pricing** | $49-99 one-time | $15 one-time | $50/year | $10/month |
| **AI Assistant** | ✅ Local LLM | ❌ | ❌ | ✅ Cloud |
| **Auto-Import** | ✅ Multi-source | ⚠️ Limited | ⚠️ Apple only | ❌ |
| **Privacy** | ✅ E2E + Local AI | ✅ E2E option | ⚠️ Cloud-based | ❌ Cloud |
| **Semantic Search** | ✅ Local vectors | ❌ | ❌ | ⚠️ Basic |
| **Media Handling** | ✅ Advanced | ⚠️ Basic | ✅ Good | ⚠️ Basic |
| **Cross-Platform** | ✅ All platforms | ✅ All platforms | ⚠️ Apple-first | ✅ Web-first |
| **Insights** | ✅ AI-powered | ⚠️ Basic stats | ⚠️ Basic | ❌ |
| **UI Design** | ✅ Distinctive | ⚠️ Generic | ✅ Polished | ⚠️ Generic |

**Unique Selling Points:**
1. **Only app with local AI** (privacy + smart features)
2. **Auto-everything** (photos, music, activity pulled automatically)
3. **One-time pricing** in an age of subscriptions
4. **Built for long-term journalers** (semantic search across years of data)
5. **Distinctive UI** - Production-grade design via frontend-design skill, avoiding generic journal app aesthetics

### UI Differentiation Strategy

Most journal apps fall into two camps:
1. **Boring/Functional** (Diarium, Standard Notes) - Windows 95 vibes, minimal design
2. **Generic Modern** (Most new apps) - Gradient backgrounds, card layouts, looks like every other SaaS app

**Chronicle AI stands out by:**
- Using frontend-design skill to create memorable, handcrafted components
- Thoughtful visualization (calendar heatmap, timeline, mood selector)
- Avoiding generic shadcn/ui defaults (customize every component)
- Design feels intentional, not templated
- Dark mode that's actually beautiful (not just inverted colors)

**Examples of Distinctive Design:**
- **Calendar Heatmap**: Not just color intensity - creative shape/layout that makes patterns visible
- **Mood Selector**: Beyond simple emoji buttons - visual that feels satisfying to click
- **Timeline Cards**: Unique treatment that shows content preview + metadata without feeling cluttered
- **Tag Pills**: Meaningful color system + creative shape/interaction design
- **Editor**: Distraction-free but with personality (not just white rectangle)

---

## Success Metrics

### Product Metrics
- **Daily Active Users (DAU)**: Target 60%+ of total users
- **Entries per Week**: Target 5+ (daily habit formation)
- **Retention**: 
  - D7: >70%
  - D30: >50%
  - D90: >40%
- **Free → Paid**: 20% conversion within 60 days
- **NPS Score**: Target >50 (passionate user base)

### Technical Metrics
- **Sync Latency**: <3 seconds across devices
- **Search Speed**: <200ms for 10,000 entries
- **Crash Rate**: <0.1%
- **Data Loss**: 0% (bulletproof sync + local backups)

### Business Metrics
- **CAC (Customer Acquisition Cost)**: <$15 via word-of-mouth + content
- **LTV (Lifetime Value)**: $60-80 (base + AI upgrade)
- **Payback Period**: <30 days
- **Monthly Recurring Revenue**: $0 (intentionally - one-time model)

---

## Go-To-Market Strategy

### Phase 1: Private Beta (Months 1-2)
- 50-100 power users (journaling enthusiasts)
- Platforms: Reddit (r/Journaling), journaling Discord servers
- **Goal**: Product validation + testimonials

### Phase 2: Public Launch (Month 3)
- **Product Hunt**: Aim for #1 Product of the Day
- **Hacker News**: "Show HN: Privacy-first journal with local AI"
- **Content Marketing**: 
  - "Why I Built This Instead of Using Day One"
  - "The Privacy Problem with Modern Journal Apps"
  - "Building a Local AI Assistant That Never Sends Your Data"

### Phase 3: Growth (Months 4-12)
- **SEO Content**: "Best journaling apps", "Diarium alternatives"
- **YouTube**: App walkthrough, privacy deep-dive
- **Partnerships**: Privacy-focused YouTubers/bloggers
- **App Stores**: Optimize for "journal", "diary", "privacy" keywords

### Distribution Channels
1. **Own Website**: Direct downloads (avoid 30% app store fee where possible)
2. **Mac App Store**: For discovery
3. **Microsoft Store**: For discovery
4. **Google Play / App Store**: For mobile discovery
5. **GitHub**: Open-source core (UI closed-source, monetize features)

---

## Development Roadmap

### Month 1-2: MVP Core
- [ ] **Use frontend-design skill** to create distinctive UI patterns and design system
- [ ] Basic entry creation (text, date, mood)
- [ ] SQLite database + encryption
- [ ] Timeline & calendar view (designed via frontend-design)
- [ ] Photo attachment (manual)
- [ ] Keyword search
- [ ] Desktop app (Mac/Windows via Tauri)

### Month 3-4: Sync & Mobile
- [ ] E2E encrypted sync engine
- [ ] Cloud backend (Cloudflare Workers + PostgreSQL)
- [ ] iOS app (React Native)
- [ ] Android app (React Native)
- [ ] Location & weather auto-capture

### Month 5-6: AI Features
- [ ] Ollama integration (local LLM)
- [ ] Semantic search (ChromaDB vectors)
- [ ] Writing prompts & summaries
- [ ] Sentiment analysis
- [ ] Weekly/monthly AI insights

### Month 7-8: Auto-Import
- [ ] Google Photos OAuth integration
- [ ] Spotify API (listening history)
- [ ] Apple Health / Google Fit
- [ ] Calendar events pull
- [ ] Browser history (optional)

### Month 9-10: Advanced Media
- [ ] Photo/video compression
- [ ] Video trimming in-app
- [ ] OCR on images (Tesseract)
- [ ] Audio transcription (Whisper.cpp)
- [ ] Multi-photo collage maker

### Month 11-12: Polish & Launch
- [ ] Onboarding flow
- [ ] Export to PDF/HTML/Markdown
- [ ] Relationship tracking
- [ ] Pattern insights dashboard
- [ ] Performance optimization
- [ ] Public beta → Launch

---

## Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Sync conflicts | High | CRDT-based sync (Last-Write-Wins with vector clocks) |
| Data loss | Critical | Triple backup: local + cloud + export reminders |
| AI model size | Medium | Ship 3B param model (2-3GB), optional download |
| Cross-platform bugs | Medium | Shared codebase (React/RN), extensive testing |
| Performance with 10k+ entries | Medium | Lazy loading, pagination, indexed search |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Low conversion rate | High | Generous free tier (30 entries) to build habit first |
| Competition from Day One | Medium | Focus on privacy + one-time pricing differentiation |
| AI hype fades | Low | AI is enhancement, not core (journaling is timeless) |
| Privacy backlash | Low | Full transparency: local AI, open-source sync layer |

### Legal/Compliance
- **GDPR**: User controls all data, easy export/delete
- **CCPA**: Same as GDPR
- **App Store Guidelines**: No violations (user-generated content only)
- **Data Breach**: E2E encryption means we can't access user data

---

## Open Questions / Decisions Needed

1. **Freemium or paid-only?**
   - Leaning: Freemium (30 entries) to reduce friction
   
2. **Desktop-first or mobile-first?**
   - Leaning: Desktop MVP, mobile in Month 3 (desktop = deep writing)

3. **Open-source core?**
   - Leaning: Yes (sync engine, DB schema) - builds trust, keep UI closed

4. **Self-hosted option?**
   - Maybe: Advanced users can run own sync server (differentiation vs Day One)

5. **Subscription tier for cloud costs?**
   - Avoid if possible - bake storage into one-time price, upsell more storage

---

## Appendix: User Stories

### Story 1: Sarah, the Daily Journaler
**Profile**: 34, product manager, journals every morning
**Pain**: Day One costs $50/year, she's been paying for 5 years ($250 total)
**Behavior**: Opens app, sees auto-imported photos from yesterday, writes 3 paragraphs, tags mood, done in 5 minutes
**Outcome**: Saves $50/year, gets AI insights like "You mentioned work stress 12 times this month"

### Story 2: Marcus, the Privacy Advocate
**Profile**: 42, software engineer, tried Notion but hates cloud AI
**Pain**: Doesn't trust cloud services with personal thoughts
**Behavior**: Runs local AI (Ollama), searches "Find entries where I was anxious about my daughter", gets semantic results without sending data anywhere
**Outcome**: Gets modern AI features without privacy compromise

### Story 3: Emma, the Memory Keeper
**Profile**: 28, photographer, wants to remember trips with rich context
**Pain**: Manually attaching 20 photos to each entry is tedious
**Behavior**: App auto-imports all photos from that day, she writes 2 sentences, AI suggests "Looks like you visited 3 new cafes - want to tag them?"
**Outcome**: Rich, multimedia memories with 90% less effort

### Story 4: David, the Therapist-Journaler
**Profile**: 55, therapist recommended journaling for anxiety
**Pain**: Forget to journal, lose insights across scattered entries
**Behavior**: Daily reminder, quick mood check, AI shows "Your anxiety peaks on Mondays - here's what helped last time"
**Outcome**: Therapeutic insights that would take a human therapist 10 sessions to spot

---

## Design Principles

1. **Privacy is non-negotiable**: E2E encryption, local AI, user owns data
2. **Capture, don't create friction**: Auto-import everything possible
3. **Insights, not interruptions**: No "rate me" popups (Diarium's #1 complaint)
4. **Timeless design**: Avoid trendy UI, focus on clarity and speed
5. **Own your tools**: One-time pricing, export anywhere, no lock-in
6. **Distinctive UI**: Use Claude's frontend-design skill to avoid generic AI aesthetics and create production-grade interfaces that feel handcrafted

### Design Approach (Using frontend-design Skill)

**Visual Identity:**
- Generate distinctive, production-grade UI using frontend-design skill
- Avoid generic gradient backgrounds and card-based layouts
- Create memorable, unique components (calendar heatmap, mood selector, timeline)
- Follow frontend-design color palette and typography constraints
- Use creative layouts that prioritize clarity over convention

**Component Design Strategy:**
- Each major component (Timeline, Calendar, Editor) gets a custom design pass
- Mood selector: Creative visualization beyond simple emoji buttons
- Tags: Distinctive pill/chip design with meaningful color system
- Entry cards: Unique treatment that balances content preview with metadata
- Navigation: Thoughtful sidebar/header that feels integrated, not templated

**Design Tokens (from frontend-design):**
- Use frontend-design's CSS variables for colors, spacing, typography
- Maintain consistency through design system
- Dark mode support following frontend-design patterns
- Responsive breakpoints following frontend-design guidelines

---

## Success Definition

**Year 1 Goals:**
- 5,000 paying users
- $300k revenue (sustainable solo dev business)
- 4.5+ star rating on all platforms
- <0.5% refund rate (product-market fit indicator)
- 3+ organic press mentions (TechCrunch, The Verge, etc.)

**Long-Term Vision (Year 3):**
- 50,000 paying users
- $3M revenue (hire 2-3 people)
- Industry leader in "privacy-first AI journaling"
- Partnership with mental health platforms
- Community-driven feature requests (build what users want, not what competitors have)

---
