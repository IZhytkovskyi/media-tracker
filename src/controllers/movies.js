// src/controllers/movies.js
import db from '../db/database.js';

// === ДОПОМІЖНІ ФУНКЦІЇ ===

const getSeriesLocalId = (mediaId) => {
    const media = db.prepare('SELECT id, parent_id, media_type FROM media_items WHERE id = ?').get(mediaId);
    if (!media) return null;
    if (media.media_type === 'series') return media.id;
    if (media.parent_id) return getSeriesLocalId(media.parent_id);
    return null;
};

const touchUpdatedAt = (mediaId) => {
    if (!mediaId) return;
    db.prepare('UPDATE media_items SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(mediaId);
    const parentId = db.prepare('SELECT parent_id FROM media_items WHERE id = ?').get(mediaId)?.parent_id;
    if (parentId) touchUpdatedAt(parentId);
};

// ВИПРАВЛЕНО: Рекурсивне видалення з Watchlist (поведінка Trakt)
const removeFromWatchlistUp = (mediaId) => {
    if (!mediaId) return;
    db.prepare('DELETE FROM watchlist WHERE media_id = ?').run(mediaId);
    const media = db.prepare('SELECT parent_id FROM media_items WHERE id = ?').get(mediaId);
    if (media && media.parent_id) removeFromWatchlistUp(media.parent_id);
};

// Фонове оновлення кешу "Наступного епізоду"
const updateNextEpisodeCache = async (seriesId) => {
    try {
        const series = db.prepare('SELECT * FROM media_items WHERE id = ? AND media_type = "series"').get(seriesId);
        if (!series || !series.tmdb_id) return;

        const token = process.env.TMDB_READ_TOKEN;
        if (!token) return;

        // Шукаємо останній переглянутий епізод (це ідеально працює навіть для Rewatch)
        const lastEp = db.prepare(`
            SELECT m.season, m.episode 
            FROM history h 
            JOIN media_items m ON h.media_id = m.id 
            WHERE m.media_type = 'episode' AND m.parent_id IN (SELECT id FROM media_items WHERE parent_id = ? AND media_type = 'season')
            ORDER BY h.watched_at DESC LIMIT 1
        `).get(series.id);

        let nextS = lastEp ? lastEp.season : 1;
        let nextE = lastEp ? lastEp.episode + 1 : 1;

        let seasonRes = await fetch(`https://api.themoviedb.org/3/tv/${series.tmdb_id}/season/${nextS}?language=uk-UA`, { headers: { Authorization: `Bearer ${token}` } });
        
        if (seasonRes.status === 404 && lastEp) {
            db.prepare('UPDATE media_items SET next_episode_cache = NULL WHERE id = ?').run(series.id);
            return;
        }

        let seasonData = await seasonRes.json();

        // Перехід на наступний сезон
        if (seasonData.episodes && nextE > seasonData.episodes.length) {
            nextS += 1;
            nextE = 1;
            seasonRes = await fetch(`https://api.themoviedb.org/3/tv/${series.tmdb_id}/season/${nextS}?language=uk-UA`, { headers: { Authorization: `Bearer ${token}` } });
            
            if (!seasonRes.ok) {
                db.prepare('UPDATE media_items SET next_episode_cache = NULL WHERE id = ?').run(series.id);
                return;
            }
            seasonData = await seasonRes.json();
        }

        const epData = seasonData.episodes?.find(e => e.episode_number === nextE);
        
        if (epData) {
            const nextEpisodeObj = {
                season: nextS,
                episode: nextE,
                title: epData.name,
                poster_path: epData.still_path || seasonData.poster_path || series.backdrop_path || series.poster_path,
                tmdb_id: epData.id,
                season_tmdb_id: seasonData.id
            };
            db.prepare('UPDATE media_items SET next_episode_cache = ? WHERE id = ?').run(JSON.stringify(nextEpisodeObj), series.id);
        } else {
            db.prepare('UPDATE media_items SET next_episode_cache = NULL WHERE id = ?').run(series.id);
        }
    } catch (e) {
        console.error('Помилка оновлення кешу наступного епізоду:', e);
    }
};

// ВИПРАВЛЕНО: Перевіряє, чи всі діти переглянуті, і оновлює дату при Rewatch
const syncParentHistory = (parentId) => {
    if (!parentId) return;
    const parent = db.prepare('SELECT * FROM media_items WHERE id = ?').get(parentId);
    if (!parent) return;

    let isCompleted = false;
    let latestDate = null;

    if (parent.media_type === 'season') {
        const expectedCount = parent.total_episodes || 0;
        if (expectedCount > 0) {
            const stats = db.prepare(`
                SELECT COUNT(DISTINCT h.media_id) as count, MAX(h.watched_at) as last_watched
                FROM history h
                JOIN media_items m ON h.media_id = m.id
                WHERE m.parent_id = ? AND m.media_type = 'episode'
            `).get(parentId);
            
            isCompleted = stats.count > 0 && stats.count >= expectedCount;
            latestDate = stats.last_watched;
        }
    } else if (parent.media_type === 'series') {
        const expectedEpisodes = parent.total_episodes || 0;
        const expectedSeasons = parent.total_seasons || 0;

        const epStats = db.prepare(`
            SELECT COUNT(DISTINCT h.media_id) as count, MAX(h.watched_at) as last_watched
            FROM history h
            JOIN media_items m ON h.media_id = m.id
            WHERE m.parent_id IN (SELECT id FROM media_items WHERE parent_id = ? AND media_type = 'season' AND season > 0) AND m.media_type = 'episode'
        `).get(parentId);

        if (expectedEpisodes > 0) {
            isCompleted = epStats.count > 0 && epStats.count >= expectedEpisodes;
        } else if (expectedSeasons > 0) {
            const completedSeasonsCount = db.prepare(`
                SELECT COUNT(DISTINCT h.media_id) as count
                FROM history h
                JOIN media_items m ON h.media_id = m.id
                WHERE m.parent_id = ? AND m.media_type = 'season' AND m.season > 0
            `).get(parentId).count;

            isCompleted = completedSeasonsCount > 0 && completedSeasonsCount >= expectedSeasons;
        } else {
            const knownSeasons = db.prepare('SELECT id FROM media_items WHERE parent_id = ? AND media_type = "season" AND season > 0').all(parentId);
            if (knownSeasons.length > 0) {
                const placeholders = knownSeasons.map(() => '?').join(',');
                const completedSeasonsCount = db.prepare(`
                    SELECT COUNT(DISTINCT h.media_id) as count
                    FROM history h
                    WHERE h.media_id IN (${placeholders})
                `).get(...knownSeasons.map(s => s.id)).count;
                
                isCompleted = completedSeasonsCount > 0 && completedSeasonsCount === knownSeasons.length;
            }
        }
        latestDate = epStats.last_watched;
    }

    const historyRecord = db.prepare('SELECT id FROM history WHERE media_id = ?').get(parentId);

    if (isCompleted) {
        if (!historyRecord) {
            db.prepare('INSERT INTO history (media_id, watched_at) VALUES (?, COALESCE(?, CURRENT_TIMESTAMP))').run(parentId, latestDate);
            removeFromWatchlistUp(parentId);
            touchUpdatedAt(parentId);
        } else {
            // ОНОВЛЕНО: Якщо ми вже бачили цей сезон раніше, оновлюємо йому час, щоб він сплив угору!
            db.prepare('UPDATE history SET watched_at = COALESCE(?, CURRENT_TIMESTAMP) WHERE id = ?').run(latestDate, historyRecord.id);
            touchUpdatedAt(parentId);
        }
    } else {
        if (historyRecord) {
            db.prepare('DELETE FROM history WHERE media_id = ?').run(parentId);
            touchUpdatedAt(parentId);
        }
    }

    syncParentHistory(parent.parent_id);
};

// ВИПРАВЛЕНО: Паралельне завантаження (Promise.all) для запобігання підвисанням
const cascadeDownHistory = async (media, watchedAt) => {
    const token = process.env.TMDB_READ_TOKEN;
    if (!token) return;

    if (media.media_type === 'season') {
        const series = db.prepare('SELECT tmdb_id, title FROM media_items WHERE id = ?').get(media.parent_id);
        if (!series) return;

        try {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${series.tmdb_id}/season/${media.season}?language=uk-UA`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return;
            const data = await res.json();
            
            db.transaction(() => {
                for (const ep of data.episodes || []) {
                    const epExtId = `episode_${ep.id}`;
                    let epMedia = db.prepare('SELECT id FROM media_items WHERE external_id = ?').get(epExtId);
                    
                    if (!epMedia) {
                        const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, season, episode, parent_id, tmdb_id, poster_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                            `${series.title} - S${media.season}E${ep.episode_number}`, ep.name, 'episode', epExtId, media.season, ep.episode_number, media.id, ep.id, ep.still_path || null
                        );
                        epMedia = { id: info.lastInsertRowid };
                    }

                    const exists = db.prepare('SELECT id FROM history WHERE media_id = ?').get(epMedia.id);
                    if (!exists) {
                        db.prepare(`INSERT INTO history (media_id, watched_at) VALUES (?, COALESCE(?, CURRENT_TIMESTAMP))`).run(epMedia.id, watchedAt || null);
                    }
                    removeFromWatchlistUp(epMedia.id); // Видаляє з планів і серію, і сезон, і серіал
                }
            })();
            
            syncParentHistory(media.parent_id);
        } catch (e) { console.error("Помилка cascadeDownHistory для сезону:", e); }
        
    } else if (media.media_type === 'series') {
        try {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${media.tmdb_id}?language=uk-UA`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return;
            const data = await res.json();

            // ОНОВЛЕНО: Використовуємо Promise.all для асинхронного завантаження всіх сезонів одночасно
            const seasonPromises = (data.seasons || []).filter(s => s.season_number > 0).map(async (s) => {
                const seasonExtId = `season_${s.id}`;
                let seasonMedia = db.prepare('SELECT id FROM media_items WHERE external_id = ?').get(seasonExtId);
                
                if (!seasonMedia) {
                    const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, season, parent_id, tmdb_id, total_episodes, poster_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                        `${media.title} - ${s.name}`, s.name, 'season', seasonExtId, s.season_number, media.id, s.id, s.episode_count || 0, s.poster_path || null
                    );
                    seasonMedia = { id: info.lastInsertRowid, season: s.season_number, parent_id: media.id, media_type: 'season' };
                }

                const exists = db.prepare('SELECT id FROM history WHERE media_id = ?').get(seasonMedia.id);
                if (!exists) {
                    db.prepare(`INSERT INTO history (media_id, watched_at) VALUES (?, COALESCE(?, CURRENT_TIMESTAMP))`).run(seasonMedia.id, watchedAt || null);
                }
                removeFromWatchlistUp(seasonMedia.id);

                await cascadeDownHistory(seasonMedia, watchedAt); 
            });

            await Promise.all(seasonPromises);
        } catch (e) { console.error("Помилка cascadeDownHistory для серіалу:", e); }
    }
};

