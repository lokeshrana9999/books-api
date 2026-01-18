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
      const user = await prisma.user.findFirst({
        where: { credentials: apiKey },
        select: { id: true, name: true, role: true },
      });

      if (user) {
        logger.info({ userId: user.id, role: user.role }, 'User authenticated');
        return user as AuthUser;
      }

      logger.warn('Authentication failed: invalid API key');
      return null;
    } catch (error) {
      logger.error({ error }, 'Authentication error');
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