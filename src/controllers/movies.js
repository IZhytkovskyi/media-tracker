import db from '../db/database.js';

const getTmdbHeaders = () => ({
    Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`
});

const getSeriesTmdbId = (mediaId) => {
    const media = db.prepare('SELECT * FROM media_items WHERE id = ?').get(mediaId);
    if (!media) return null;
    if (media.media_type === 'series') return media.tmdb_id;
    if (media.parent_id) return getSeriesTmdbId(media.parent_id);
    return null;
};

// --- КАСКАДНЕ ОНОВЛЕННЯ ВНИЗ (Сезон -> Серії) ---
const cascadeDown = async (mediaItem, finishDate) => {
    if (mediaItem.media_type === 'episode' || mediaItem.media_type === 'movie') return;

    const seriesTmdbId = getSeriesTmdbId(mediaItem.id);
    if (!seriesTmdbId) {
        console.error(`cascadeDown: Не знайдено TMDB ID серіалу для media_id ${mediaItem.id}`);
        return;
    }

    if (mediaItem.media_type === 'season') {
        try {
            const url = `https://api.themoviedb.org/3/tv/${seriesTmdbId}/season/${mediaItem.season}?language=uk-UA`;
            const res = await fetch(url, { headers: getTmdbHeaders() });
            
            if (!res.ok) {
                console.error(`cascadeDown TMDB Error: ${res.status} для URL: ${url}`);
                return;
            }
            
            const data = await res.json();
            if (!data.episodes) return;

            const series = db.prepare('SELECT title FROM media_items WHERE id = ?').get(mediaItem.parent_id);
            const seriesTitle = series ? series.title : '';

            const transaction = db.transaction(() => {
                for (const ep of data.episodes) {
                    const epExtId = `episode_${ep.id}`;
                    let epMedia = db.prepare('SELECT id, status FROM media_items WHERE external_id = ?').get(epExtId);
                    
                    if (!epMedia) {
                        const title = `${seriesTitle} - S${mediaItem.season}E${ep.episode_number}`;
                        const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, status, season, episode, parent_id, tmdb_id, finish_date, start_date, poster_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title, ep.name, 'episode', epExtId, 'completed', mediaItem.season, ep.episode_number, mediaItem.id, ep.id, finishDate, finishDate, ep.still_path || null);
                        epMedia = { id: info.lastInsertRowid };
                    } else {
                        db.prepare(`UPDATE media_items SET status = 'completed', finish_date = COALESCE(finish_date, ?), start_date = COALESCE(start_date, ?) WHERE id = ?`).run(finishDate, finishDate, epMedia.id);
                    }

                    // Додаємо лог для серії з коментарем
                    const existingLog = db.prepare('SELECT id FROM watch_logs WHERE media_id = ? AND finish_date = ?').get(epMedia.id, finishDate);
                    if (!existingLog && finishDate) {
                        const comment = `Переглянуто протягом ${mediaItem.season} сезону`;
                        db.prepare(`INSERT INTO watch_logs (media_id, start_date, finish_date, comment) VALUES (?, ?, ?, ?)`).run(epMedia.id, finishDate, finishDate, comment);
                    }
                }
            });
            transaction();
            console.log(`Успішно відмічено ${data.episodes.length} серій для сезону ${mediaItem.season}`);
        } catch (e) {
            console.error('Помилка при каскадному оновленні серій:', e);
        }
    } else if (mediaItem.media_type === 'series') {
        try {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${seriesTmdbId}?language=uk-UA`, { headers: getTmdbHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            if (!data.seasons) return;

            for (const s of data.seasons.filter(s => s.season_number > 0)) {
                const seasonExtId = `season_${s.id}`;
                let seasonMedia = db.prepare('SELECT id, status, parent_id, season FROM media_items WHERE external_id = ?').get(seasonExtId);
                
                if (!seasonMedia) {
                    const title = `${mediaItem.title} - ${s.name}`;
                    const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, status, season, parent_id, tmdb_id, total_episodes, finish_date, start_date, poster_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title, s.name, 'season', seasonExtId, 'completed', s.season_number, mediaItem.id, s.id, s.episode_count || 0, finishDate, finishDate, s.poster_path || null);
                    seasonMedia = { id: info.lastInsertRowid, season: s.season_number, parent_id: mediaItem.id, media_type: 'season' };
                } else {
                    db.prepare(`UPDATE media_items SET status = 'completed', finish_date = COALESCE(finish_date, ?), start_date = COALESCE(start_date, ?) WHERE id = ?`).run(finishDate, finishDate, seasonMedia.id);
                }

                const existingLog = db.prepare('SELECT id FROM watch_logs WHERE media_id = ? AND finish_date = ?').get(seasonMedia.id, finishDate);
                if (!existingLog && finishDate) {
                    const comment = `Переглянуто разом з усім серіалом`;
                    db.prepare(`INSERT INTO watch_logs (media_id, start_date, finish_date, comment) VALUES (?, ?, ?, ?)`).run(seasonMedia.id, finishDate, finishDate, comment);
                }

                await cascadeDown(seasonMedia, finishDate);
            }
        } catch (e) {
            console.error('Помилка при каскадному оновленні сезонів:', e);
        }
    }
};

// --- КАСКАДНЕ ОНОВЛЕННЯ ВГОРУ (Серія -> Сезон -> Серіал) ---
const cascadeUp = async (parentId, finishDate) => {
    if (!parentId) return;

    const parent = db.prepare('SELECT * FROM media_items WHERE id = ?').get(parentId);
    if (!parent) return;

    const children = db.prepare('SELECT status FROM media_items WHERE parent_id = ?').all(parentId);
    const activeChildren = children.filter(c => c.status !== null);
    
    let newStatus = parent.status;
    let shouldAddCompletedLog = false;
    let expectedChildren = 0;

    if (parent.media_type === 'series') expectedChildren = parent.total_seasons || 0;
    if (parent.media_type === 'season') expectedChildren = parent.total_episodes || 0;

    const completedCount = activeChildren.filter(c => c.status === 'completed').length;
    const watchingCount = activeChildren.filter(c => c.status === 'watching').length;

    if (completedCount > 0 || watchingCount > 0) {
        if (expectedChildren > 0 && completedCount >= expectedChildren) {
            newStatus = 'completed';
            if (parent.status !== 'completed') shouldAddCompletedLog = true;
        } else {
            newStatus = 'watching';
        }
    } else {
        if (parent.status === 'watching' || parent.status === 'completed') newStatus = null;
    }
    
    if (parent.status !== newStatus) {
        db.prepare('UPDATE media_items SET status = ? WHERE id = ?').run(newStatus, parentId);
        
        if (newStatus === 'completed' && shouldAddCompletedLog && finishDate) {
            const existingLog = db.prepare('SELECT id FROM watch_logs WHERE media_id = ? AND finish_date = ?').get(parentId, finishDate);
            if (!existingLog) {
                db.prepare(`INSERT INTO watch_logs (media_id, start_date, finish_date) VALUES (?, NULL, ?)`).run(parentId, finishDate);
            }
            db.prepare('UPDATE media_items SET finish_date = ? WHERE id = ?').run(finishDate, parentId);
        }
        
        await cascadeUp(parent.parent_id, finishDate);
    }
};

const syncMediaStats = async (mediaId) => {
    const logs = db.prepare(`
        SELECT start_date, finish_date, rating 
        FROM watch_logs 
        WHERE media_id = ? 
        ORDER BY COALESCE(finish_date, start_date, created_at) DESC 
        LIMIT 1
    `).all(mediaId);

    const media = db.prepare('SELECT * FROM media_items WHERE id = ?').get(mediaId);
    if (!media) return;

    let newStatus = media.status;
    let finishDateToCascade = null;

    if (logs.length > 0) {
        const latestLog = logs[0];
        const isWatching = (media.media_type === 'season' || media.media_type === 'series') && latestLog.start_date && !latestLog.finish_date;
        newStatus = isWatching ? 'watching' : 'completed';
        finishDateToCascade = latestLog.finish_date || new Date().toISOString().split('T')[0];
        
        db.prepare(`
            UPDATE media_items 
            SET start_date = COALESCE(?, start_date), 
                finish_date = COALESCE(?, finish_date), 
                rating = COALESCE(?, rating),
                status = ?
            WHERE id = ?
        `).run(latestLog.start_date || null, latestLog.finish_date || null, latestLog.rating, newStatus, mediaId);
    } else {
        newStatus = null;
        db.prepare(`
            UPDATE media_items 
            SET start_date = NULL, finish_date = NULL, rating = NULL,
                status = CASE WHEN status IN ('watching', 'completed') THEN NULL ELSE status END
            WHERE id = ?
        `).run(mediaId);
    }

    if (newStatus === 'completed') {
        await cascadeDown(media, finishDateToCascade);
    }
    await cascadeUp(media.parent_id, finishDateToCascade);
};

export const getAllMedia = async (request, reply) => {
    const { type, status, limit = 50, offset = 0 } = request.query;
    
    const safeLimit = isNaN(parseInt(limit)) ? 50 : parseInt(limit);
    const safeOffset = isNaN(parseInt(offset)) ? 0 : parseInt(offset);

    let query = "SELECT * FROM media_items WHERE status IS NOT NULL AND media_type IN ('movie', 'series', 'book', 'game', 'comic', 'manga')";
    const params = [];

    if (type && type !== 'all') {
        query += ' AND media_type = ?';
        params.push(type);
    }

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY COALESCE(finish_date, updated_at) DESC LIMIT ? OFFSET ?';
    params.push(safeLimit, safeOffset);

    const items = db.prepare(query).all(...params);
    
    const formattedItems = items.map(item => {
        let parsedGenres = [];
        try { parsedGenres = item.genres ? JSON.parse(item.genres) : []; } catch (e) { }
        return { ...item, genres: parsedGenres };
    });

    return { data: formattedItems };
};

export const getMediaChildren = async (request, reply) => {
    const { id } = request.params;

    const items = db.prepare('SELECT * FROM media_items WHERE parent_id = ?').all(id);

    const formattedItems = items.map(item => {
        let parsedGenres = [];
        try { parsedGenres = item.genres ? JSON.parse(item.genres) : []; } catch (e) { }
        return { ...item, genres: parsedGenres };
    });

    return { data: formattedItems };
};

export const getMediaById = async (request, reply) => {
    const { id } = request.params;
    const item = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);

    if (!item) return reply.code(404).send({ error: 'Запис не знайдено' });
    
    try { item.genres = item.genres ? JSON.parse(item.genres) : []; } catch (e) { item.genres = []; }
    return { data: item };
};

export const getMediaByExternalId = async (request, reply) => {
    const { externalId } = request.params;
    
    let item = db.prepare('SELECT * FROM media_items WHERE external_id = ?').get(externalId);
    
    if (!item) {
        const parts = externalId.split('_');
        if (parts.length === 2 && !isNaN(parts[1])) {
            const legacyType = parts[0] === 'tv' ? 'series' : parts[0];
            item = db.prepare('SELECT * FROM media_items WHERE tmdb_id = ? AND media_type = ?').get(parts[1], legacyType);
            if (item) {
                db.prepare('UPDATE media_items SET external_id = ? WHERE id = ?').run(externalId, item.id);
                item.external_id = externalId;
            }
        }
    }
    
    if (!item) return reply.code(404).send({ error: 'Запис не знайдено' });

    try { item.genres = item.genres ? JSON.parse(item.genres) : []; } catch (e) { item.genres = []; }
    return { data: item };
};

export const createMedia = async (request, reply) => {
    const data = request.body;
    const genresStr = data.genres ? JSON.stringify(data.genres) : null;
    
    try {
        const stmt = db.prepare(`
            INSERT INTO media_items 
            (title, original_title, media_type, external_id, parent_id, status, rating, review, 
             season, episode, total_seasons, total_episodes, genres, 
             poster_path, backdrop_path, release_date, tmdb_id, imdb_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const info = stmt.run(
            data.title, data.original_title || null, data.media_type, data.external_id, data.parent_id || null,
            data.status || null, data.rating ?? null, data.review || null, 
            data.season || 0, data.episode || 0, data.total_seasons || 0, data.total_episodes || 0, 
            genresStr, data.poster_path || null, data.backdrop_path || null, data.release_date || null, 
            data.tmdb_id || null, data.imdb_id || null
        );
        
        const newItem = db.prepare('SELECT * FROM media_items WHERE id = ?').get(info.lastInsertRowid);
        try { newItem.genres = newItem.genres ? JSON.parse(newItem.genres) : []; } catch(e){ newItem.genres=[]; }
        
        reply.code(201);
        return { message: 'Створено успішно', data: newItem };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка при створенні', details: error.message };
    }
};

export const updateMedia = async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    const existing = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    if (!existing) return reply.code(404).send({ error: 'Запис не знайдено' });

    const allowedFields = ['title', 'original_title', 'media_type', 'status', 'rating', 'review', 'season', 'episode', 'total_seasons', 'total_episodes', 'genres', 'poster_path', 'backdrop_path', 'release_date', 'tmdb_id', 'imdb_id'];
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = ?`);
            values.push(key === 'genres' ? (value ? JSON.stringify(value) : null) : value);
        }
    }
    
    if (fields.length === 0) return { message: 'Немає даних для оновлення' };

    values.push(id);
    
    try {
        db.prepare(`UPDATE media_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        
        const updatedItem = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);

        if (updates.status !== undefined) {
            if (updatedItem.parent_id) {
                await cascadeUp(updatedItem.parent_id, updatedItem.finish_date || new Date().toISOString().split('T')[0]);
            }
            if (updates.status === 'completed') {
                await cascadeDown(updatedItem, updatedItem.finish_date || new Date().toISOString().split('T')[0]);
            }
        }

        try { updatedItem.genres = updatedItem.genres ? JSON.parse(updatedItem.genres) : []; } catch(e){ updatedItem.genres=[]; }
        
        return { message: 'Оновлено успішно', data: updatedItem };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка при оновленні', details: error.message };
    }
};

