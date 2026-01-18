# Book Publishing API

A minimal Book Publishing API built with Node.js and TypeScript, featuring a config-driven audit trail system, role-based access control, and comprehensive observability.

## Overview

This API provides CRUD operations for books with a focus on:
- **Config-driven audit trail** - Easily extendable to new entities via configuration
- **Role-based access control** - Admin and Reviewer roles with appropriate permissions
- **Observability** - Structured logging with Pino, request tracing, and audit logging
- **Clean architecture** - Well-structured codebase with clear separation of concerns

## Tech Stack

- **Runtime**: Node.js ≥ 20, TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL with Prisma ORM (hosted on Supabase)
- **Logging**: Pino with configurable transports (file/Elastic/Logtail)
- **Validation**: Zod
- **Authentication**: API Key-based

### Database Choice Rationale

PostgreSQL with Prisma and Supabase was chosen for:
- **Production-ready** - PostgreSQL is the industry standard for production applications
- **Type safety** - Prisma provides excellent TypeScript support
- **Easy migration** - Simple schema management and migrations
- **Scalable** - Supabase provides managed PostgreSQL with connection pooling
- **Serverless-friendly** - Connection pooler works perfectly with Vercel serverless functions

## Quick Start

### Prerequisites

- Node.js ≥ 20
- npm or yarn
- Supabase account (free tier available at [supabase.com](https://supabase.com))

### Installation

1. **Set up Supabase:**
   - Create a project at [supabase.com](https://supabase.com)
   - Go to **Settings** → **Database** → **Connection string** → **URI**
   - Copy the connection string

2. **Configure environment:**
   ```bash
   # Copy example env file
   cp env.example .env
   
   # Edit .env and add your Supabase DATABASE_URL
   # Replace [YOUR-PASSWORD] and [project-ref] with your actual values
   ```

3. **Install and setup:**
   ```bash
   # Install dependencies
   npm install

   # Generate Prisma client for PostgreSQL
   npm run db:generate

   # Run database migrations (creates tables in Supabase)
   npm run db:migrate

   # Seed the database with initial data (admin, reviewer, sample books)
   npm run seed
   ```

### Running the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3000` by default.

### Environment Variables

Create a `.env` file (copy from `env.example`):

```env
# Supabase Database Connection
# Get from: Supabase Dashboard → Settings → Database → Connection string → URI
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres?schema=public"

PORT=3000
LOG_LEVEL=info
LOG_SINK=file
NODE_ENV=development
```

**Getting your Supabase connection string:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Select **URI** tab
6. Copy the connection string and replace `[YOUR-PASSWORD]` with your database password

**For Vercel deployment**, use the connection pooler:
- In Supabase Dashboard → Settings → Database → Connection Pooling
- Use the "Session" mode connection string
- Add `&connection_limit=1` for serverless functions

**Log Sink Options:**
- `file` - Logs to `./logs/app.log` (default)
- `elastic` - Send logs to Elasticsearch (requires `pino-elasticsearch`)
- `logtail` - Send logs to Logtail (requires `@logtail/pino` and `LOGTAIL_TOKEN`)

## API Documentation

### Authentication

All endpoints (except `/health`) require authentication via API Key:

```
X-API-Key: <your-api-key>
```

**Default API Keys** (created by seed script):
- Admin: `admin-api-key-12345`
- Reviewer: `reviewer-api-key-67890`

### Endpoints

#### Health Check
- `GET /health` - Health check endpoint (no auth required)

#### Books API
- `GET /api/books?limit=20&cursor=<cursor>` - List books (paginated)
- `POST /api/books` - Create a book
- `GET /api/books/:id` - Get a book by ID
- `PATCH /api/books/:id` - Update a book
- `DELETE /api/books/:id` - Delete a book

#### Audit Trail API (Admin Only)
- `GET /api/audits?entity=Book&actorId=...&from=...&to=...&fieldsChanged=title,authors&limit=20&cursor=...` - List audit logs with filters
- `GET /api/audits/:id` - Get a specific audit log

### Testing the API

For comprehensive API testing, see the Postman collection:
- **Collection**: [docs/Book-Publishing-API.postman_collection.json](./docs/Book-Publishing-API.postman_collection.json)
- **Environment**: [docs/Book-Publishing-API.postman_environment.json](./docs/Book-Publishing-API.postman_environment.json)

Import both files into Postman to get started with pre-configured requests.

### Example cURL Commands

```bash
# Health check
curl http://localhost:3000/health

# List books (requires API key)
curl -H "X-API-Key: admin-api-key-12345" http://localhost:3000/api/books

# Create a book
curl -X POST http://localhost:3000/api/books \
  -H "X-API-Key: admin-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Book", "authors": "Test Author", "publishedBy": "Test Publisher"}'

# Get audit logs (admin only)
curl -H "X-API-Key: admin-api-key-12345" \
  "http://localhost:3000/api/audits?entity=Book&limit=10"
```

## Configuration

### Audit Trail Configuration

The audit trail is config-driven. Edit `src/config/audit.config.ts` to add new entities:

```typescript
export const auditConfig = {
  Book: {
    track: true,
    exclude: ['updatedAt'],  // Fields to exclude from diffs
    redact: [],              // Fields to redact (sensitive data)
  },
  User: {
    track: true,
    exclude: [],
    redact: ['credentials'], // Redact sensitive fields
  },
  // Add new entities here - no code changes needed!
} as const;
```

To add a new entity to audit tracking:
1. Add the entity configuration to `audit.config.ts`
2. The audit plugin will automatically track create/update/delete operations

### Logging Configuration

Logging is configured via environment variables:
- `LOG_LEVEL`: `trace`, `debug`, `info`, `warn`, `error`, `fatal` (default: `info`)
- `LOG_SINK`: `file`, `elastic`, `logtail` (default: `file`)

All logs include:
- `requestId` - Unique identifier for request tracing
- `userId` - Authenticated user ID
- `level`, `time`, `msg`, `route`, `method`, `status`, `durationMs`

## Project Structure

```
src/
├── api/              # Fastify app setup
├── config/           # Configuration files (app, audit)
├── infra/            # Infrastructure (logger, prisma, async context)
├── modules/
│   ├── audit/        # Audit trail routes and service
│   ├── auth/         # Authentication middleware and service
│   └── book/         # Book routes, service, repository, schema
├── plugins/          # Fastify plugins (audit plugin)
└── utils/            # Utilities (error handler, diff, cursor, repository)
```

## Error Handling

The API uses centralized error handling with structured error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required",
    "requestId": "req_1234567890_abc123"
  }
}
```

All errors include a `requestId` for correlation. Stack traces are not exposed in production.

## Observability

- **Request Tracing**: Every request gets a unique `requestId` via `X-Request-ID` header
- **Structured Logging**: All logs are JSON-structured with context
- **Audit Trail**: All create/update/delete operations are automatically logged
- **Async Context**: Request context (requestId, userId) propagates across async operations

## Database Management

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Push schema changes (dev only)
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio
```

## Additional Documentation

- [Project Requirements](./project-req.md) - Detailed project requirements and specifications
- [Supabase Setup Guide](./docs/SUPABASE_SETUP.md) - Step-by-step Supabase integration guide
- [Vercel Deployment Guide](./docs/VERCEL_DEPLOYMENT.md) - Complete Vercel deployment instructions
- [Postman Collection](./docs/Book-Publishing-API.postman_collection.json) - Complete API testing collection
- [Postman Environment](./docs/Book-Publishing-API.postman_environment.json) - Environment variables for Postman

## License

ISC
