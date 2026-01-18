import Fastify from 'fastify';
import { requestContext } from '../infra/asyncContext.js';
import { logger } from '../infra/logger.js';
import { createErrorHandler } from '../utils/errorHandler.js';
import { bookRoutes } from '../modules/book/book.routes.js';
import { auditRoutes } from '../modules/audit/audit.routes.js';
import { appConfig } from '../config/app.config.js';

async function buildApp() {
  const app = Fastify({
    logger: false, // We use our custom logger
    disableRequestLogging: true, // We'll handle request logging manually
  });

  // Register custom error handler
  app.setErrorHandler(createErrorHandler());

  // Request context middleware - runs first
  app.addHook('onRequest', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    requestContext.enterWith({
      requestId,
      userId: undefined,
    });

    // Add request ID to reply headers
    reply.header('x-request-id', requestId);
  });

  // Request logging middleware
  app.addHook('onRequest', async (request, reply) => {
    const context = requestContext.getStore();
    logger.info({
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
    }, 'Request started');
  });

  // Response logging middleware
  app.addHook('onResponse', async (request, reply) => {
    const context = requestContext.getStore();
    logger.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime,
    }, 'Request completed');
  });

  // Register routes
  await app.register(bookRoutes, { prefix: '/api' });
  await app.register(auditRoutes, { prefix: '/api' });

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}

export { buildApp };

// For local development
async function startServer() {
  const app = await buildApp();

  try {
    const port = appConfig.port;
    await app.listen({ port: Number(port), host: '0.0.0.0' });
    logger.info({ port }, 'Server started');
  } catch (err) {
    logger.error({ error: err }, 'Failed to start server');
    process.exit(1);
  }
}

// Vercel serverless function export
let app: any;
export default async function handler(req: any, res: any) {
  if (!app) {
    app = await buildApp();
  }

  // Handle Vercel serverless requests
  await app.ready();
  app.server.emit('request', req, res);
}

// For local development
if (require.main === module) {
  startServer();
}