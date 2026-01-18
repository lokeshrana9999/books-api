// Vercel serverless function entry point
// Directly import and re-export the handler
import { buildApp } from '../src/api/index.js';

let app: any;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }

  // Vercel rewrites /api/* to /api/index, but sometimes preserves original URL
  // We need to extract the correct path for Fastify routing while preserving query params
  // The URL might be: /api/index, /api/index?path=health, or /api/books?limit=10&cursor=abc
  
  const fullUrl = req.url || '/';
  const urlParts = fullUrl.split('?');
  let pathOnly = urlParts[0]; // Path without query
  let queryString = urlParts[1] || ''; // Query string (preserve this for API filters!)
  
  // Check Vercel headers for original path (most reliable)
  const vercelPath = req.headers['x-vercel-path'] || 
                     req.headers['x-invoke-path'] ||
                     req.headers['x-forwarded-uri'] ||
                     req.headers['x-original-url'];
  
  if (vercelPath) {
    // Use path from headers, but preserve query params from original request
    const vercelParts = vercelPath.split('?');
    pathOnly = vercelParts[0];
    // If vercel path has query, use it; otherwise keep original query
    if (vercelParts[1]) {
      queryString = vercelParts[1];
    }
  } else if (pathOnly === '/api/index' || pathOnly === '/api') {
    // URL is the function path, check if path is in query params (Vercel rewrite pattern)
    try {
      const urlObj = new URL(fullUrl, 'http://localhost');
      const pathParam = urlObj.searchParams.get('path');
      if (pathParam) {
        // Path is in query param (from rewrite), reconstruct it
        pathOnly = `/api/${pathParam}`;
        // Remove 'path' from query params as it's not a real API param
        urlObj.searchParams.delete('path');
        queryString = urlObj.searchParams.toString();
      } else if (pathOnly === '/api') {
        pathOnly = '/health';
      }
    } catch (e) {
      // If URL parsing fails, use defaults
      if (pathOnly === '/api') {
        pathOnly = '/health';
      }
    }
  }
  // else: pathOnly already contains the original path (like /api/health or /api/books)
  
  // For routes registered without /api prefix in Fastify (like /health), strip /api
  // For routes registered with /api prefix (like /api/books), keep /api
  if (pathOnly === '/api/health') {
    pathOnly = '/health';
  } else if (pathOnly === '/api') {
    pathOnly = '/health';
  }
  // For /api/books, /api/audits, etc., keep the /api prefix (Fastify routes have it)
  
  // Reconstruct URL with preserved query parameters (important for filters, pagination, etc.)
  req.url = queryString ? `${pathOnly}?${queryString}` : pathOnly;

  // Vercel provides Node.js http.IncomingMessage and http.ServerResponse
  // Fastify can handle these directly via the server
  app.server.emit('request', req, res);
  
  // Return a promise that resolves when the response is sent
  return new Promise((resolve) => {
    res.on('finish', resolve);
  });
}
