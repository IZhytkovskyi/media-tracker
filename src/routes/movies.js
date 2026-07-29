import { 
    getAllMedia, 
    getMediaById, 
    getMediaByTmdbId,
    createMedia, 
    updateMedia, 
    deleteMedia,
    getMediaLogs,
    createMediaLog,
    updateMediaLog,
    deleteMediaLog
} from '../controllers/movies.js';

const createMediaSchema = {
    body: {
        type: 'object',
        required: ['title', 'media_type'],
        properties: {
            title: { type: 'string', minLength: 1 },
            original_title: { type: ['string', 'null'] },
            media_type: { type: 'string', enum: ['movie', 'series'] },
            status: { type: 'string', enum: ['planned', 'watching', 'completed', 'dropped', 'on_hold'], default: 'planned' },
            rating: { type: ['number', 'null'], minimum: 0, maximum: 5 },
            review: { type: ['string', 'null'] },
            season: { type: 'integer', minimum: 0, default: 0 },
            episode: { type: 'integer', minimum: 0, default: 0 },
            total_seasons: { type: 'integer', minimum: 0, default: 0 },
            total_episodes: { type: 'integer', minimum: 0, default: 0 },
            genres: { type: 'array', items: { type: 'string' }, nullable: true },
            poster_path: { type: ['string', 'null'] },
            backdrop_path: { type: ['string', 'null'] },
            release_date: { type: ['string', 'null'] },
            tmdb_id: { type: ['integer', 'null'] },
            imdb_id: { type: ['string', 'null'] }
        }
    }
};

const updateMediaSchema = {
    body: {
        type: 'object',
        properties: {
            title: { type: 'string', minLength: 1 },
            original_title: { type: ['string', 'null'] },
            media_type: { type: 'string', enum: ['movie', 'series'] },
            status: { type: 'string', enum: ['planned', 'watching', 'completed', 'dropped', 'on_hold'] },
            rating: { type: ['number', 'null'], minimum: 0, maximum: 5 },
            review: { type: ['string', 'null'] },
            season: { type: 'integer', minimum: 0 },
            episode: { type: 'integer', minimum: 0 },
            total_seasons: { type: 'integer', minimum: 0 },
            total_episodes: { type: 'integer', minimum: 0 },
            genres: { type: 'array', items: { type: 'string' }, nullable: true },
            poster_path: { type: ['string', 'null'] },
            backdrop_path: { type: ['string', 'null'] },
            release_date: { type: ['string', 'null'] },
            tmdb_id: { type: ['integer', 'null'] },
            imdb_id: { type: ['string', 'null'] }
        },
        additionalProperties: false
    }
};

const logSchema = {
    body: {
        type: 'object',
        properties: {
            watch_date: { type: ['string', 'null'] }, // Формат YYYY-MM-DD
            rating: { type: ['number', 'null'], minimum: 0, maximum: 5 }
        }
    }
};

export default async function mediaRoutes(fastify, options) {
    // Медіа
    fastify.get('/media', getAllMedia);
    fastify.get('/media/:id', getMediaById);
    fastify.get('/media/tmdb/:tmdbId', getMediaByTmdbId); 
    fastify.post('/media', { schema: createMediaSchema }, createMedia);
    fastify.patch('/media/:id', { schema: updateMediaSchema }, updateMedia);
    fastify.delete('/media/:id', deleteMedia);

    // Історія переглядів (Логи)
    fastify.get('/media/:id/logs', getMediaLogs);
    fastify.post('/media/:id/logs', { schema: logSchema }, createMediaLog);
    fastify.patch('/media/logs/:log_id', { schema: logSchema }, updateMediaLog);
    fastify.delete('/media/logs/:log_id', deleteMediaLog);
}