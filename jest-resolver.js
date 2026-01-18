// Custom Jest resolver that handles .js -> .ts mapping for source files only
const fs = require('fs');
const path = require('path');
const defaultResolver = require('jest-resolve').default;

module.exports = (request, options) => {
  // If it's a relative import ending in .js, try .ts first
  if (request.startsWith('./') || request.startsWith('../')) {
    if (request.endsWith('.js')) {
      const tsPath = request.replace(/\.js$/, '.ts');
      const resolvedTs = defaultResolver(tsPath, options);
      
      // If .ts file exists in src/, use it
      if (resolvedTs && resolvedTs.includes('/src/') && fs.existsSync(resolvedTs)) {
        return resolvedTs;
      }
    }
  }
  
  // Otherwise use default resolver
  return defaultResolver(request, options);
};