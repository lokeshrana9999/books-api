module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts'
  ],
  // Map .js imports to .ts files - only for our source directory structure
  // List specific patterns that match our source imports
  moduleNameMapper: {
    // Config imports (one and two levels up)
    '^(\\.\\./config/audit\\.config)\\.js$': '$1.ts',
    '^(\\.\\./config/app\\.config)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./config/audit\\.config)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./config/app\\.config)\\.js$': '$1.ts',
    // Infra imports (one and two levels up)
    '^(\\.\\./infra/asyncContext)\\.js$': '$1.ts',
    '^(\\.\\./infra/logger)\\.js$': '$1.ts',
    '^(\\.\\./infra/prisma)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./infra/asyncContext)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./infra/logger)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./infra/prisma)\\.js$': '$1.ts',
    // Same directory imports (./) - match common patterns in our source
    '^(\\./(asyncContext|logger|prisma|book\\.repository|book\\.routes|book\\.service|audit\\.routes|audit\\.service|auth\\.middleware|auth\\.service))\\.js$': '$1.ts',
    // Utils imports (one and two levels up)
    '^(\\.\\./utils/cursor)\\.js$': '$1.ts',
    '^(\\.\\./utils/diff)\\.js$': '$1.ts',
    '^(\\.\\./utils/errorHandler)\\.js$': '$1.ts',
    '^(\\.\\./utils/repository)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./utils/cursor)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./utils/diff)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./utils/errorHandler)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./utils/repository)\\.js$': '$1.ts',
    // Modules imports (with subdirectories)
    '^(\\.\\./modules/(book|audit|auth)/(.*))\\.js$': '$1.ts',
    // Cross-module imports (from within modules/)
    '^(\\.\\./auth/.*)\\.js$': '$1.ts',
    '^(\\.\\./book/.*)\\.js$': '$1.ts',
    '^(\\.\\./audit/.*)\\.js$': '$1.ts',
    // Plugins imports
    '^(\\.\\./plugins/audit\\.plugin)\\.js$': '$1.ts',
    // API imports (one level up and two levels up for tests)
    '^(\\.\\./api/index)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./api/index)\\.js$': '$1.ts',
    // Infra imports (two levels up for tests)  
    '^(\\.\\./\\.\\./infra/prisma)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./infra/asyncContext)\\.js$': '$1.ts',
    '^(\\.\\./\\.\\./infra/logger)\\.js$': '$1.ts',
  },
  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // Module file extensions to resolve
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/api/index.ts',
    '!src/seed.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000,
};