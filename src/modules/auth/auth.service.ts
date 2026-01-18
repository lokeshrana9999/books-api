import { prisma } from '../../infra/prisma.js';
import { logger } from '../../infra/logger.js';

export interface AuthUser {
  id: string;
  name: string;
  role: 'admin' | 'reviewer';
}

export class AuthService {
  static async authenticate(apiKey: string): Promise<AuthUser | null> {
    try {
      // Log the API key prefix for debugging (don't log full key for security)
      logger.info({ apiKeyPrefix: apiKey?.substring(0, 10) + '...' }, 'Attempting authentication');
      
      const user = await prisma.user.findFirst({
        where: { credentials: apiKey },
        select: { id: true, name: true, role: true },
      });

      if (user) {
        logger.info({ userId: user.id, role: user.role }, 'User authenticated');
        return user as AuthUser;
      }

      // Check if database connection is working by trying a simple query
      const userCount = await prisma.user.count();
      logger.warn({ 
        apiKeyPrefix: apiKey?.substring(0, 10) + '...',
        userCount,
        message: 'Authentication failed: invalid API key or database issue'
      });
      return null;
    } catch (error) {
      logger.error({ 
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      }, 'Authentication error - database connection may have failed');
      return null;
    }
  }

  static checkPermission(user: AuthUser, requiredRole: 'admin' | 'reviewer'): boolean {
    if (requiredRole === 'reviewer') {
      return user.role === 'admin' || user.role === 'reviewer';
    }
    return user.role === 'admin';
  }
}