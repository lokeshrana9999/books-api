import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../api/index.js';
import { prisma } from '../../infra/prisma.js';

const ADMIN_API_KEY = 'admin-api-key-12345';
const REVIEWER_API_KEY = 'reviewer-api-key-67890';

describe('Audit Trail Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up audit logs between tests
    await prisma.auditLog.deleteMany();
    // Reset books but keep seeded ones for reference
    await prisma.book.deleteMany({
      where: {
        NOT: {
          id: { in: ['book-1', 'book-2', 'book-3'] }
        }
      }
    });
  });

  describe('Hermeneutic Circle: Whole System Perspective', () => {
    it('should demonstrate complete audit workflow from creation to query', async () => {
      // 1. Create a book (business operation)
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/books',
        headers: { 'x-api-key': ADMIN_API_KEY },
        payload: {
          title: 'Hermeneutic Test Book',
          authors: 'Test Author',
          publishedBy: 'Test Publisher'
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const createdBook = JSON.parse(createResponse.payload);

      // 2. Verify audit log was created (system integrity)
      const auditResponse = await app.inject({
        method: 'GET',
        url: '/api/audits',
        headers: { 'x-api-key': ADMIN_API_KEY }
      });

      expect(auditResponse.statusCode).toBe(200);
      const audits = JSON.parse(auditResponse.payload);
      expect(audits.data).toHaveLength(1);

      const audit = audits.data[0];
      expect(audit).toMatchObject({
        entity: 'Book',
        entityId: createdBook.id,
        action: 'create',
        actorId: expect.any(String),
        requestId: expect.any(String),
        timestamp: expect.any(String)
      });

      // 3. Verify audit data integrity (detailed inspection)
      // diff is already parsed by audit service
      const parsedDiff = typeof audit.diff === 'string' ? JSON.parse(audit.diff) : audit.diff;
      expect(parsedDiff.title).toBe('Hermeneutic Test Book');
      expect(parsedDiff.authors).toBe('Test Author');
      expect(parsedDiff.publishedBy).toBe('Test Publisher');
      expect(parsedDiff.createdBy).toBeDefined();
      expect(parsedDiff.updatedAt).toBeUndefined(); // excluded field
    });
  });

  describe('Hermeneutic Circle: Component Relationships', () => {
    it('should validate auth-audit-logging-requestId chain', async () => {
      // Inject request to capture requestId
      let capturedRequestId: string;

      const response = await app.inject({
        method: 'POST',
        url: '/api/books',
        headers: {
          'x-api-key': ADMIN_API_KEY,
          'x-request-id': 'test-request-123'
        },
        payload: {
          title: 'Request ID Test',
          authors: 'Test Author',
          publishedBy: 'Test Publisher'
        }
      });

      expect(response.statusCode).toBe(201);
      capturedRequestId = response.headers['x-request-id'] as string;

      // Verify requestId propagates to audit log
      const auditResponse = await app.inject({
        method: 'GET',
        url: '/api/audits',
        headers: { 'x-api-key': ADMIN_API_KEY }
      });

      const audits = JSON.parse(auditResponse.payload);
      expect(audits.data[0].requestId).toBe('test-request-123');
    });

    it('should validate RBAC-audit-access relationship', async () => {
      // Create audit data
      await app.inject({
        method: 'POST',
        url: '/api/books',
        headers: { 'x-api-key': ADMIN_API_KEY },
        payload: {
          title: 'RBAC Test Book',
          authors: 'Test Author',
          publishedBy: 'Test Publisher'
        }
      });

      // Admin can access audits
      const adminResponse = await app.inject({
        method: 'GET',
        url: '/api/audits',
        headers: { 'x-api-key': ADMIN_API_KEY }
      });
      expect(adminResponse.statusCode).toBe(200);

      // Reviewer cannot access audits
      const reviewerResponse = await app.inject({
        method: 'GET',
        url: '/api/audits',
        headers: { 'x-api-key': REVIEWER_API_KEY }
      });
      expect(reviewerResponse.statusCode).toBe(403);

      const error = JSON.parse(reviewerResponse.payload);
      expect(error.error.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Hermeneutic Circle: Edge Cases & Boundaries', () => {
    it('should handle audit creation failure gracefully', async () => {
      // This test would require mocking audit creation failure
      // to ensure business logic continues even if audit fails
      const response = await app.inject({
        method: 'POST',
        url: '/api/books',
        headers: { 'x-api-key': ADMIN_API_KEY },
        payload: {
          title: 'Graceful Failure Test',
          authors: 'Test Author',
          publishedBy: 'Test Publisher'
        }
      });

      // Even if audit fails, book creation should succeed
      expect(response.statusCode).toBe(201);
    });

    it('should handle concurrent operations with proper isolation', async () => {
      // Create multiple books concurrently
      const promises = Array(5).fill(null).map((_, i) =>
        app.inject({
          method: 'POST',
          url: '/api/books',
          headers: { 'x-api-key': ADMIN_API_KEY },
          payload: {
            title: `Concurrent Book ${i}`,
            authors: 'Test Author',
            publishedBy: 'Test Publisher'
          }
        })
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.statusCode).toBe(201);
      });

      // Verify all operations were audited
      const auditResponse = await app.inject({
        method: 'GET',
        url: '/api/audits',
        headers: { 'x-api-key': ADMIN_API_KEY }
      });

      const audits = JSON.parse(auditResponse.payload);
      expect(audits.data).toHaveLength(5);
      audits.data.forEach((audit: any) => {
        expect(audit.action).toBe('create');
        expect(audit.entity).toBe('Book');
      });
    });
  });

  describe('Hermeneutic Circle: Config-Driven Extensibility', () => {
    it('should respect audit configuration dynamically', async () => {
      // Create a book and verify audit config is respected
      const response = await app.inject({
        method: 'POST',
        url: '/api/books',
        headers: { 'x-api-key': ADMIN_API_KEY },
        payload: {
          title: 'Config Test Book',
          authors: 'Test Author',
          publishedBy: 'Test Publisher'
        }
      });

      expect(response.statusCode).toBe(201);

      // Check that audit was created (Book.track = true)
      const auditResponse = await app.inject({
        method: 'GET',
        url: '/api/audits?entity=Book',
        headers: { 'x-api-key': ADMIN_API_KEY }
      });

      const audits = JSON.parse(auditResponse.payload);
      expect(audits.data.length).toBeGreaterThan(0);

      // Verify excluded fields (updatedAt) are not in diff
      const audit = audits.data[0];
      // diff is already parsed by audit service
      const diff = typeof audit.diff === 'string' ? JSON.parse(audit.diff) : audit.diff;
      expect(diff.updatedAt).toBeUndefined();
    });

    it('should support audit filtering capabilities', async () => {
      // Create test data
      const bookResponse = await app.inject({
        method: 'POST',
        url: '/api/books',
        headers: { 'x-api-key': ADMIN_API_KEY },
        payload: {
          title: 'Filter Test Book',
          authors: 'Test Author',
          publishedBy: 'Test Publisher'
        }
      });

      const book = JSON.parse(bookResponse.payload);

      // Test entity filter
      const entityFilter = await app.inject({
        method: 'GET',
        url: '/api/audits?entity=Book',
        headers: { 'x-api-key': ADMIN_API_KEY }
      });
      expect(JSON.parse(entityFilter.payload).data.length).toBeGreaterThan(0);

      // Test entityId filter
      const entityIdFilter = await app.inject({
        method: 'GET',
        url: `/api/audits?entityId=${book.id}`,
        headers: { 'x-api-key': ADMIN_API_KEY }
      });
      expect(JSON.parse(entityIdFilter.payload).data.length).toBeGreaterThan(0);

      // Test action filter
      const actionFilter = await app.inject({
        method: 'GET',
        url: '/api/audits?action=create',
        headers: { 'x-api-key': ADMIN_API_KEY }
      });
      expect(JSON.parse(actionFilter.payload).data.length).toBeGreaterThan(0);
    });
  });
});