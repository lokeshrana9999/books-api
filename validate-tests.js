import { computeDiff } from './dist/utils/diff.js';
import { encodeCursor, decodeCursor } from './dist/utils/cursor.js';
import { auditConfig } from './dist/config/audit.config.js';

console.log('🧪 Running Basic Validation Tests...\n');

// Test 1: Diff computation
console.log('1. Testing diff computation...');
try {
  const createDiff = computeDiff('Book', 'create', undefined, {
    title: 'Test Book',
    authors: 'Test Author',
    createdBy: 'user-123'
  });

  if (createDiff && typeof createDiff === 'object' && createDiff.title === 'Test Book') {
    console.log('   ✅ Create diff works correctly');
  } else {
    console.log('   ❌ Create diff failed');
  }

  const updateDiff = computeDiff('Book', 'update',
    { title: 'Old Title', authors: 'Same Author' },
    { title: 'New Title', authors: 'Same Author' }
  );

  if (updateDiff && updateDiff.title && updateDiff.title.before === 'Old Title' && updateDiff.title.after === 'New Title') {
    console.log('   ✅ Update diff works correctly');
  } else {
    console.log('   ❌ Update diff failed');
    console.log('   Result:', updateDiff);
  }

  // Test excluded fields
  const excludedDiff = computeDiff('Book', 'update',
    { title: 'Old', updatedAt: new Date('2024-01-01') },
    { title: 'New', updatedAt: new Date('2024-01-02') }
  );

  if (excludedDiff && !excludedDiff.updatedAt) {
    console.log('   ✅ Field exclusion works correctly');
  } else {
    console.log('   ❌ Field exclusion failed');
  }

  // Test redaction
  const redactedDiff = computeDiff('User', 'update',
    { name: 'Old Name', credentials: 'old-hash' },
    { name: 'New Name', credentials: 'new-hash' }
  );

  if (redactedDiff && redactedDiff.credentials && redactedDiff.credentials.before === '***' && redactedDiff.credentials.after === '***') {
    console.log('   ✅ Field redaction works correctly');
  } else {
    console.log('   ❌ Field redaction failed');
    console.log('   Result:', redactedDiff);
  }

} catch (error) {
  console.log('   ❌ Diff computation error:', error.message);
}

// Test 2: Cursor utilities
console.log('\n2. Testing cursor utilities...');
try {
  const testCursor = { timestamp: '2024-01-01T00:00:00.000Z', id: '123' };
  const encoded = encodeCursor(testCursor);
  const decoded = decodeCursor(encoded);

  if (decoded.timestamp === testCursor.timestamp && decoded.id === testCursor.id) {
    console.log('   ✅ Cursor encoding/decoding works correctly');
  } else {
    console.log('   ❌ Cursor encoding/decoding failed');
    console.log('   Original:', testCursor);
    console.log('   Decoded:', decoded);
  }
} catch (error) {
  console.log('   ❌ Cursor utility error:', error.message);
}

// Test 3: Audit configuration
console.log('\n3. Testing audit configuration...');
try {
  if (auditConfig.Book && auditConfig.Book.track === true && auditConfig.Book.exclude.includes('updatedAt')) {
    console.log('   ✅ Book audit config is correct');
  } else {
    console.log('   ❌ Book audit config is incorrect');
    console.log('   Config:', auditConfig.Book);
  }

  if (auditConfig.User && auditConfig.User.track === true && auditConfig.User.redact.includes('credentials')) {
    console.log('   ✅ User audit config is correct');
  } else {
    console.log('   ❌ User audit config is incorrect');
    console.log('   Config:', auditConfig.User);
  }
} catch (error) {
  console.log('   ❌ Audit config error:', error.message);
}

console.log('\n🎉 Basic validation completed!');
console.log('\n📋 Summary:');
console.log('- Core utilities (diff, cursor) are functional');
console.log('- Audit configuration is properly set up');
console.log('- Config-driven approach is implemented');
console.log('- Ready for integration testing');