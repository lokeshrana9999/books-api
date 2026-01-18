# Project Structure

This document outlines the architecture and organization of the Book Publishing API, demonstrating clean architecture boundaries and separation of concerns.

## Directory Structure

```
src/
├── api/                    # Application entry point & Fastify setup
│   └── index.ts           # Fastify app initialization, middleware, route registration
│
├── config/                # Configuration files
│   ├── app.config.ts      # Application configuration (ports, env vars)
│   └── audit.config.ts    # Config-driven audit trail settings
│
├── infra/                 # Infrastructure layer (cross-cutting concerns)
│   ├── asyncContext.ts    # AsyncLocalStorage for request context propagation
│   ├── logger.ts          # Pino logger setup with configurable transports
│   └── prisma.ts          # Prisma client singleton
│
├── modules/               # Feature modules (domain logic)
│   ├── audit/             # Audit trail feature
│   │   ├── audit.routes.ts    # Fastify routes for audit endpoints
│   │   └── audit.service.ts   # Business logic for audit queries
│   │
│   ├── auth/              # Authentication & authorization
│   │   ├── auth.middleware.ts # API key authentication middleware
│   │   └── auth.service.ts   # User authentication logic
│   │
│   └── book/              # Book CRUD feature
│       ├── book.routes.ts     # Fastify routes for book endpoints
│       ├── book.service.ts    # Business logic for book operations
│       ├── book.repository.ts # Data access layer for books
│       └── book.schema.ts      # Zod validation schemas
│
├── plugins/               # Fastify plugins
│   └── audit.plugin.ts     # Audit trail plugin (hooks into create/update/delete)
│
├── utils/                 # Shared utilities
│   ├── cursor.ts          # Cursor-based pagination utilities
│   ├── diff.ts            # Object diffing for audit logs
│   ├── errorHandler.ts    # Centralized error handling middleware
│   └── repository.ts      # Base repository pattern utilities
│
├── seed.ts                # Database seeding script
│
└── __tests__/             # Test files
    ├── e2e/               # End-to-end tests
    ├── integration/       # Integration tests
    └── unit/              # Unit tests
```

## Architecture Layers

The project follows a **clean architecture** pattern with clear separation of concerns:

### 1. API Layer (`api/`)
- **Responsibility**: HTTP server setup, middleware registration, route mounting
- **Key Files**:
  - `index.ts`: Fastify app initialization, request context setup, error handling, route registration
- **Dependencies**: Fastify, middleware, routes

### 2. Configuration Layer (`config/`)
- **Responsibility**: Centralized configuration management
- **Key Files**:
  - `app.config.ts`: Application settings (ports, database URLs, logging)
  - `audit.config.ts`: **Config-driven audit trail** - defines which entities are tracked and field exclusions/redactions
- **Pattern**: Single source of truth for all configuration

### 3. Infrastructure Layer (`infra/`)
- **Responsibility**: Cross-cutting concerns, shared infrastructure
- **Key Files**:
  - `asyncContext.ts`: AsyncLocalStorage wrapper for propagating `requestId` and `userId` across async operations
  - `logger.ts`: Pino logger with configurable transports (file/Elastic/Logtail)
  - `prisma.ts`: Prisma client singleton (prevents multiple instances)
- **Pattern**: Singleton pattern for shared resources

### 4. Feature Modules (`modules/`)
- **Responsibility**: Domain-specific business logic organized by feature
- **Architecture**: Each module follows **Routes → Services → Repositories** pattern

#### Module Structure Pattern:
```
modules/
└── [feature]/
    ├── [feature].routes.ts    # HTTP route definitions (Fastify)
    ├── [feature].service.ts   # Business logic layer
    ├── [feature].repository.ts # Data access layer (Prisma queries)
    └── [feature].schema.ts    # Validation schemas (Zod)
```

#### Book Module Example:
- **`book.routes.ts`**: Defines HTTP endpoints (`GET /api/books`, `POST /api/books`, etc.)
- **`book.service.ts`**: Business logic (validation, orchestration, audit triggering)
- **`book.repository.ts`**: Database operations (Prisma queries, cursor pagination)
- **`book.schema.ts`**: Input validation schemas (Zod)

#### Audit Module:
- **`audit.routes.ts`**: Admin-only audit query endpoints
- **`audit.service.ts`**: Complex filtering logic (entity, actorId, date ranges, field changes)

#### Auth Module:
- **`auth.middleware.ts`**: Fastify preHandler hook for API key authentication
- **`auth.service.ts`**: User lookup and role validation

### 5. Plugins Layer (`plugins/`)
- **Responsibility**: Fastify plugins that extend application functionality
- **Key Files**:
  - `audit.plugin.ts`: Automatically captures create/update/delete operations for configured entities
- **Pattern**: Plugin architecture for cross-cutting features

### 6. Utilities Layer (`utils/`)
- **Responsibility**: Reusable helper functions
- **Key Files**:
  - `cursor.ts`: Cursor-based pagination encoding/decoding
  - `diff.ts`: Object diffing algorithm for audit logs (respects config exclusions/redactions)
  - `errorHandler.ts`: Centralized error handling with structured error responses
  - `repository.ts`: Base repository utilities for common patterns

## Data Flow

