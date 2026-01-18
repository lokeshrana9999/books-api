import { FastifyInstance } from 'fastify';
import { BookService } from './book.service.js';
import { BookRepository } from './book.repository.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { logger } from '../../infra/logger.js';
import { requestContext } from '../../infra/asyncContext.js';
import { createBookSchema, updateBookSchema } from './book.schema.js';

const bookRepository = new BookRepository();
const bookService = new BookService(bookRepository);

export async function bookRoutes(fastify: FastifyInstance) {
  // Apply authentication to all book routes
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/books - List books with pagination
  fastify.get('/books', async (request, reply) => {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };

    try {
      const result = await bookService.findWithPagination(
        cursor,
        limit ? parseInt(limit, 10) : 20
      );

      return reply.send(result);
    } catch (error) {
      logger.error({ 
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        cursor,
        limit,
        requestId: requestContext.getStore()?.requestId
      }, 'Failed to fetch books');
      throw error; // Let the global error handler process it
    }
  });

  // POST /api/books - Create a book
  fastify.post('/books', async (request, reply) => {
    try {
      // Validate request body
      const validatedData = createBookSchema.parse(request.body);
      
      const book = await bookService.create(validatedData);
      return reply.code(201).send(book);
    } catch (error) {
      // If it's a Zod validation error, throw it to be handled by error handler
      if (error instanceof Error && error.name === 'ZodError') {
        throw error;
      }
      
      logger.error({ 
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        requestBody: request.body,
        requestId: requestContext.getStore()?.requestId
      }, 'Failed to create book');
      throw error; // Let the global error handler process it
    }
  });

  // GET /api/books/:id - Get a book by ID
  fastify.get('/books/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const book = await bookService.findById(id);
      if (!book) {
        return reply.code(404).send({ error: 'Book not found' });
      }
      return reply.send(book);
    } catch (error) {
      logger.error({ 
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        bookId: id,
        requestId: requestContext.getStore()?.requestId
      }, 'Failed to fetch book');
      throw error; // Let the global error handler process it
    }
  });

  // PATCH /api/books/:id - Update a book
  fastify.patch('/books/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      // Validate request body
      const updateData = updateBookSchema.parse(request.body);
      
      const book = await bookService.update(id, updateData);
      return reply.send(book);
    } catch (error) {
      // If it's a Zod validation error, throw it to be handled by error handler
      if (error instanceof Error && error.name === 'ZodError') {
        throw error;
      }
      
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.code(404).send({ error: 'Book not found' });
      }
      logger.error({ 
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        bookId: id,
        updateData: request.body,
        requestId: requestContext.getStore()?.requestId
      }, 'Failed to update book');
      throw error; // Let the global error handler process it
    }
  });

  // DELETE /api/books/:id - Delete a book
  fastify.delete('/books/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await bookService.delete(id);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.code(404).send({ error: 'Book not found' });
      }
      logger.error({ 
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        bookId: id,
        requestId: requestContext.getStore()?.requestId
      }, 'Failed to delete book');
      throw error; // Let the global error handler process it
    }
  });
}