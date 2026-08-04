// server.js
import Fastify from 'fastify';
import dotenv from 'dotenv';
import db from './src/db/database.js';

import mediaRoutes from './src/routes/movies.js';
import tmdbRoutes from './src/routes/tmdb.js';
import listRoutes from './src/routes/lists.js';
import omdbRoutes from './src/routes/omdb.js';
import statsRoutes from './src/routes/stats.js';

dotenv.config();

const fastify = Fastify({
  logger: true
});

fastify.get('/api/health', async (request, reply) => {
  return { status: 'ok', message: 'Media Tracker API працює!' };
});

// Реєстрація роутів
fastify.register(mediaRoutes, { prefix: '/api' });
fastify.register(tmdbRoutes, { prefix: '/api/external' });
fastify.register(omdbRoutes, { prefix: '/api/external' });
fastify.register(listRoutes, { prefix: '/api' });
fastify.register(statsRoutes, { prefix: '/api' }); // Новий роут статистики

const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    await fastify.listen({ port: port, host: '0.0.0.0' });
    console.log(`Сервер запущено на http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();