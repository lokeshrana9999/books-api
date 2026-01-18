import { FastifyError, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { ZodError, ZodIssue } from 'zod';
import { requestContext } from '../infra/asyncContext.js';
import { logger } from '../infra/logger.js';

export function createErrorHandler() {
  return async function errorHandler(
    error: FastifyError,
    request: any,
    reply: FastifyReply
  ) {
    const context = requestContext.getStore();
    const requestId = context?.requestId || 'unknown';

    // Log the error with comprehensive details
    const errorDetails: any = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      name: error.name,
    };
    
    // Include error cause if available (Error.cause is a standard property)
    if ('cause' in error && error.cause) {
      errorDetails.cause = error.cause;
    }

    logger.error({
      error: errorDetails,
      requestId,
      url: request.url,
      method: request.method,
      query: request.query,
      params: request.params,
      body: request.body,
      headers: {
        'x-api-key': request.headers['x-api-key'] ? '[REDACTED]' : undefined,
        'x-request-id': request.headers['x-request-id'],
        'user-agent': request.headers['user-agent'],
      },
    }, 'Request error');

    // Don't expose stack traces in production
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Handle different error types
    let statusCode = error.statusCode || 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error instanceof ZodError) {
      // Handle Zod validation errors
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = 'Validation failed';
      
      // ZodError uses 'issues' property, not 'errors'
      const details = error.issues.map((err: ZodIssue) => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      
      const response = {
        error: {
          code: errorCode,
          message,
          requestId,
          details,
        },
      };
      
      return reply.code(statusCode).send(response);
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      // Handle Prisma validation errors (missing required fields)
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = 'Invalid request data';
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma known errors
      switch (error.code) {
        case 'P2002':
          statusCode = 409;
          errorCode = 'CONFLICT';
          message = 'A record with this information already exists';
          break;
        case 'P2025':
          statusCode = 404;
          errorCode = 'NOT_FOUND';
          message = 'Record not found';
          break;
        default:
          statusCode = 400;
          errorCode = 'DATABASE_ERROR';
          message = 'Database operation failed';
      }
    } else if (error.validation) {
      // Handle Fastify validation errors
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = 'Invalid request data';

      // Add validation details in development
      if (isDevelopment) {
        (error as any).validation = error.validation;
      }
    } else if (error.code === 'FST_ERR_BAD_STATUS_CODE') {
      // Fastify status code errors
      errorCode = 'BAD_STATUS_CODE';
      message = 'Invalid status code';
    }

    // Ensure we don't send sensitive information
    const response = {
      error: {
        code: errorCode,
        message,
        requestId,
        ...(isDevelopment && {
          details: error.message,
          stack: error.stack,
        }),
      },
    };

    return reply.code(statusCode).send(response);
  };
}