// src/routes/omdb.js
import { getOMDbDetails } from '../controllers/omdb.js';

export default async function omdbRoutes(fastify, options) {
    // Отримання деталей за IMDb ID
    // Звернення буде за адресою: /api/external/omdb/details/tt1234567
    fastify.get('/omdb/details/:imdbId', getOMDbDetails);
}