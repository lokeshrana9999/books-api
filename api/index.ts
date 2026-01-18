// Vercel serverless function entry point
// Directly import and re-export the handler
import { buildApp } from '../src/api/index.js';

let app: any;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }

  // Vercel rewrites /api/* to /api/index, so req.url will be /api/index
  // We need to restore the original request path for Fastify routing
  // Check for original path in Vercel headers (set by rewrites)
  const vercelPath = req.headers['x-vercel-path'] || 
                     req.headers['x-invoke-path'] ||
                     req.headers['x-forwarded-uri'] ||
                     req.headers['x-original-url'];
  
  // If we have the original path from headers, use it
  if (vercelPath) {
    req.url = vercelPath;
  } else if (req.url === '/api/index' || req.url === '/api') {
    // Fallback: if no header and URL is the function path, 
    // the original might be in the query string or we need to handle differently
    // For now, if it's just /api, default to /health for testing
    if (req.url === '/api') {
      req.url = '/health';
    }
  }

  // Vercel provides Node.js http.IncomingMessage and http.ServerResponse
  // Fastify can handle these directly via the server
  app.server.emit('request', req, res);
  
  // Return a promise that resolves when the response is sent
  return new Promise((resolve) => {
    res.on('finish', resolve);
  });
}
