import { prisma } from '../../infra/prisma.js';
import { encodeCursor } from '../../utils/cursor.js';

export interface AuditFilters {
  entity?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  fieldsChanged?: string[];
  from?: Date;
  to?: Date;
  requestId?: string;
}

export interface AuditWithCursor {
  data: any[];
  nextCursor?: string;
}

export class AuditService {
  async findWithFilters(
    filters: AuditFilters,
    cursor?: string,
    limit = 20
  ): Promise<AuditWithCursor> {
    const where: any = {};

    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.requestId) where.requestId = filters.requestId;

    if (filters.from || filters.to) {
      where.timestamp = {};
      if (filters.from) where.timestamp.gte = filters.from;
      if (filters.to) where.timestamp.lte = filters.to;
    }

    if (filters.fieldsChanged && filters.fieldsChanged.length > 0) {
      where.OR = filters.fieldsChanged.map(field => ({
        diff: {
          contains: `"${field}":`,
        },
      }));
    }

    // Add cursor condition
    if (cursor) {
      const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
      where.OR = where.OR || [];
      where.OR.push(
        { timestamp: { lt: new Date(cursorData.timestamp) } },
        {
          AND: [
            { timestamp: { equals: new Date(cursorData.timestamp) } },
            { id: { lt: cursorData.id } }
          ]
        }
      );
    }

    const audits = await prisma.auditLog.findMany({
      where,
      orderBy: [
        { timestamp: 'desc' },
        { id: 'desc' }
      ],
      take: limit + 1, // Take one extra to check if there are more results
    });

    const hasNextPage = audits.length > limit;
    const data = hasNextPage ? audits.slice(0, -1) : audits;

    // Parse diff JSON strings back to objects
    const processedData = data.map(audit => ({
      ...audit,
      diff: audit.diff ? JSON.parse(audit.diff) : null,
    }));

    let nextCursor: string | undefined;
    if (hasNextPage && processedData.length > 0) {
      const lastAudit = processedData[processedData.length - 1];
      nextCursor = encodeCursor({
        timestamp: lastAudit.timestamp.toISOString(),
        id: lastAudit.id,
      });
    }

    return { data: processedData, nextCursor };
  }

  async findById(id: string) {
    const audit = await prisma.auditLog.findUnique({
      where: { id },
    });

    if (!audit) return null;

    return {
      ...audit,
      diff: audit.diff ? JSON.parse(audit.diff) : null,
    };
  }
}