export const deleteMedia = async (request, reply) => {
    const { id } = request.params;
    const info = db.prepare('DELETE FROM media_items WHERE id = ?').run(id);

    if (info.changes === 0) return reply.code(404).send({ error: 'Запис не знайдено' });
    return { message: 'Видалено успішно' };
};

export const getMediaLogs = async (request, reply) => {
    const { id } = request.params;

    const media = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    if (!media) return { data: [] };

    let targetIds = [media.id];

    if (media.parent_id) {
        targetIds.push(media.parent_id);
        const grandparent = db.prepare('SELECT parent_id FROM media_items WHERE id = ?').get(media.parent_id);
        if (grandparent && grandparent.parent_id) targetIds.push(grandparent.parent_id);
    }
    
    if (media.media_type === 'series') {
        const seasons = db.prepare('SELECT id FROM media_items WHERE parent_id = ?').all(media.id);
        targetIds.push(...seasons.map(s => s.id));

        const episodes = db.prepare('SELECT id FROM media_items WHERE parent_id IN (SELECT id FROM media_items WHERE parent_id = ?)').all(media.id);
        targetIds.push(...episodes.map(e => e.id));
    } else if (media.media_type === 'season') {
        const episodes = db.prepare('SELECT id FROM media_items WHERE parent_id = ?').all(media.id);
        targetIds.push(...episodes.map(e => e.id));
    }

    targetIds = [...new Set(targetIds.filter(Boolean))];

    const placeholders = targetIds.map(() => '?').join(',');
    const logs = db.prepare(`
        SELECT w.*, m.media_type, m.season, m.episode, m.title as media_title 
        FROM watch_logs w JOIN media_items m ON w.media_id = m.id
        WHERE m.id IN (${placeholders})
        ORDER BY COALESCE(w.finish_date, w.start_date, w.created_at) DESC
    `).all(...targetIds);

    return { data: logs };
};