### Request Flow:
```
HTTP Request
  ↓
api/index.ts (Fastify app)
  ↓
Request Context Hook (sets requestId, userId)
  ↓
Auth Middleware (validates API key, sets userId)
  ↓
Route Handler (book.routes.ts / audit.routes.ts)
  ↓
Service Layer (book.service.ts / audit.service.ts)
  ↓
Repository Layer (book.repository.ts)
  ↓
Prisma Client (database)
```

### Audit Flow:
```
Service Layer (create/update/delete)
  ↓
Audit Plugin (audit.plugin.ts) - hooks into Prisma operations
  ↓
Checks audit.config.ts (is entity tracked?)
  ↓
Calculates diff (utils/diff.ts) - respects exclude/redact config
  ↓
Stores AuditLog (via Prisma)
```

## Key Design Patterns

### 1. Config-Driven Audit Trail
- **Location**: `config/audit.config.ts`
- **Pattern**: Single configuration object controls audit behavior
- **Extensibility**: Adding new entities requires only config changes, no code modifications
- **Example**:
  ```typescript
  export const auditConfig = {
    Book: { track: true, exclude: ['updatedAt'], redact: [] },
    User: { track: true, exclude: ['credentials'], redact: ['credentials'] },
  } as const;
  ```

### 2. Repository Pattern
- **Location**: `modules/*/repository.ts`
- **Pattern**: Encapsulates data access logic, separates business logic from database queries
- **Benefits**: Easy to test, swap implementations, add caching

### 3. Service Layer Pattern
- **Location**: `modules/*/service.ts`
- **Pattern**: Business logic orchestration, validation, audit triggering
- **Benefits**: Reusable business logic, testable without HTTP layer

### 4. Middleware Pattern
- **Location**: `modules/auth/auth.middleware.ts`
- **Pattern**: Fastify hooks for cross-cutting concerns (auth, logging)
- **Benefits**: Centralized authentication, request context propagation

### 5. Plugin Pattern
- **Location**: `plugins/audit.plugin.ts`
- **Pattern**: Fastify plugins for extensibility
- **Benefits**: Modular, reusable functionality

### 6. Singleton Pattern
- **Location**: `infra/prisma.ts`, `infra/logger.ts`
- **Pattern**: Single instance of shared resources
- **Benefits**: Prevents connection leaks, consistent logging

## Observability & Tracing

### Request Context Propagation
- **Technology**: AsyncLocalStorage (`infra/asyncContext.ts`)
- **Purpose**: Propagate `requestId` and `userId` across async operations
- **Usage**: Automatically attached to all logs and audit records

### Structured Logging
- **Technology**: Pino (`infra/logger.ts`)
- **Format**: JSON with keys: `level`, `time`, `msg`, `userId`, `requestId`, `route`, `method`, `status`, `durationMs`
- **Transports**: Configurable (file/Elastic/Logtail)

## Security & Validation

### Input Validation
- **Technology**: Zod (`modules/*/schema.ts`)
- **Location**: Route level validation before service layer
- **Pattern**: Schema-first validation with type inference

### Error Handling
- **Location**: `utils/errorHandler.ts`
- **Pattern**: Centralized error handler
- **Response Format**: `{ error: { code, message, requestId } }`
- **Security**: No stack traces in production

## Database Access

### Prisma ORM
- **Location**: `infra/prisma.ts`
- **Pattern**: Singleton Prisma client
- **Usage**: All database operations go through Prisma
- **Migrations**: Managed via `prisma/migrations/`

### Repository Abstraction
- **Location**: `modules/*/repository.ts`
- **Pattern**: Encapsulates Prisma queries
- **Benefits**: Testable, swappable data access layer

## Testing Structure

```
__tests__/
├── e2e/                   # End-to-end tests (full request/response cycle)
├── integration/          # Integration tests (database interactions)
└── unit/                 # Unit tests (isolated function testing)
```

## Entry Points

### Development
- **File**: `src/api/index.ts`
- **Command**: `npm run dev`
- **Purpose**: Local development server

### Production (Vercel)
- **File**: `api/index.ts` (root level)
- **Purpose**: Vercel serverless function entry point
- **Note**: Imports compiled code from `dist/api/index.js`

### Database Seeding
- **File**: `src/seed.ts`
- **Command**: `npm run seed`
- **Purpose**: Populate database with initial data (users, sample books)

## Extension Points

### Adding a New Entity to Audit Trail
1. Add entity config to `config/audit.config.ts`
2. No code changes needed - audit plugin automatically tracks it

### Adding a New Feature Module
1. Create `modules/[feature]/` directory
2. Follow pattern: `routes.ts` → `service.ts` → `repository.ts` → `schema.ts`
3. Register routes in `api/index.ts`

### Adding a New Log Sink
1. Update `infra/logger.ts` with new transport
2. Add environment variable for configuration
3. Update `env.example`

## TypeScript Configuration

- **Strict Mode**: Enabled
- **Module System**: ES Modules
- **Target**: Node.js ≥ 20
- **Build Output**: `dist/` directory

## Build & Deployment

- **Build Command**: `npm run vercel-build` (runs `prisma generate && tsc`)
- **Output**: `dist/` directory with compiled JavaScript
- **Entry Point**: `api/index.ts` (for Vercel serverless functions)
