// src/routes/movies.js
import { 
    getAllMedia, getMediaById, getMediaByExternalId, getMediaChildren,
    createMedia, updateMedia, deleteMedia, getUpcomingMedia,
    getHistory, addToHistory, removeFromHistory, removeHistoryRecord, updateHistoryRecord, toggleWatchlist, watchNextEpisode
} from '../controllers/movies.js';

export default async function mediaRoutes(fastify, options) {
    fastify.get('/media', getAllMedia);
    fastify.get('/media/upcoming', getUpcomingMedia); 
    fastify.get('/media/:id', getMediaById);
    fastify.get('/media/external/:externalId', getMediaByExternalId);
    fastify.get('/media/:id/children', getMediaChildren);
    
    fastify.post('/media', createMedia);
    fastify.post('/media/:id/watch-next', watchNextEpisode); 
    fastify.patch('/media/:id', updateMedia);
    fastify.delete('/media/:id', deleteMedia);
    
    fastify.get('/media/:id/history', getHistory);
    fastify.post('/media/:id/history', addToHistory);
    fastify.delete('/media/:id/history', removeFromHistory); 
    
    fastify.patch('/history/:history_id', updateHistoryRecord); // Новий роут для редагування
    fastify.delete('/history/:history_id', removeHistoryRecord); 

    fastify.post('/media/:id/watchlist', toggleWatchlist);
}