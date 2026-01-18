export type Cursor = {
  timestamp: string;
  id: string;
};

export function encodeCursor(cursor: Cursor): string {
  const payload = JSON.stringify(cursor);
  return Buffer.from(payload).toString('base64');
}

export function decodeCursor(cursor: string): Cursor {
  try {
    const payload = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (error) {
    throw new Error('Invalid cursor format');
  }
}

export function buildCursorCondition(cursor?: string): {
  timestamp: { lt: Date } | { lte: Date };
  id: { lt: string };
} | undefined {
  if (!cursor) return undefined;

  const decoded = decodeCursor(cursor);
  return {
    timestamp: { lt: new Date(decoded.timestamp) },
    id: { lt: decoded.id },
  };
}