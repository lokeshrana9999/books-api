import { prisma } from './infra/prisma.js';
import { logger } from './infra/logger.js';

async function seed() {
  try {
    logger.info('Starting database seeding...');

    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { id: 'admin-user-id' },
      update: {},
      create: {
        id: 'admin-user-id',
        name: 'Admin User',
        role: 'admin',
        credentials: 'admin-api-key-12345',
      },
    });

    logger.info({ userId: adminUser.id }, 'Admin user created/updated');

    // Create reviewer user
    const reviewerUser = await prisma.user.upsert({
      where: { id: 'reviewer-user-id' },
      update: {},
      create: {
        id: 'reviewer-user-id',
        name: 'Reviewer User',
        role: 'reviewer',
        credentials: 'reviewer-api-key-67890',
      },
    });

    logger.info({ userId: reviewerUser.id }, 'Reviewer user created/updated');

    // Create sample books
    const books = [
      {
        id: 'book-1',
        title: 'The Pragmatic Programmer',
        authors: 'Andrew Hunt, David Thomas',
        createdBy: adminUser.id,
        publishedBy: 'Addison-Wesley',
      },
      {
        id: 'book-2',
        title: 'Clean Code',
        authors: 'Robert C. Martin',
        createdBy: adminUser.id,
        publishedBy: 'Prentice Hall',
      },
      {
        id: 'book-3',
        title: 'Design Patterns',
        authors: 'Gang of Four',
        createdBy: reviewerUser.id,
        publishedBy: 'Addison-Wesley',
      },
    ];

    for (const bookData of books) {
      const book = await prisma.book.upsert({
        where: { id: bookData.id },
        update: {},
        create: bookData,
      });
      logger.info({ bookId: book.id, title: book.title }, 'Book created/updated');
    }

    logger.info('Database seeding completed successfully');

    // Print API keys for testing
    console.log('\n=== API Keys for Testing ===');
    console.log(`Admin API Key: ${adminUser.credentials}`);
    console.log(`Reviewer API Key: ${reviewerUser.credentials}`);
    console.log('=============================\n');

  } catch (error) {
    logger.error({ error }, 'Database seeding failed');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seed };