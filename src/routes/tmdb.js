// src/routes/tmdb.js
import { searchTMDB, getTMDBDetails, getTMDBSeasonDetails, getTMDBEpisodeDetails, getTMDBPersonDetails } from '../controllers/tmdb.js';

export default async function tmdbRoutes(fastify, options) {
    // Пошук
    fastify.get('/tmdb/search', searchTMDB);
    
    // Деталі
    fastify.get('/tmdb/details/:type/:id', getTMDBDetails);
    
    // Сезони та епізоди
    fastify.get('/tmdb/details/series/:id/season/:season', getTMDBSeasonDetails);
    fastify.get('/tmdb/details/series/:id/season/:season/episode/:episode', getTMDBEpisodeDetails);

    // НОВЕ: Актори / Творці
    fastify.get('/tmdb/person/:id', getTMDBPersonDetails);
}