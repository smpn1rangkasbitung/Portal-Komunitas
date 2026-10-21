import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes.ts';
import { initDatabase } from './server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AI Studio requires dev server on port 3000. In VPS/PM2 production, allows custom PORT or APP_PORT.
const PORT = parseInt(process.env.APP_PORT || (process.env.APPLET_ID ? '3000' : (process.env.PORT || '3000')), 10);
const isProduction = process.env.NODE_ENV === 'production';

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
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Portal Komunitas & WhatsApp Gateway running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to launch server:', err);
  process.exit(1);
});
