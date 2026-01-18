import { FastifyInstance } from 'fastify';
import { AuditService } from './audit.service.js';
import { authMiddleware, requireRole } from '../auth/auth.middleware.js';
import { logger } from '../../infra/logger.js';

const auditService = new AuditService();

export async function auditRoutes(fastify: FastifyInstance) {
  // Apply authentication and admin-only access to all audit routes
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', requireRole('admin'));

  // GET /api/audits - List audit logs with filters and pagination
  fastify.get('/audits', async (request, reply) => {
    const query = request.query as {
      entity?: string;
      entityId?: string;
      actorId?: string;
      action?: string;
      fieldsChanged?: string;
      from?: string;
      to?: string;
      requestId?: string;
      cursor?: string;
      limit?: string;
    };

    try {
      const filters = {
        entity: query.entity,
        entityId: query.entityId,
        actorId: query.actorId,
        action: query.action,
        fieldsChanged: query.fieldsChanged ? query.fieldsChanged.split(',') : undefined,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        requestId: query.requestId,
      };

      const result = await auditService.findWithFilters(
        filters,
        query.cursor,
        query.limit ? parseInt(query.limit, 10) : 20
      );

      return reply.send(result);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch audit logs');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/audits/:id - Get a specific audit log
  fastify.get('/audits/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const audit = await auditService.findById(id);
      if (!audit) {
        return reply.code(404).send({ error: 'Audit log not found' });
      }
      return reply.send(audit);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch audit log');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}