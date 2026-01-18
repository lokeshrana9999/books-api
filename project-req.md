Overview : Config driven audit trail:
Build a minimal Book Publishing API in Node.js + TypeScript with CRUD for
books, auth (admin/reviewer), and an audit trail that is config-driven and easily
extendable to new entities. - Audit logs must include the affected record/entity
ID alongside action, actor, timestamp, and what changed. - Use Pino logging
with userId and requestId; store logs locally to file, but keep it configurable for
Elastic/Logtail. - Submit code + a short README to run locally and a small list
of cURL commands that demonstrate typical flows (not every endpoint
needed).

Design and implement a minimal Book Publishing System with a strong focus
on the auxiliary systems around the core CRUD: audit trail, access control,
logging/observability, and error handling. Keep the core domain intentionally
simple so you can demonstrate excellent engineering practice.

Primary goal: Build an auditable app where new entities can be added to audit
tracking via configuration (no invasive code changes). Admins can query the
audit trail with rich filters.

Functional Requirements
Entities
● Book
o id: string (or number/UUID)
o title: string
o authors: string
o createdBy: string (userId)
o publishedBy: string (name)
o updatedBy?: string (userId or name)
o createdAt: Date
o updatedAt: Date
● User
o id: string
o name: string
o role: 'admin' | 'reviewer'
o credentials: string (keep it simple: API key or password hash)
o createdAt: Date
● AuditLog (your design, must support config-driven tracking)

Book APIs
● List (paginated): /api/books?limit=&cursor= (cursor or page/size—your choice,
but justify it)
● Create: /api/books (sets createdBy from authenticated user)
● Read one: /api/books/:id
● Update: /api/books/:id
● Delete: /api/books/:id (hard delete or soft delete—justify; must be auditable)
Audit Trail APIs (admin-only)
● List audits: /api/audits
o Filters (all optional, combinable)
▪ from, to (ISO datetime range)
▪ entity (e.g., Book, User, or any future entity)
▪ entityId
▪ actorId (who made the change)
▪ action (create|update|delete|restore|login|...)
▪ fieldsChanged (comma-separated field names)
▪ requestId (trace)
o Pagination: same strategy as books; include nextCursor/prevCursor or
page/size.
o Sort: default timestamp desc.
● Get one: /api/audits/:id
Auth & Access Control
● Keep it simple but real:
o Use API key or JWT auth. Include a User seed with at least one admin,
one reviewer.
o Middleware must attach user to request context.
o RBAC: admin can access all Audit endpoints; reviewer cannot.

Logging (Pino)
● Centralized app logger with user identifier and requestId/traceId on every log line.
● Default file transport (local log file). Make it configurable to send to Elastic/Logtail
(don’t need to actually provision; just show code path/env flags to enable).
● Log structured JSON with keys: level, time, msg, userId, requestId, route,
method, status, durationMs.

Error Handling
● Central error middleware that returns: { error: { code, message, details?,
requestId } }.
● Do not leak stack traces in production; include requestId for correlation.
Audit Trail Design (Required)
● Config-driven tracking: A single configuration object controls which
collections/entities are auditable and which fields to include/exclude from diffs.
o Example:
export const auditConfig = {
Book: { track: true, exclude: ['updatedAt'], redact: [] },
User: { track: true, exclude: ['credentials'], redact:
['credentials'] },
} as const;

● What to store per audit record (minimum):
o id
o timestamp
o entity (e.g., Book)
o entityId
o action (create|update|delete|restore)
o actorId (from auth)
o diff (before/after or JSON Patch ops); must respect exclude/redact from
config

● Capture points: Create/Update/Delete of auditable entities.
● Extensibility: Adding a new entity to tracking should require only updating config
+ (optionally) registering a generic repository hook.
Observability & Tracing
● Use AsyncLocalStorage to propagate requestId + userId across the request.
Attach to logs and audits.
● Include simple timing metrics per request (you can log duration).

Non-Functional Requirements
● TypeScript-first codebase (strict mode recommended).
● Clean architecture boundaries are a plus: routes → controllers → services
→ repositories.
● Security basics: input validation (e.g., zod/yup/class-validator), avoid logging
secrets, redact PII as configured.
● Database choice is yours; pick something easy to run locally. Examples:
o SQLite + Prisma (fastest to start, single-file DB) recommended

o PostgreSQL (Docker) + Prisma/Knex
o MongoDB (Docker) + Mongoose
o Justify your choice in README.

Suggested Tech Stack (optional but encouraged)
● Runtime: Node.js ≥ 20, TypeScript
● HTTP: Fastify or Express (Fastify preferred for built-in logging hooks)
● ORM: Prisma (works great with SQLite/Postgres); or Mongoose for MongoDB
● Auth: Simple API key or JWT (fastify-jwt or custom middleware)
● Validation: zod/class-validator
● Logging: Pino + pino-transport for file/Elastic/Logtail

API Contract (Sketch)
Books
● GET /api/books?limit=10&cursor=eyJpZCI6... → { items: Book[],
nextCursor? }
● POST /api/books → { id } (201)
● GET /api/books/:id → Book
● PATCH /api/books/:id → Book
● DELETE /api/books/:id → { ok: true }
Audits (admin-only)
● GET
/api/audits?entity=Book&actorId=...&from=...&to=...&fieldsChanged=title
,authors&limit=20&cursor=... → { items: AuditLog[], nextCursor? }
● GET /api/audits/:id → AuditLog
Error Response
{
"error": {
"code": "VALIDATION_ERROR",
"message": "title is required",
"requestId": "7b6d..."
}
}

What We’ll Evaluate
1. Audit Quality
o Config-driven, minimal code changes to add new entity
o Correct, redacted diffs; complete coverage of create/update/delete
o Powerful filters & pagination
2. Logging & Observability
o Pino setup with requestId/userId on each line; file transport; configurable
sinks

3. Access Control & Security
o Sound auth, tight admin-only audit access, input validation
4. Code Quality & Architecture
o Clear layering, TypeScript strictness, small focused modules
5. Error Handling & DX
o Centralized handler, helpful messages, requestId correlation, great
README

Submission Checklist
● ✅ To be submitted within 4 days
● ✅ Public Git repo link
● ✅ README.md with: rationale for DB choice, setup steps, how to switch log sinks,
audit config, curl/Postman examples
● ✅ Seed script for users (admin & reviewer)
● ✅ Small dataset seeding for demo (2–3 books)