const cascadeDownClearHistory = (mediaId) => {
    const children = db.prepare('SELECT id, media_type FROM media_items WHERE parent_id = ?').all(mediaId);
    db.transaction(() => {
        for (const child of children) {
            db.prepare('DELETE FROM history WHERE media_id = ?').run(child.id);
            if (child.media_type === 'season' || child.media_type === 'series') {
                cascadeDownClearHistory(child.id);
            }
        }
    })();
};

// === API ЕНДПОІНТИ ===

export const getAllMedia = async (request, reply) => {
    const { type, status, limit = 50, offset = 0 } = request.query;
    const safeLimit = isNaN(parseInt(limit)) ? 50 : parseInt(limit);
    const safeOffset = isNaN(parseInt(offset)) ? 0 : parseInt(offset);

    let query = `
        SELECT m.*, 
            (SELECT COUNT(*) FROM history h WHERE h.media_id = m.id) as play_count,
            (SELECT 1 FROM watchlist w WHERE w.media_id = m.id) as in_watchlist,
            (SELECT h.watched_at FROM history h WHERE h.media_id = m.id ORDER BY h.watched_at DESC LIMIT 1) as last_watched_at
        FROM media_items m
        WHERE m.media_type IN ('movie', 'series', 'book', 'game', 'comic', 'manga')
    `;
    const params = [];

    if (type && type !== 'all') {
        query += ' AND m.media_type = ?'; params.push(type);
    }
    
    query += ' ORDER BY COALESCE(last_watched_at, m.updated_at) DESC LIMIT ? OFFSET ?';
    params.push(safeLimit, safeOffset);

    const items = db.prepare(query).all(...params);
    
    let formattedItems = items.map((item) => {
        let parsedGenres = [];
        try { parsedGenres = item.genres ? JSON.parse(item.genres) : []; } catch (e) { }

        let progress = null;
        let nextEpisode = null;

        if (item.media_type === 'series') {
            const seasons = db.prepare('SELECT id FROM media_items WHERE parent_id = ? AND media_type = "season"').all(item.id);
            let watchedCount = 0;
            
            if (seasons.length > 0) {
                const placeholders = seasons.map(() => '?').join(',');
                watchedCount = db.prepare(`
                    SELECT COUNT(DISTINCT m.id) as count 
                    FROM media_items m
                    JOIN history h ON h.media_id = m.id
                    WHERE m.media_type = 'episode' AND m.parent_id IN (${placeholders})
                `).get(...seasons.map(s => s.id)).count;
            }

            const isWatching = watchedCount > 0 && watchedCount < (item.total_episodes || 0);

            progress = {
                watched: watchedCount,
                total: item.total_episodes || 0,
                left: Math.max(0, (item.total_episodes || 0) - watchedCount),
                isWatching
            };

            if (item.next_episode_cache) {
                try { nextEpisode = JSON.parse(item.next_episode_cache); } catch(e) {}
            }
        }

        return { ...item, genres: parsedGenres, progress, nextEpisode };
    });

    if (status === 'planned') {
        formattedItems = formattedItems.filter(i => i.in_watchlist === 1);
    } else if (status === 'watching') {
        formattedItems = formattedItems.filter(i => i.progress?.isWatching);
    } else if (status === 'completed') {
        formattedItems = formattedItems.filter(i => (i.play_count > 0 && !i.progress?.isWatching) || i.play_count > 0);
    }

    return { data: formattedItems };
};

