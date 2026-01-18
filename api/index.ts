// Vercel serverless function entry point
// Directly import and re-export the handler
import { buildApp } from '../src/api/index.js';

let app: any;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }

  // Vercel provides Node.js http.IncomingMessage and http.ServerResponse
  // Fastify can handle these directly via the server
  app.server.emit('request', req, res);
  
  // Return a promise that resolves when the response is sent
  return new Promise((resolve) => {
    res.on('finish', resolve);
  });
}
