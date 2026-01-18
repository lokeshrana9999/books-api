# Book Publishing API

A minimal Book Publishing API in Node.js + TypeScript with a **config-driven audit trail**, role-based access control, and comprehensive observability. Built to demonstrate excellent engineering practice around auxiliary systems: audit trail, access control, logging/observability, and error handling.

## 🌐 Live API

**Deployed API**: [https://books-api-omega.vercel.app/api/](https://books-api-omega.vercel.app/api/)

Try it out:
- Health check: [https://books-api-omega.vercel.app/api/health](https://books-api-omega.vercel.app/api/health)
- Use the Postman collection with `base_url` set to `https://books-api-omega.vercel.app/api`

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp env.example .env
# Edit .env with your Supabase DATABASE_URL (see docs/SUPABASE_SETUP.md)

# 3. Setup database
npm run db:generate
npm run db:migrate
npm run seed  # Creates admin & reviewer users + 3 sample books

# 4. Run the server
npm run dev
```

Server runs on `http://localhost:3000`

## Proof of Completion: Postman Collection

### How to import and test the postman collection.

[![How to Import and Test the Postman Collection](https://img.youtube.com/vi/ndw1AoXfBsM/maxresdefault.jpg)](https://youtu.be/ndw1AoXfBsM)

The **Postman collection** (`docs/Book-Publishing-API.postman_collection.json`) demonstrates all requirements:

### 1. Audit Quality ✅
- **Config-driven tracking**: Tests create/update/delete operations showing automatic audit capture
- **Correct, redacted diffs**: Update requests show before/after diffs respecting config exclusions
- **Powerful filters & pagination**: Audit list endpoint tests all filters (entity, entityId, actorId, action, from/to, fieldsChanged, requestId) with cursor-based pagination

### 2. Logging & Observability ✅
- **Pino with requestId/userId**: All requests include `X-Request-ID` header; logs show structured JSON with `requestId`, `userId`, `route`, `method`, `status`, `durationMs`
- **File transport**: Default logs to `logs/app.log` (configurable via `LOG_SINK` env var)
- **Configurable sinks**: Environment supports `file`, `elastic`, `logtail` (see `env.example`)

### 3. Access Control & Security ✅
- **Sound auth**: API key authentication via `X-API-Key` header (admin and reviewer keys seeded)
- **Admin-only audit access**: Reviewer role cannot access `/api/audits` endpoints (403 Forbidden)
- **Input validation**: All endpoints validate input using Zod schemas

### 4. Code Quality & Architecture ✅
- **Clear layering**: Routes → Services → Repositories pattern
- **TypeScript strictness**: Full type safety throughout
- **Small focused modules**: Clean separation of concerns

### 5. Error Handling & DX ✅
- **Centralized handler**: All errors return `{ error: { code, message, requestId } }`
- **RequestId correlation**: Every error includes `requestId` for tracing
- **No stack traces in production**: Security-focused error responses

## Using the Postman Collection

1. **Import collection and environment**:
   - Import `docs/Book-Publishing-API.postman_collection.json`
   - Import `docs/Book-Publishing-API.postman_environment.json`
   - Set `base_url` to `https://books-api-omega.vercel.app/api` (production) or `http://localhost:3000` (local)

2. **Run the collection**:
   - The collection is organized by feature area
   - Each request demonstrates specific functionality
   - All requests use pre-configured API keys (admin and reviewer)

3. **Verify completion**:
   - ✅ All CRUD operations on books
   - ✅ Audit trail captures all changes
   - ✅ Rich filtering on audit logs
   - ✅ Role-based access control (reviewer blocked from audits)
   - ✅ Structured logging with requestId/userId
   - ✅ Error handling with requestId correlation

## Database Choice

**PostgreSQL + Prisma + Supabase**

- **Production-ready**: Industry standard for production applications
- **Type safety**: Prisma provides excellent TypeScript support
- **Easy migration**: Simple schema management and migrations
- **Scalable**: Supabase provides managed PostgreSQL with connection pooling
- **Serverless-friendly**: Connection pooler works perfectly with Vercel serverless functions

## Configuration

### Audit Trail (Config-Driven)

Edit `src/config/audit.config.ts` to add new entities—no code changes needed:

```typescript
export const auditConfig = {
  Book: { track: true, exclude: ['updatedAt'], redact: [] },
  User: { track: true, exclude: ['credentials'], redact: ['credentials'] },
  // Add new entities here - automatically tracked!
} as const;
```

### Logging Sinks

Switch log destinations via `LOG_SINK` environment variable:

- `file` (default): Logs to `logs/app.log`
- `elastic`: Send to Elasticsearch (requires `pino-elasticsearch`)
- `logtail`: Send to Logtail (requires `@logtail/pino` and `LOGTAIL_TOKEN`)

## Example cURL Commands

These commands demonstrate typical API flows. The seed script creates:
- **Admin user**: API key `admin-api-key-12345`
- **Reviewer user**: API key `reviewer-api-key-67890`
- **3 sample books**: Pre-populated for testing

**Local development** (replace with `https://books-api-omega.vercel.app/api` for production):

```bash
# Health check (no auth required)
curl http://localhost:3000/health

# List books (paginated) - demonstrates cursor-based pagination
curl -H "X-API-Key: admin-api-key-12345" \
  "http://localhost:3000/api/books?limit=10"

# Create a book - demonstrates audit trail capture
curl -X POST http://localhost:3000/api/books \
  -H "X-API-Key: admin-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Book", "authors": "Test Author", "publishedBy": "Test Publisher"}'

# Update a book - demonstrates diff calculation in audit logs
curl -X PATCH http://localhost:3000/api/books/book-1 \
  -H "X-API-Key: admin-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'

# Get audit logs with filters (admin only) - demonstrates rich filtering
curl -H "X-API-Key: admin-api-key-12345" \
  "http://localhost:3000/api/audits?entity=Book&limit=10"
```

## Documentation

- **[Project Requirements](./project-req.md)** - Complete specification
- **[Project Structure](./docs/PROJECT_STRUCTURE.md)** - Architecture and code organization
- **[Supabase Setup](./docs/SUPABASE_SETUP.md)** - Database setup guide
- **[Vercel Deployment](./docs/VERCEL_DEPLOYMENT.md)** - Production deployment
- **[Postman Collection](./docs/Book-Publishing-API.postman_collection.json)** - Complete API tests

## Tech Stack

- **Runtime**: Node.js ≥ 20, TypeScript (strict mode)
- **Framework**: Fastify
- **Database**: PostgreSQL with Prisma ORM (Supabase)
- **Logging**: Pino with configurable transports
- **Validation**: Zod
- **Authentication**: API Key-based
