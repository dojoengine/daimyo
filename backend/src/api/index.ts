import express, { Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import jamsRoutes from './routes/jams.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApiServer(): Express {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/jams', jamsRoutes);

  // Serve React SPA static files in production
  const clientDist = path.resolve(__dirname, '../../../client/dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));

    // SPA catch-all: serve index.html for non-API routes
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });

    console.log(`Serving client from ${clientDist}`);
  }

  return app;
}

export function startApiServer(): Express {
  const app = createApiServer();
  const port = process.env.PORT || process.env.HTTP_PORT || 3000;

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });

  return app;
}
