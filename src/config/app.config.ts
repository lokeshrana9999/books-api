export const appConfig = {
  port: process.env.PORT || 3000,
  logLevel: process.env.LOG_LEVEL || 'info',
  logSink: process.env.LOG_SINK || 'file',
  databaseUrl: process.env.DATABASE_URL || '',
} as const;