import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes.ts';
import { initDatabase } from './server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, 'dist');
const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

// In AI Studio dev environment, always use port 3000 and Vite dev middleware.
// In external VPS/PM2/aaPanel production, if dist exists or NODE_ENV=production, serve compiled dist.
const isProduction = !process.env.APPLET_ID && (process.env.NODE_ENV === 'production' || hasDist);
const PORT = (!process.env.APPLET_ID && isProduction)
  ? parseInt(process.env.PORT || process.env.APP_PORT || '3000', 10)
  : 3000;

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Non-blocking initialization of DB connection & migrations in background
  initDatabase().catch((err) => {
    console.warn('[DB] initDatabase warning:', err?.message || err);
  });

  // API Routes
  app.use('/api', apiRouter);

  // Frontend integration: Vite middleware in development or static dist in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Portal Komunitas running at http://localhost:${PORT} in ${isProduction ? 'PRODUCTION (serving dist/)' : 'DEVELOPMENT (Vite dev middleware)'}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to launch server:', err);
  process.exit(1);
});