export const getUpcomingMedia = async (request, reply) => {
    try {
        const localUpcoming = db.prepare(`
            SELECT m.*, 
                 CASE 
                     WHEN m.media_type IN ('episode', 'season') THEN 
                        (SELECT s.tmdb_id FROM media_items s WHERE s.id = m.parent_id)
                     ELSE m.tmdb_id 
                 END as series_tmdb_id
            FROM media_items m
            WHERE m.release_date >= date('now', 'localtime') 
            ORDER BY m.release_date ASC
            LIMIT 15
        `).all();

        const combined = localUpcoming.map(item => {
            let parsedGenres = [];
            try { parsedGenres = typeof item.genres === 'string' ? JSON.parse(item.genres) : []; } catch (e) {}
            return { ...item, genres: parsedGenres };
        });
        
        return { data: combined };
    } catch (error) {
        return { error: 'Помилка отримання майбутніх релізів', details: error.message };
    }
};

export const getMediaChildren = async (request, reply) => {
    const { id } = request.params;
    const items = db.prepare(`
        SELECT m.*, 
        (SELECT COUNT(*) FROM history h WHERE h.media_id = m.id) as play_count 
        FROM media_items m 
        WHERE parent_id = ?
    `).all(id);
    
    const formattedItems = items.map(item => {
        let parsedGenres = [];
        try { parsedGenres = item.genres ? JSON.parse(item.genres) : []; } catch (e) { }
        return { ...item, genres: parsedGenres, isWatched: item.play_count > 0 };
    });
    return { data: formattedItems };
};

