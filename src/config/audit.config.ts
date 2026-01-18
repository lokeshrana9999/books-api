export const auditConfig = {
  Book: {
    track: true,
    exclude: ['updatedAt'],
    redact: [],
  },
  User: {
    track: true,
    exclude: [],
    redact: ['credentials'],
  },
} as const;