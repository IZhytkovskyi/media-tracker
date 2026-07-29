import { searchTMDB, getTMDBDetails, getTMDBSeasonDetails, getTMDBEpisodeDetails } from '../controllers/tmdb.js';

export default async function tmdbRoutes(fastify, options) {
    // Пошук
    fastify.get('/tmdb/search', searchTMDB);
    
    // Деталі медіа
    fastify.get('/tmdb/details/:type/:id', getTMDBDetails);

    // Деталі сезону та серії
    fastify.get('/tmdb/details/series/:id/season/:season', getTMDBSeasonDetails);
    fastify.get('/tmdb/details/series/:id/season/:season/episode/:episode', getTMDBEpisodeDetails);
}