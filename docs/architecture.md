# StockFlow — Architecture & Technical Documentation

## Товч танилцуулга

**StockFlow** нь multi-tenant inventory management систем бөгөөд дараах үндсэн боломжуудыг агуулна:

- Бараа материалын бүртгэл, хяналт
- AI-д суурилсан reorder зөвлөмж, workflow автоматжуулалт
- Бодит цагийн мэдэгдэл (SSE)
- Байгууллагын гишүүдийн удирдлага (RBAC)
- Gamification (оноо, badge, leaderboard)
- Олон хэлний дэмжлэг (MN/EN)
- Stripe billing интеграц
- Prometheus metrics + Grafana monitoring

---

## Хуудасны бүтэц (Pages)

| URL | Нэр | Тайлбар |
|-----|-----|---------|
| `/dashboard` | Dashboard | Нийт статистик, chart, сүүлийн бараанууд |
| `/inventory` | Inventory | Бараа хайх, шүүх, засах, устгах |
| `/add-product` | Add Product | Шинэ бараа нэмэх форм |
| `/dispatch` | Dispatch | Бараа гаргах (quantity бууруулах) |
| `/alerts` | Alerts | Low stock, anomaly мэдэгдлүүд |
| `/leaderboard` | Leaderboard | Ажилтнуудын оноо, badge жагсаалт |
| `/settings` | Settings | Хэрэглэгчийн тохиргоо (Stack Auth) |
| `/reorder` | Reorder | AI-ийн reorder зөвлөмж |
| `/ai` | AI Assistant | AI chat assistant |
| `/agent` | AI Agent | Автомат AI agent |
| `/workflows` | Workflows | Автомат workflow дүрмүүд |
| `/org/members` | Members | Байгууллагын гишүүд |
| `/org/settings` | Org Settings | Байгууллагын тохиргоо |
| `/org/audit` | Audit Log | Үйлдлийн бүртгэл |
| `/org/approvals` | Approvals | Гишүүнчлэлийн хүсэлтүүд |
| `/pricing` | Pricing | Subscription төлөвлөгөө |
| `/onboarding` | Onboarding | Байгууллага үүсгэх |
| `/admin/monitoring` | Monitoring | Grafana embed (SUPER_ADMIN) |
| `/docs` | Docs | API documentation |

---

## Функциональ боломжууд

### 1. Inventory Management
- Бараа нэмэх, засах, устгах (CRUD)
- SKU, үнэ, тоо хэмжээ, категори, зураг
- Low stock threshold тохируулах
- Хайлт, pagination, gallery/table view
- CSV export
- Бодит цагийн шинэчлэл (SSE)

### 2. AI Features
- **AI Chat** — inventory талаар асуулт хариулт
- **AI Agent** — автоматаар inventory шалгаж alert үүсгэнэ
- **Reorder Suggestions** — AI-ийн тооцоолсон reorder зөвлөмж
- **Workflows** — trigger-д суурилсан автомат үйлдлүүд (email, alert, reorder)
- **Daily Digest** — өдөр бүрийн тайлан

### 3. Alerts & Monitoring
- Low stock alert (тоо хэмжээ threshold-аас доош)
- Anomaly detection (50%+ огцом бууралт)
- Unread count badge (5 минут тутамд шинэчлэгдэнэ)
- Alert dismiss, dismiss all

### 4. Multi-tenant & RBAC
- Байгууллага бүр тусдаа өгөгдөлтэй
- 3 үүрэг: `STAFF`, `MANAGER`, `SUPER_ADMIN`
- Гишүүн урих, хасах, үүрэг өөрчлөх
- Membership request + approval workflow
- Audit log (бүх үйлдлийг бүртгэнэ)

### 5. Gamification
- Үйлдэл бүрт оноо олгоно (бараа нэмэх: 10, засах: 5, шалгах: 1)
- Badge систем (first product, streak, top performer гэх мэт)
- Leaderboard (top 10 + өөрийн байр)

### 6. Billing (Stripe)
- Free / Pro / Enterprise төлөвлөгөө
- Stripe Checkout + Customer Portal
- Webhook-оор subscription шинэчлэлт
- Plan limit шалгалт (бараа тоо, гишүүн тоо)

### 7. Internationalization
- Монгол (MN) болон Англи (EN) хэл
- Currency format (MNT, USD гэх мэт)
- Хэрэглэгч тус бүр хэлний тохиргоотой

### 8. Security
- CSP (Content Security Policy) header
- Rate limiting (Redis sliding window)
- Honeypot (bot detection)
- Auth middleware (бүх хамгаалагдсан route)
- Input validation (Zod)
- RBAC шалгалт бүх action-д

---

## Технологийн стек

### Frontend
| Технологи | Хувилбар | Зориулалт |
|-----------|---------|-----------|
| Next.js | 15.5.9 | App Router, SSR, Server Components |
| React | 19.1.2 | UI framework |
| Tailwind CSS | 4.x | Styling |
| SWR | 2.x | Client-side data fetching + caching |
| Recharts | 3.x | Chart (dashboard) |
| Three.js + R3F | 0.184 / 9.x | 3D tilt card effect |
| Lucide React | 0.544 | Icon library |

### Backend
| Технологи | Хувилбар | Зориулалт |
|-----------|---------|-----------|
| Next.js API Routes | 15.5.9 | REST API endpoints |
| Next.js Server Actions | 15.5.9 | Form actions, mutations |
| Prisma ORM | 6.x | Database access layer |
| Zod | 4.x | Input validation |

### Database & Storage
| Технологи | Зориулалт |
|-----------|-----------|
| Supabase PostgreSQL | Primary database (Prisma-аар холбоно) |
| Upstash Redis | Cache, rate limiting, SSE pub/sub |
| Supabase Storage | Бараа зургийн хадгалалт |