export const createMediaLog = async (request, reply) => {
    const { id } = request.params;
    let { start_date, finish_date, rating, comment } = request.body;

    const existingMedia = db.prepare('SELECT id FROM media_items WHERE id = ?').get(id);
    if (!existingMedia) return reply.code(404).send({ error: 'Медіа не знайдено' });

    const cleanRating = (rating !== undefined && rating !== null && rating !== '') ? parseFloat(rating) : null;

    try {
        const info = db.prepare(`
            INSERT INTO watch_logs (media_id, start_date, finish_date, rating, comment)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, start_date || null, finish_date || null, cleanRating, comment || null);

        await syncMediaStats(id);
        
        reply.code(201);
        return { message: 'Лог створено', id: info.lastInsertRowid };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка створення логу', details: error.message };
    }
};

export const updateMediaLog = async (request, reply) => {
    const { log_id } = request.params;
    const { start_date, finish_date, rating, comment } = request.body;

    const existingLog = db.prepare('SELECT * FROM watch_logs WHERE id = ?').get(log_id);
    if (!existingLog) return reply.code(404).send({ error: 'Лог не знайдено' });

    const cleanRating = (rating !== undefined && rating !== null && rating !== '') ? parseFloat(rating) : null;
    const newStartDate = start_date !== undefined ? start_date : existingLog.start_date;
    const newFinishDate = finish_date !== undefined ? finish_date : existingLog.finish_date;
    const newComment = comment !== undefined ? comment : existingLog.comment;

    try {
        db.prepare(`
            UPDATE watch_logs 
            SET start_date = ?, finish_date = ?, rating = ?, comment = ?
            WHERE id = ?
        `).run(newStartDate || null, newFinishDate || null, cleanRating, newComment, log_id);

        await syncMediaStats(existingLog.media_id);
        
        return { message: 'Лог оновлено' };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка оновлення логу', details: error.message };
    }
};

export const deleteMediaLog = async (request, reply) => {
    const { log_id } = request.params;
    
    const log = db.prepare('SELECT media_id FROM watch_logs WHERE id = ?').get(log_id);
    if (!log) return reply.code(404).send({ error: 'Лог не знайдено' });
    
    db.prepare('DELETE FROM watch_logs WHERE id = ?').run(log_id);
    
    await syncMediaStats(log.media_id);
      
    return { message: 'Лог видалено' };
};