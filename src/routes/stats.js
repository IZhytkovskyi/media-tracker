// src/routes/stats.js
import { getGeneralStats } from '../controllers/stats.js';

export default async function statsRoutes(fastify, options) {
    fastify.get('/stats/general', getGeneralStats);
}