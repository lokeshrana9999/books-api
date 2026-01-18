import pino from 'pino';
import { requestContext } from './asyncContext.js';
import { appConfig } from '../config/app.config.js';

const createLogger = () => {
  const baseLogger = pino({
    level: appConfig.logLevel,
    formatters: {
      log: (obj) => {
        const context = requestContext.getStore();
        if (context) {
          obj.requestId = context.requestId;
          obj.userId = context.userId;
        }
        return obj;
      },
    },
  });

  // Configure transport based on LOG_SINK
  let transport;
  switch (appConfig.logSink) {
    case 'elastic':
      // Placeholder for Elasticsearch transport
      transport = pino.transport({
        target: 'pino-elasticsearch',
        options: { node: 'http://localhost:9200' },
      });
      break;
    case 'logtail':
      // Placeholder for Logtail transport
      transport = pino.transport({
        target: '@logtail/pino',
        options: { sourceToken: process.env.LOGTAIL_TOKEN },
      });
      break;
    case 'file':
    default:
      transport = pino.transport({
        target: 'pino/file',
        options: { destination: './logs/app.log' },
      });
      break;
  }

  return baseLogger;
};

export const logger = createLogger();