// src/routes/settings.js
import { syncAllMetadata, exportDatabase, importData } from '../controllers/settings.js';

export default async function settingsRoutes(fastify, options) {
    fastify.post('/settings/sync-metadata', syncAllMetadata);
    fastify.get('/settings/export', exportDatabase);
    fastify.post('/settings/import', importData);
}