export const getMediaById = async (request, reply) => {
    const { id } = request.params;
    const item = db.prepare(`
        SELECT m.*, 
        (SELECT COUNT(*) FROM history h WHERE h.media_id = m.id) as play_count,
        (SELECT 1 FROM watchlist w WHERE w.media_id = m.id) as in_watchlist
        FROM media_items m WHERE m.id = ?
    `).get(id);
    
    if (!item) return reply.code(404).send({ error: 'Медіа не знайдено' });
    try { item.genres = item.genres ? JSON.parse(item.genres) : []; } catch (e) { item.genres = []; }
    return { data: item };
};

export const getMediaByExternalId = async (request, reply) => {
    const { externalId } = request.params;
    let item = db.prepare(`
        SELECT m.*, 
        (SELECT COUNT(*) FROM history h WHERE h.media_id = m.id) as play_count,
        (SELECT 1 FROM watchlist w WHERE w.media_id = m.id) as in_watchlist
        FROM media_items m WHERE external_id = ?
    `).get(externalId);
    
    if (!item) return reply.code(404).send({ error: 'Медіа не знайдено' });
    try { item.genres = item.genres ? JSON.parse(item.genres) : []; } catch (e) { item.genres = []; }
    return { data: item };
};

export const createMedia = async (request, reply) => {
    const data = request.body;
    const genresStr = data.genres ? JSON.stringify(data.genres) : null;

    try {
        const info = db.prepare(`
            INSERT INTO media_items (title, original_title, media_type, external_id, parent_id, user_rating, review, season, episode, total_seasons, total_episodes, genres, poster_path, backdrop_path, release_date, tmdb_id, imdb_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(data.title, data.original_title || null, data.media_type, data.external_id, data.parent_id || null, data.rating ?? null, data.review || null, data.season || 0, data.episode || 0, data.total_seasons || 0, data.total_episodes || 0, genresStr, data.poster_path || null, data.backdrop_path || null, data.release_date || null, data.tmdb_id || null, data.imdb_id || null);
        
        const newItem = db.prepare('SELECT * FROM media_items WHERE id = ?').get(info.lastInsertRowid);
        try { newItem.genres = newItem.genres ? JSON.parse(newItem.genres) : []; } catch(e){ newItem.genres=[]; }
        
        reply.code(201);
        return { message: 'Медіа створено', data: newItem };
    } catch (error) {
        reply.code(400); return { error: 'Помилка створення', details: error.message };
    }
};

export const updateMedia = async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    const existing = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    if (!existing) return reply.code(404).send({ error: 'Медіа не знайдено' });

    const allowedFields = ['title', 'original_title', 'user_rating', 'review', 'poster_path', 'backdrop_path'];
    const fields = []; const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    if (fields.length === 0) return { message: 'Немає даних для оновлення' };
    values.push(id);
    
    try {
        db.prepare(`UPDATE media_items SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
        const updatedItem = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
        try { updatedItem.genres = updatedItem.genres ? JSON.parse(updatedItem.genres) : []; } catch(e){ updatedItem.genres=[]; }
        return { message: 'Оновлено успішно', data: updatedItem };
    } catch (error) {
        reply.code(400); return { error: 'Помилка оновлення', details: error.message };
    }
};

export const deleteMedia = async (request, reply) => {
    const { id } = request.params;
    const info = db.prepare('DELETE FROM media_items WHERE id = ?').run(id);
    if (info.changes === 0) return reply.code(404).send({ error: 'Не знайдено' });
    return { message: 'Видалено' };
};

export const getHistory = async (request, reply) => {
    const { id } = request.params; 
    const logs = db.prepare(`
        SELECT h.*, m.media_type, m.season, m.episode, m.title as media_title 
        FROM history h 
        JOIN media_items m ON h.media_id = m.id 
        WHERE m.id = ? 
           OR m.parent_id = ?
           OR m.parent_id IN (SELECT id FROM media_items WHERE parent_id = ? AND media_type = 'season')
        ORDER BY h.watched_at DESC
    `).all(id, id, id);
    return { data: logs };
};

export const addToHistory = async (request, reply) => {
    const { id } = request.params; 
    const { watched_at } = request.body || {}; 

    const media = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    if (!media) return reply.code(404).send({ error: 'Медіа не знайдено' });

    try {
        const exists = db.prepare('SELECT id FROM history WHERE media_id = ?').get(id);
        if (!exists) {
            db.prepare(`INSERT INTO history (media_id, watched_at) VALUES (?, COALESCE(?, CURRENT_TIMESTAMP))`).run(id, watched_at || null);
        }

        if (media.media_type === 'season' || media.media_type === 'series') {
            await cascadeDownHistory(media, watched_at);
        }

        removeFromWatchlistUp(id);
        touchUpdatedAt(id);
        syncParentHistory(media.parent_id);

        const seriesId = getSeriesLocalId(id);
        if (seriesId) updateNextEpisodeCache(seriesId).catch(console.error);

        reply.code(201);
        return { message: 'Додано в історію' };
    } catch (error) {
        console.error(error);
        reply.code(400); return { error: 'Помилка збереження', details: error.message };
    }
};

export const removeFromHistory = async (request, reply) => {
    const { id } = request.params; 
    
    db.prepare('DELETE FROM history WHERE media_id = ?').run(id);

    const media = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    if (media && (media.media_type === 'series' || media.media_type === 'season')) {
        cascadeDownClearHistory(media.id);
    }

    touchUpdatedAt(id);
    
    if (media) syncParentHistory(media.parent_id);

    const seriesId = getSeriesLocalId(id);
    if (seriesId) updateNextEpisodeCache(seriesId).catch(console.error);
    
    return { message: 'Видалено з історії' };
};

export const removeHistoryRecord = async (request, reply) => {
    const { history_id } = request.params;
    
    const record = db.prepare('SELECT media_id FROM history WHERE id = ?').get(history_id);
    if (!record) return reply.code(404).send({ error: 'Запис не знайдено' });

    db.prepare('DELETE FROM history WHERE id = ?').run(history_id);

    const media = db.prepare('SELECT * FROM media_items WHERE id = ?').get(record.media_id);
    
    if (media && (media.media_type === 'series' || media.media_type === 'season')) {
        cascadeDownClearHistory(media.id);
    }

    if (media && media.parent_id) {
        syncParentHistory(media.parent_id);
    }
    
    const seriesId = getSeriesLocalId(record.media_id);
    if (seriesId) updateNextEpisodeCache(seriesId).catch(console.error);

    return { message: 'Перегляд видалено' };
};

export const updateHistoryRecord = async (request, reply) => {
    const { history_id } = request.params;
    const { watched_at } = request.body;

    if (!watched_at) return reply.code(400).send({ error: 'Потрібна дата та час' });

    const record = db.prepare('SELECT media_id FROM history WHERE id = ?').get(history_id);
    if (!record) return reply.code(404).send({ error: 'Запис не знайдено' });

    try {
        db.prepare('UPDATE history SET watched_at = ? WHERE id = ?').run(watched_at, history_id);
        touchUpdatedAt(record.media_id);

        const media = db.prepare('SELECT * FROM media_items WHERE id = ?').get(record.media_id);
        if (media && media.parent_id) {
            syncParentHistory(media.parent_id);
        }
        
        const seriesId = getSeriesLocalId(record.media_id);
        if (seriesId) updateNextEpisodeCache(seriesId).catch(console.error);

        return { message: 'Перегляд оновлено' };
    } catch (error) {
        reply.code(400); return { error: 'Помилка оновлення', details: error.message };
    }
};

export const watchNextEpisode = async (request, reply) => {
    const { id } = request.params;
    const series = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    if (!series || series.media_type !== 'series') return reply.code(400).send({ error: 'Серіал не знайдено' });

    let nextEpCache = null;
    try { nextEpCache = JSON.parse(series.next_episode_cache); } catch(e) {}

    if (!nextEpCache) {
        updateNextEpisodeCache(series.id).catch(console.error);
        return reply.code(400).send({ error: 'Наступний епізод ще не закешовано. Оновіть сторінку через пару секунд.' });
    }

    let seasonExtId = `season_${nextEpCache.season_tmdb_id}`;
    let seasonMedia = db.prepare('SELECT id FROM media_items WHERE external_id = ?').get(seasonExtId);
    if (!seasonMedia) {
        const info = db.prepare(`INSERT INTO media_items (title, media_type, external_id, season, parent_id, tmdb_id) VALUES (?, ?, ?, ?, ?, ?)`).run(
            `${series.title} - Сезон ${nextEpCache.season}`, 'season', seasonExtId, nextEpCache.season, series.id, nextEpCache.season_tmdb_id
        );
        seasonMedia = { id: info.lastInsertRowid };
    }

    let epExtId = `episode_${nextEpCache.tmdb_id}`;
    let epMedia = db.prepare('SELECT id FROM media_items WHERE external_id = ?').get(epExtId);
    if (!epMedia) {
        const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, season, episode, parent_id, tmdb_id, poster_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            `${series.title} - S${nextEpCache.season}E${nextEpCache.episode}`, nextEpCache.title, 'episode', epExtId, nextEpCache.season, nextEpCache.episode, seasonMedia.id, nextEpCache.tmdb_id, nextEpCache.poster_path
        );
        epMedia = { id: info.lastInsertRowid };
    }

    db.prepare(`INSERT INTO history (media_id) VALUES (?)`).run(epMedia.id);
    removeFromWatchlistUp(epMedia.id);
    
    touchUpdatedAt(epMedia.id);
    syncParentHistory(epMedia.parent_id);
    updateNextEpisodeCache(series.id).catch(console.error);

    return { message: 'Епізод успішно відмічено!' };
};

export const toggleWatchlist = async (request, reply) => {
    const { id } = request.params; 
    
    const existing = db.prepare('SELECT id FROM watchlist WHERE media_id = ?').get(id);
    if (existing) {
        db.prepare('DELETE FROM watchlist WHERE media_id = ?').run(id);
        touchUpdatedAt(id);
        return { message: 'Видалено з Watchlist', in_watchlist: false };
    } else {
        db.prepare('INSERT INTO watchlist (media_id) VALUES (?)').run(id);
        touchUpdatedAt(id);
        return { message: 'Додано у Watchlist', in_watchlist: true };
    }
};