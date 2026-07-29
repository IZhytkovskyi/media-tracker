import { 
    getAllMedia, 
    getMediaById, 
    createMedia, 
    updateMedia, 
    deleteMedia 
} from '../controllers/movies.js';

// Оновлена схема для СТВОРЕННЯ запису
const createMediaSchema = {
    body: {
        type: 'object',
        required: ['title', 'media_type'], 
        properties: {
            title: { type: 'string', minLength: 1 },
            original_title: { type: 'string' },
            media_type: { type: 'string', enum: ['movie', 'series'] },
            status: { type: 'string', enum: ['planned', 'watching', 'completed', 'dropped', 'on_hold'], default: 'planned' },
            rating: { type: 'number', minimum: 0, maximum: 5 },
            review: { type: 'string' },
            season: { type: 'integer', minimum: 0, default: 0 },
            episode: { type: 'integer', minimum: 0, default: 0 },
            total_seasons: { type: 'integer', minimum: 0, default: 0 },
            total_episodes: { type: 'integer', minimum: 0, default: 0 },
            genres: { 
                type: 'array', 
                items: { type: 'string' } // Очікуємо масив рядків
            },
            poster_path: { type: 'string' },
            backdrop_path: { type: 'string' },
            release_date: { type: 'string' },
            tmdb_id: { type: 'integer' },
            imdb_id: { type: 'string' }
        }
    }
};

// Оновлена схема для ОНОВЛЕННЯ запису
const updateMediaSchema = {
    body: {
        type: 'object',
        properties: {
            title: { type: 'string', minLength: 1 },
            original_title: { type: 'string' },
            media_type: { type: 'string', enum: ['movie', 'series'] },
            status: { type: 'string', enum: ['planned', 'watching', 'completed', 'dropped', 'on_hold'] },
            rating: { type: 'number', minimum: 0, maximum: 5 },
            review: { type: 'string' },
            season: { type: 'integer', minimum: 0 },
            episode: { type: 'integer', minimum: 0 },
            total_seasons: { type: 'integer', minimum: 0 },
            total_episodes: { type: 'integer', minimum: 0 },
            genres: { type: 'array', items: { type: 'string' } },
            poster_path: { type: 'string' },
            backdrop_path: { type: 'string' },
            release_date: { type: 'string' },
            tmdb_id: { type: 'integer' },
            imdb_id: { type: 'string' }
        },
        additionalProperties: false
    }
};

export default async function mediaRoutes(fastify, options) {
    fastify.get('/media', getAllMedia);
    fastify.get('/media/:id', getMediaById);
    fastify.post('/media', { schema: createMediaSchema }, createMedia);
    fastify.patch('/media/:id', { schema: updateMediaSchema }, updateMedia);
    fastify.delete('/media/:id', deleteMedia);
}