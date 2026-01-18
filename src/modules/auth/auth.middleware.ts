import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService, AuthUser } from './auth.service.js';
import { requestContext } from '../../infra/asyncContext.js';
import { logger } from '../../infra/logger.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Vercel may lowercase headers, so check both cases
  const apiKey = (request.headers['x-api-key'] || request.headers['X-API-Key']) as string;

  if (!apiKey) {
    // Log available headers for debugging (in development)
    if (process.env.NODE_ENV !== 'production') {
      logger.warn({ 
        availableHeaders: Object.keys(request.headers).filter(k => k.toLowerCase().includes('api') || k.toLowerCase().includes('key'))
      }, 'No API key found in headers');
    }
    return reply.code(401).send({
      error: {
        code: 'AUTH_MISSING_API_KEY',
        message: 'API key is required',
        requestId: requestContext.getStore()?.requestId,
      },
    });
  }

  const user = await AuthService.authenticate(apiKey);
  if (!user) {
    return reply.code(401).send({
      error: {
        code: 'AUTH_INVALID_API_KEY',
        message: 'Invalid API key',
        requestId: requestContext.getStore()?.requestId,
      },
    });
  }

  request.user = user;

  // Update request context with user ID
  const context = requestContext.getStore();
  if (context) {
    requestContext.enterWith({ ...context, userId: user.id });
  } else {
    // Fallback: create new context if somehow missing
    requestContext.enterWith({
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id
    });
  }
}

export function requireRole(requiredRole: 'admin' | 'reviewer') {
  return async function roleMiddleware(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          requestId: requestContext.getStore()?.requestId,
        },
      });
    }

    if (!AuthService.checkPermission(request.user, requiredRole)) {
      return reply.code(403).send({
        error: {
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          message: `Required role: ${requiredRole}`,
          requestId: requestContext.getStore()?.requestId,
        },
      });
    }
  };
}