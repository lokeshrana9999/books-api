import { auditConfig } from '../config/audit.config.js';

type DiffResult = Record<string, { before: any; after: any }> | Record<string, any>;

export function computeDiff(
  entity: keyof typeof auditConfig,
  action: 'create' | 'update' | 'delete',
  before?: Record<string, any>,
  after?: Record<string, any>
): DiffResult | null {
  const config = auditConfig[entity];
  if (!config || !config.track) {
    return null;
  }

  switch (action) {
    case 'create':
      return applyRules(entity, after || {});
    case 'update':
      if (!before || !after) return null;
      const changes: Record<string, { before: any; after: any }> = {};
      for (const key in after) {
        if (before[key] !== after[key]) {
          changes[key] = { before: before[key], after: after[key] };
        }
      }
      return applyRules(entity, changes);
    case 'delete':
      return applyRules(entity, before || {});
    default:
      return null;
  }
}

function applyRules(entity: keyof typeof auditConfig, data: Record<string, any>): Record<string, any> {
  const config = auditConfig[entity];
  const result = { ...data };

  // Remove excluded fields entirely
  config.exclude.forEach(field => {
    delete result[field];
  });

  // Redact sensitive fields
  config.redact.forEach(field => {
    if (result[field] !== undefined) {
      if (typeof result[field] === 'object' && result[field] !== null) {
        // Handle nested objects in update diffs
        if ('before' in result[field] && 'after' in result[field]) {
          result[field] = { before: '***', after: '***' };
        } else {
          result[field] = '***';
        }
      } else {
        result[field] = '***';
      }
    }
  });

  return result;
}