### Authentication
| Технологи | Зориулалт |
|-----------|-----------|
| Stack Auth | JWT, session, OAuth (Google, GitHub) |

### AI
| Технологи | Зориулалт |
|-----------|-----------|
| Vercel AI SDK | AI streaming, tool calling |
| Groq (llama-3) | Default AI provider |
| OpenAI / Anthropic | Нэмэлт provider (тохируулж болно) |

### Infrastructure
| Технологи | Зориулалт |
|-----------|-----------|
| Vercel | Hosting, serverless functions, cron jobs |
| Prometheus + prom-client | Metrics collection |
| Grafana | Monitoring dashboard |
| Stripe | Payment processing |

---

## Системийн архитектур

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                        │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Next.js     │  │  SWR Cache   │  │  SSE EventSource     │  │
│  │  App Router  │  │  (client)    │  │  (real-time updates) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼───────────────────────┼────────────┘
          │                 │                       │
          ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER (Vercel)                      │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │  Middleware │  │  API Routes  │  │  Server Components   │    │
│  │  (Auth+RBAC)│  │  /api/*      │  │  (SSR pages)         │    │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘    │
│         │                │                      │               │
│         ▼                ▼                      ▼               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   lib/ (Business Logic)                 │    │
│  │                                                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │    │
│  │  │  org.ts  │  │ actions/ │  │gamifica- │  │ ai/    │   │    │
│  │  │ (context)│  │(CRUD)    │  │tion/     │  │(tools) │   │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│  Stack Auth  │  │  Supabase    │  │      Upstash Redis       │
│  (Identity)  │  │  PostgreSQL  │  │  Cache / Rate limit /    │
│  JWT/OAuth   │  │  (Prisma)    │  │  SSE pub/sub             │
└──────────────┘  └──────────────┘  └──────────────────────────┘
          │                 │
          ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  Groq AI     │  │   Stripe     │
│  (LLM)       │  │  (Billing)   │
└──────────────┘  └──────────────┘
```

## Өгөгдлийн урсгал

```
Хэрэглэгчийн үйлдэл
    │
    ▼
Next.js Middleware (Stack Auth шалгалт)
    │
    ├─── Нэвтрээгүй → /sign-in
    ├─── Байгууллагагүй → /onboarding
    │
    ▼
Server Component / API Route
    │
    ├─── Redis Cache HIT → cached өгөгдөл (~10-50ms)
    │
    └─── Redis Cache MISS
              │
              ▼
         Prisma ORM → Supabase PostgreSQL
              │
              ▼
         Redis-д cache хийнэ
              │
              ▼
         Client-д буцаана
```

## Multi-tenant архитектур

```
Байгууллага А          Байгууллага Б
┌─────────────┐         ┌─────────────┐
│ Manager     │         │ Manager     │
│ Staff 1     │         │ Staff 1     │
│ Staff 2     │         │ Staff 2     │
│             │         │             │
│ Products    │         │ Products    │
│ Alerts      │         │ Alerts      │
│ Leaderboard │         │ Leaderboard │
└─────────────┘         └─────────────┘
      │                       │
      └───────────┬───────────┘
                  │
         Нийтлэг дэд бүтэц
         (PostgreSQL, Redis, Stack Auth)
         Бүх query organizationId-аар хязгаарлагдана
```

## Database Schema

```
Organization ──┬── Member ──── StaffAction
               │         └─── Badge
               ├── Product ─── ConsumptionRecord
               ├── Alert
               ├── Invitation
               ├── MembershipRequest
               ├── WorkflowRule ─── WorkflowRun
               └── AuditLog
```

## Cron Jobs (Vercel)

| Endpoint | Цаг | Зориулалт |
|----------|-----|-----------|
| `/api/digest/run` | 01:00 өдөр бүр | Daily digest тооцоолол |
| `/api/agent/run` | 03:00 өдөр бүр | AI agent автомат шалгалт |
| `/api/reorder/refresh` | 02:00 өдөр бүр | Reorder cache шинэчлэлт |

## Cache Strategy

| Өгөгдөл | TTL | Cache key |
|---------|-----|-----------|
| Org context | 30 мин | `user:{id}:orgContext` |
| Dashboard | 10 мин | `org:{id}:dashboard` |
| Inventory | 2 мин | `org:{id}:inventory:{q}:{page}` |
| Alerts | 30 сек | `org:{id}:alerts:page:{n}` |
| Leaderboard | 10 мин | `org:{id}:leaderboard` |
| Reorder | 1 цаг | `org:{id}:reorder:page` |
| Digest | 48 цаг | `org:{id}:digest:latest` |

## RBAC (Role-Based Access Control)

| Үүрэг | Dashboard | Inventory | Workflows | Reorder | Org Settings | Monitoring |
|-------|-----------|-----------|-----------|---------|--------------|------------|
| STAFF | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| MANAGER | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Environment Variables

| Нэр | Зориулалт |
|-----|-----------|
| `DATABASE_URL` | Supabase PostgreSQL (PgBouncer) |
| `DIRECT_URL` | Supabase PostgreSQL (шууд) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | Stack Auth project ID |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | Stack Auth client key |
| `STACK_SECRET_SERVER_KEY` | Stack Auth server key |
| `GROQ_API_KEY` | Groq AI API key |
| `AI_PROVIDER` | AI provider (`groq`/`openai`/`anthropic`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key |
| `CRON_SECRET` | Vercel cron authentication |
| `METRICS_SECRET` | Prometheus scrape authentication |
| `NEXT_PUBLIC_GRAFANA_EMBED_URL` | Grafana dashboard URL |
| `NEXT_PUBLIC_APP_URL` | Production URL |
