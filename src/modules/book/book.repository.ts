import { Repository } from '../../utils/repository.js';
import { prisma } from '../../infra/prisma.js';

export interface BookEntity {
  id: string;
  title: string;
  authors: string;
  createdBy: string;
  publishedBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BookRepository extends Repository<BookEntity> {
  constructor() {
    super(prisma.book, 'Book');
  }

  async findWithPagination(cursor?: string, limit = 20) {
    const where = cursor ? {
      OR: [
        { timestamp: { lt: new Date(JSON.parse(Buffer.from(cursor, 'base64').toString()).timestamp) } },
        {
          AND: [
            { timestamp: { equals: new Date(JSON.parse(Buffer.from(cursor, 'base64').toString()).timestamp) } },
            { id: { lt: JSON.parse(Buffer.from(cursor, 'base64').toString()).id } }
          ]
        }
      ]
    } : {};

    return this.findMany({
      where,
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' }
      ],
      take: limit,
    });
  }
}