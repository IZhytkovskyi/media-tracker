// src/controllers/settings.js
import db from '../db/database.js';
import fs from 'fs';
import path from 'path';

export const syncAllMetadata = async (request, reply) => {
    const token = process.env.TMDB_READ_TOKEN;
    if (!token) {
        reply.code(500);
        return { error: 'Не знайдено TMDB_READ_TOKEN у .env' };
    }

    const items = db.prepare("SELECT id, tmdb_id, media_type FROM media_items WHERE tmdb_id IS NOT NULL AND media_type IN ('movie', 'series')").all();
    
    let updatedCount = 0;
    
    for (const item of items) {
        try {
            const tmdbType = item.media_type === 'series' ? 'tv' : 'movie';
            const url = `https://api.themoviedb.org/3/${tmdbType}/${item.tmdb_id}?language=uk-UA`;
            
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            
            if (res.ok) {
                const tmdbData = await res.json();
                
                const genres = tmdbData.genres ? JSON.stringify(tmdbData.genres.map(g => g.name)) : null;
                const releaseDate = tmdbData.release_date || tmdbData.first_air_date || null;
                const totalSeasons = tmdbData.number_of_seasons || 0;
                const totalEpisodes = tmdbData.number_of_episodes || 0;
                const posterPath = tmdbData.poster_path || null;
                const backdropPath = tmdbData.backdrop_path || null;
                const runtime = item.media_type === 'series' ? (tmdbData.episode_run_time?.[0] || null) : (tmdbData.runtime || null);
                const countries = tmdbData.production_countries ? JSON.stringify(tmdbData.production_countries.map(c => c.iso_3166_1)) : null;
                
                db.prepare(`
                    UPDATE media_items 
                    SET genres = ?, release_date = ?, total_seasons = ?, total_episodes = ?, poster_path = ?, backdrop_path = ?, runtime = ?, production_countries = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(genres, releaseDate, totalSeasons, totalEpisodes, posterPath, backdropPath, runtime, countries, item.id);
                
                updatedCount++;
            }
        } catch (err) {
            request.log.error(`Помилка синхронізації ID ${item.id}: ${err.message}`);
        }
    }
    
    return { message: `Синхронізовано ${updatedCount} з ${items.length} записів.` };
};

export const exportDatabase = async (request, reply) => {
    try {
        const dbPath = process.env.DB_FILE || './src/db/tracker.db';
        const absolutePath = path.resolve(dbPath);
        
        if (!fs.existsSync(absolutePath)) {
            reply.code(404);
            return { error: 'Базу даних не знайдено' };
        }

        const stream = fs.createReadStream(absolutePath);
        const dateStr = new Date().toISOString().split('T')[0];
        
        reply.header('Content-Type', 'application/octet-stream');
        reply.header('Content-Disposition', `attachment; filename="tracker_backup_${dateStr}.db"`);
        
        return reply.send(stream);
    } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: 'Помилка експорту БД', details: error.message };
    }
};

export const importData = async (request, reply) => {
    const { items, source } = request.body;
    const token = process.env.TMDB_READ_TOKEN;

    if (!token) {
        reply.code(500);
        return { error: 'Не знайдено TMDB_READ_TOKEN у .env' };
    }

    let importedCount = 0;
    const errors = [];

    for (const item of items) {
        try {
            let tmdbId = item.tmdb_id;
            let mediaType = item.type || 'movie';

            // Якщо TMDB ID відсутній (наприклад, з Letterboxd), шукаємо за назвою
            if (!tmdbId && item.title) {
                let searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(item.title)}&language=uk-UA`;
                if (item.year) searchUrl += `&year=${item.year}`;
                
                const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
                const searchData = await searchRes.json();
                
                if (searchData.results && searchData.results.length > 0) {
                    tmdbId = searchData.results[0].id;
                }
            }

            if (!tmdbId) {
                errors.push(`Не знайдено TMDB ID для: ${item.title}`);
                continue;
            }

            // Отримуємо деталі з TMDB
            const tmdbType = mediaType === 'series' ? 'tv' : 'movie';
            const detailsUrl = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?language=uk-UA`;
            const detailsRes = await fetch(detailsUrl, { headers: { Authorization: `Bearer ${token}` } });
            const tmdbData = await detailsRes.json();

            if (!tmdbData.id) continue;

            const externalId = `${tmdbType}_${tmdbId}`;
            let localMedia = db.prepare('SELECT id FROM media_items WHERE external_id = ?').get(externalId);

            if (!localMedia) {
                const genres = tmdbData.genres ? JSON.stringify(tmdbData.genres.map(g => g.name)) : null;
                const info = db.prepare(`
                    INSERT INTO media_items (title, original_title, media_type, external_id, poster_path, backdrop_path, release_date, tmdb_id, genres, total_seasons, total_episodes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    tmdbData.title || tmdbData.name,
                    tmdbData.original_title || tmdbData.original_name,
                    mediaType,
                    externalId,
                    tmdbData.poster_path || null,
                    tmdbData.backdrop_path || null,
                    tmdbData.release_date || tmdbData.first_air_date || null,
                    tmdbData.id,
                    genres,
                    tmdbData.number_of_seasons || 0,
                    tmdbData.number_of_episodes || 0
                );
                localMedia = { id: info.lastInsertRowid };
            }

            // Додаємо запис в історію
            if (item.watched_at) {
                db.prepare('INSERT OR IGNORE INTO history (media_id, watched_at) VALUES (?, ?)').run(localMedia.id, item.watched_at);
                db.prepare('UPDATE media_items SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(localMedia.id);
            }

            // Оновлюємо рейтинг
            if (item.rating) {
                let normalizedRating = parseFloat(item.rating);
                if (source === 'trakt') normalizedRating = normalizedRating / 2; // Trakt використовує 10-бальну систему
                db.prepare('UPDATE media_items SET user_rating = ? WHERE id = ?').run(normalizedRating, localMedia.id);
            }

            importedCount++;
        } catch (err) {
            errors.push(`Помилка для ${item.title}: ${err.message}`);
        }
    }

    return { message: `Успішно імпортовано ${importedCount} записів.`, errors };
};