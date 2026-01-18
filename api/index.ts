// Vercel serverless function entry point
// Directly import and re-export the handler
import { buildApp } from '../src/api/index.js';

let app: any;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }

  // Vercel routes /api/* to this handler, but req.url might be /api/index
  // We need to get the original request path
  // Vercel stores original path in x-vercel-path header or we can use the originalUrl
  const originalUrl = req.originalUrl || req.url;
  
  // If req.url is the function path (/api/index), try to get original from headers
  if (req.url === '/api/index' || req.url === '/api') {
    // Check Vercel headers for original path
    const vercelPath = req.headers['x-vercel-path'] || 
                       req.headers['x-invoke-path'] ||
                       req.headers['x-forwarded-uri'] ||
                       req.headers['x-original-url'];
    
    if (vercelPath) {
      req.url = vercelPath;
    } else {
      // If no header, the path might be in the query or we need to use a different approach
      // For now, log to see what we're getting
      console.log('Original req.url:', req.url);
      console.log('Available headers:', Object.keys(req.headers).filter(k => k.toLowerCase().includes('path') || k.toLowerCase().includes('url')));
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
