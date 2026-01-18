import { describe, it, expect } from '@jest/globals';
import { computeDiff } from '../../../utils/diff';

describe('Diff Utility - Unit Tests', () => {
  describe('Hermeneutic Circle: Component Understanding', () => {
    it('should compute create operation diff correctly', () => {
      const result = computeDiff('Book', 'create', undefined, {
        title: 'Test Book',
        authors: 'Test Author',
        publishedBy: 'Test Publisher',
        createdBy: 'user-123'
      });

      expect(result).toEqual({
        title: 'Test Book',
        authors: 'Test Author',
        publishedBy: 'Test Publisher',
        createdBy: 'user-123'
      });
    });

    it('should compute update operation diff correctly', () => {
      const before = {
        title: 'Old Title',
        authors: 'Old Author',
        publishedBy: 'Old Publisher'
      };

      const after = {
        title: 'New Title',
        authors: 'Old Author',
        publishedBy: 'New Publisher'
      };

      const result = computeDiff('Book', 'update', before, after);

      expect(result).toEqual({
        title: { before: 'Old Title', after: 'New Title' },
        publishedBy: { before: 'Old Publisher', after: 'New Publisher' }
      });
    });

    it('should compute delete operation diff correctly', () => {
      const before = {
        title: 'Book to Delete',
        authors: 'Author Name'
      };

      const result = computeDiff('Book', 'delete', before, undefined);

      expect(result).toEqual({
        title: 'Book to Delete',
        authors: 'Author Name'
      });
    });

    it('should exclude configured fields from diff', () => {
      const before = {
        title: 'Old Title',
        authors: 'Old Author',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const after = {
        title: 'New Title',
        authors: 'Old Author',
        updatedAt: '2024-01-02T00:00:00Z'
      };

      const result = computeDiff('Book', 'update', before, after);

      // updatedAt should be excluded from Book config
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).toHaveProperty('title');
    });

    it('should redact sensitive fields in diff', () => {
      const before = {
        name: 'Old Name',
        credentials: 'old-password-hash'
      };

      const after = {
        name: 'New Name',
        credentials: 'new-password-hash'
      };

      const result = computeDiff('User', 'update', before, after);

      expect(result).toEqual({
        name: { before: 'Old Name', after: 'New Name' },
        credentials: { before: '***', after: '***' }
      });
    });

    it('should return null for non-tracked entities', () => {
      // Assuming we don't track some hypothetical entity
      const result = computeDiff('NonExistentEntity' as any, 'create', undefined, { data: 'test' });

      // This would return null if entity not in auditConfig
      expect(result).toBeNull();
    });

    it('should handle empty objects gracefully', () => {
      const result = computeDiff('Book', 'create', undefined, {});

      expect(result).toEqual({});
    });

    it('should handle null/undefined values in diff', () => {
      const before = { title: 'Test', authors: null };
      const after = { title: 'Test Updated', authors: 'New Author' };

      const result = computeDiff('Book', 'update', before, after);

      expect(result).toEqual({
        title: { before: 'Test', after: 'Test Updated' },
        authors: { before: null, after: 'New Author' }
      });
    });

    it('should handle complex nested objects in update diffs', () => {
      const before = {
        title: 'Book',
        metadata: { pages: 100, isbn: '1234567890' }
      };

      const after = {
        title: 'Updated Book',
        metadata: { pages: 150, isbn: '1234567890' }
      };

      const result = computeDiff('Book', 'update', before, after);

      expect(result).toEqual({
        title: { before: 'Book', after: 'Updated Book' },
        metadata: { before: { pages: 100, isbn: '1234567890' }, after: { pages: 150, isbn: '1234567890' } }
      });
    });
  });

  describe('Hermeneutic Circle: Edge Cases & Boundaries', () => {
    it('should handle undefined before/after in update', () => {
      const result = computeDiff('Book', 'update', undefined, undefined);
      expect(result).toBeNull();
    });

    it('should handle only before defined in update', () => {
      const before = { title: 'Test' };
      const result = computeDiff('Book', 'update', before, undefined);
      expect(result).toBeNull();
    });

    it('should handle only after defined in update', () => {
      const after = { title: 'Test' };
      const result = computeDiff('Book', 'update', undefined, after);
      expect(result).toBeNull();
    });

    it('should handle identical before/after in update', () => {
      const data = { title: 'Same', authors: 'Same' };
      const result = computeDiff('Book', 'update', data, data);

      expect(result).toEqual({});
    });

    it('should handle arrays in diff data', () => {
      const before = { tags: ['old1', 'old2'] };
      const after = { tags: ['new1', 'new2'] };

      const result = computeDiff('Book', 'update', before, after);

      expect(result).toEqual({
        tags: { before: ['old1', 'old2'], after: ['new1', 'new2'] }
      });
    });

    it('should handle special characters in string fields', () => {
      const before = { title: 'Normal Title' };
      const after = { title: 'Title with émojis 🎉 and spëcial chärs' };

      const result = computeDiff('Book', 'update', before, after);

      expect(result).toEqual({
        title: {
          before: 'Normal Title',
          after: 'Title with émojis 🎉 and spëcial chärs'
        }
      });
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const before = { title: 'short' };
      const after = { title: longString };

      const result = computeDiff('Book', 'update', before, after);

      expect(result!.title.after).toBe(longString);
    });

    it('should handle Date objects in diff', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');

      const before = { createdAt: date1 };
      const after = { createdAt: date2 };

      const result = computeDiff('Book', 'update', before, after);

      expect(result).toEqual({
        createdAt: { before: date1, after: date2 }
      });
    });
  });
});