import { prisma } from '../infra/prisma.js';
import { requestContext } from '../infra/asyncContext.js';
import { computeDiff } from '../utils/diff.js';
import { logger } from '../infra/logger.js';

export interface AuditEvent {
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  before?: Record<string, any>;
  after?: Record<string, any>;
}

export class AuditPlugin {
  static async log(event: AuditEvent): Promise<void> {
    try {
      const context = requestContext.getStore();
      if (!context) {
        logger.warn('No request context available for audit logging');
        return;
      }

      const diff = computeDiff(
        event.entity as keyof typeof import('../config/audit.config.js').auditConfig,
        event.action,
        event.before,
        event.after
      );

      if (diff === null) {
        // Entity not tracked
        return;
      }

      await prisma.auditLog.create({
        data: {
          entity: event.entity,
          entityId: event.entityId,
          action: event.action,
          actorId: context.userId || 'system',
          diff: JSON.stringify(diff),
          requestId: context.requestId,
        },
      });

      logger.info({
        audit: {
          entity: event.entity,
          entityId: event.entityId,
          action: event.action,
          actorId: context.userId,
        },
      }, 'Audit log created');
    } catch (error) {
      logger.error({ error, event }, 'Failed to create audit log');
      // Don't throw - audit failures shouldn't break business logic
    }
  }
}