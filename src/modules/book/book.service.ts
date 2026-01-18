import { BookRepository, BookEntity } from './book.repository.js';
import { encodeCursor, decodeCursor } from '../../utils/cursor.js';
import { requestContext } from '../../infra/asyncContext.js';
import { logger } from '../../infra/logger.js';

export interface CreateBookData {
  title: string;
  authors: string;
  publishedBy: string;
}

export interface UpdateBookData {
  title?: string;
  authors?: string;
  publishedBy?: string;
}

export interface BookWithCursor {
  data: BookEntity[];
  nextCursor?: string;
}

export class BookService {
  constructor(private repository: BookRepository) {}

  async create(data: CreateBookData): Promise<BookEntity> {
    const context = requestContext.getStore();
    const userId = context?.userId || 'system'; // Fallback for testing

    return this.repository.create({
      ...data,
      createdBy: userId,
    });
  }

  async update(id: string, data: UpdateBookData): Promise<BookEntity> {
    const context = requestContext.getStore();
    const userId = context?.userId || 'system'; // Fallback for testing

    return this.repository.update(id, {
      ...data,
      updatedBy: userId,
    });
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  async findById(id: string): Promise<BookEntity | null> {
    return this.repository.findById(id);
  }

  async findWithPagination(cursor?: string, limit = 20): Promise<BookWithCursor> {
    try {
      // Validate and decode cursor if provided
      let cursorData: { timestamp: string; id: string } | undefined;
      if (cursor) {
        try {
          cursorData = decodeCursor(cursor);
        } catch (error) {
          logger.warn({ cursor, error: error instanceof Error ? error.message : String(error) }, 'Invalid cursor format provided, ignoring cursor');
          // Continue without cursor if invalid
        }
      }

      // Build query with cursor condition
      const queryOptions: any = {
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' }
        ],
        take: limit + 1, // Take one extra to check if there are more results
      };

      // Add cursor-based filtering if valid cursor provided
      if (cursorData) {
        queryOptions.where = {
          OR: [
            { createdAt: { lt: new Date(cursorData.timestamp) } },
            {
              AND: [
                { createdAt: { equals: new Date(cursorData.timestamp) } },
                { id: { lt: cursorData.id } }
              ]
            }
          ]
        };
      }

      const books = await this.repository.findMany(queryOptions);

      const hasNextPage = books.length > limit;
      const data = hasNextPage ? books.slice(0, -1) : books;

      let nextCursor: string | undefined;
      if (hasNextPage && data.length > 0) {
        const lastBook = data[data.length - 1];
        nextCursor = encodeCursor({
          timestamp: lastBook.createdAt.toISOString(),
          id: lastBook.id,
        });
      }

      return { data, nextCursor };
    } catch (error) {
      logger.error({ 
        error, 
        cursor, 
        limit,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      }, 'Failed to fetch books with pagination');
      throw error;
    }
  }
}