import { searchTMDB, getTMDBDetails } from '../controllers/tmdb.js';

export default async function tmdbRoutes(fastify, options) {
    // Ендпоінт для базового пошуку
    fastify.get('/tmdb/search', searchTMDB);
    
    // Ендпоінт для отримання розширених деталей за ID
    // :type має бути 'movie' або 'series'
    fastify.get('/tmdb/details/:type/:id', getTMDBDetails);
}