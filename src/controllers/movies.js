// src/controllers/movies.js
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

// --- Каскадне оновлення (Серіал -> Сезон -> Епізоди) ---
const cascadeDown = async (mediaItem, finishDate, parentLogId) => {
    if (mediaItem.media_type === 'episode' || mediaItem.media_type === 'movie') return { ok: true };

    if (!process.env.TMDB_READ_TOKEN) {
        console.error('cascadeDown: TMDB_READ_TOKEN відсутній в .env');
        return { ok: false, error: 'TMDB_READ_TOKEN відсутній' };
    }

    const seriesTmdbId = getSeriesTmdbId(mediaItem.id);
    if (!seriesTmdbId) {
        console.error(`cascadeDown: Не знайдено TMDB ID серіалу для media_id ${mediaItem.id}`);
        return { ok: false, error: 'Не знайдено TMDB ID серіалу' };
    }

    if (mediaItem.media_type === 'season') {
        try {
            const url = `https://api.themoviedb.org/3/tv/${seriesTmdbId}/season/${mediaItem.season}?language=uk-UA`;
            const res = await fetch(url, { headers: getTmdbHeaders() });
            
            if (!res.ok) return { ok: false, error: `TMDB Error: ${res.status}` };
            
            const data = await res.json();
            if (!data.episodes) return { ok: false, error: 'TMDB не повернув список (episodes) епізодів' };

            const series = db.prepare('SELECT title FROM media_items WHERE id = ?').get(mediaItem.parent_id);
            const seriesTitle = series ? series.title : '';

            const transaction = db.transaction(() => {
                for (const ep of data.episodes) {
                    const epExtId = `episode_${ep.id}`;
                    let epMedia = db.prepare('SELECT id FROM media_items WHERE external_id = ?').get(epExtId);
                    
                    if (!epMedia) {
                        const title = `${seriesTitle} - S${mediaItem.season}E${ep.episode_number}`;
                        // Створюємо елемент без start_date та finish_date
                        const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, status, season, episode, parent_id, tmdb_id, poster_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title, ep.name, 'episode', epExtId, 'completed', mediaItem.season, ep.episode_number, mediaItem.id, ep.id, ep.still_path || null);
                        epMedia = { id: info.lastInsertRowid };
                    } else {
                        // Просто оновлюємо статус, залишаючи дати недоторканими
                        db.prepare(`UPDATE media_items SET status = 'completed' WHERE id = ?`).run(epMedia.id);
                    }

                    let existingLog;
                    if (parentLogId) {
                        existingLog = db.prepare('SELECT id FROM watch_logs WHERE media_id = ? AND parent_log_id = ?').get(epMedia.id, parentLogId);
                    } else {
                        existingLog = db.prepare(`SELECT id FROM watch_logs WHERE media_id = ? AND comment LIKE '%Автоматично відмічено%'`).get(epMedia.id);
                    }

                    if (!existingLog) {
                        const comment = parentLogId ? `Автоматично відмічено через перегляд батьківського елемента` : `Автоматично відмічено при завершенні сезону ${mediaItem.season}`;
                        // Додаємо лог з NULL замість дат
                        db.prepare(`INSERT INTO watch_logs (media_id, start_date, finish_date, comment, parent_log_id) VALUES (?, NULL, NULL, ?, ?)`).run(epMedia.id, comment, parentLogId || null);
                    }
                }
            });
            transaction();
            return { ok: true };
        } catch (e) {
            console.error('Помилка в cascadeDown:', e);
            return { ok: false, error: e.message };
        }
    } else if (mediaItem.media_type === 'series') {
        try {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${seriesTmdbId}?language=uk-UA`, { headers: getTmdbHeaders() });
            if (!res.ok) return { ok: false, error: `TMDB Error (series): ${res.status}` };
            
            const data = await res.json();
            if (!data.seasons) return { ok: false, error: 'TMDB не повернув список (seasons)' };

            for (const s of data.seasons.filter(s => s.season_number > 0)) {
                const seasonExtId = `season_${s.id}`;
                let seasonMedia = db.prepare('SELECT id FROM media_items WHERE external_id = ?').get(seasonExtId);
                
                if (!seasonMedia) {
                    const title = `${mediaItem.title} - ${s.name}`;
                    // Створюємо елемент без start_date та finish_date
                    const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, status, season, parent_id, tmdb_id, total_episodes, poster_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title, s.name, 'season', seasonExtId, 'completed', s.season_number, mediaItem.id, s.id, s.episode_count || 0, s.poster_path || null);
                    seasonMedia = { id: info.lastInsertRowid, season: s.season_number, parent_id: mediaItem.id, media_type: 'season' };
                } else {
                    // Просто оновлюємо статус, залишаючи дати недоторканими
                    db.prepare(`UPDATE media_items SET status = 'completed' WHERE id = ?`).run(seasonMedia.id);
                }

                let seasonLogId;
                let existingLog;
                if (parentLogId) {
                    existingLog = db.prepare('SELECT id FROM watch_logs WHERE media_id = ? AND parent_log_id = ?').get(seasonMedia.id, parentLogId);
                } else {
                    existingLog = db.prepare(`SELECT id FROM watch_logs WHERE media_id = ? AND comment LIKE '%Автоматично відмічено%'`).get(seasonMedia.id);
                }

                if (!existingLog) {
                    const comment = parentLogId ? `Автоматично відмічено через перегляд батьківського елемента` : `Автоматично відмічено при завершенні серіалу`;
                    // Додаємо лог з NULL замість дат
                    const info = db.prepare(`INSERT INTO watch_logs (media_id, start_date, finish_date, comment, parent_log_id) VALUES (?, NULL, NULL, ?, ?)`).run(seasonMedia.id, comment, parentLogId || null);
                    seasonLogId = info.lastInsertRowid;
                } else {
                    seasonLogId = existingLog.id;
                }

                await cascadeDown(seasonMedia, finishDate, seasonLogId);
            }
            return { ok: true };
        } catch (e) {
            console.error('Помилка в cascadeDown для серіалу:', e);
            return { ok: false, error: e.message };
        }
    }
};

// --- Каскадне оновлення статусу батьків (Епізод -> Сезон -> Серіал) ---
const cascadeUp = async (parentId) => {
    if (!parentId) return;
    const parent = db.prepare('SELECT * FROM media_items WHERE id = ?').get(parentId);
    if (!parent) return;

    const children = db.prepare('SELECT id, status FROM media_items WHERE parent_id = ?').all(parentId);
    const activeChildren = children.filter(c => c.status !== null);
    
    let newStatus = parent.status;
    let expectedChildren = parent.media_type === 'series' ? (parent.total_seasons || 0) : (parent.total_episodes || 0);

    const completedCount = activeChildren.filter(c => c.status === 'completed').length;
    const watchingCount = activeChildren.filter(c => c.status === 'watching').length;

    if (completedCount > 0 || watchingCount > 0) {
        if (expectedChildren > 0 && completedCount >= expectedChildren) {
            newStatus = 'completed';
        } else {
            newStatus = 'watching';
        }
    } else {
        if (parent.status === 'watching' || parent.status === 'completed') newStatus = null;
    }
    
    if (parent.status !== newStatus || newStatus === 'completed') {
        let startToSet = null;
        let finishToSet = null;
        let shouldAddLog = false;

        if (newStatus === 'completed') {
            // Отримуємо мінімальну дату старту та максимальну кінця з усіх дітей
            const stats = db.prepare(`
                SELECT MIN(w.start_date) as min_start, MAX(w.finish_date) as max_finish 
                FROM watch_logs w
                JOIN media_items m ON w.media_id = m.id
                WHERE m.parent_id = ?
            `).get(parentId);
            
            startToSet = stats.min_start || parent.start_date || null;
            finishToSet = stats.max_finish || parent.finish_date || null;

            if (parent.status !== 'completed') {
                shouldAddLog = true;
            }
        }

        db.prepare('UPDATE media_items SET status = ?, start_date = COALESCE(?, start_date), finish_date = COALESCE(?, finish_date) WHERE id = ?').run(newStatus, startToSet, finishToSet, parentId);
        
        if (shouldAddLog && finishToSet) {
            const existingLog = db.prepare('SELECT id FROM watch_logs WHERE media_id = ? AND finish_date = ?').get(parentId, finishToSet);
            if (!existingLog) {
                let comment = `Автоматично згенеровано (всі елементи переглянуто).`;
                if (startToSet && finishToSet) comment += ` Перегляд: ${startToSet} - ${finishToSet}`;
                db.prepare(`INSERT INTO watch_logs (media_id, start_date, finish_date, comment) VALUES (?, ?, ?, ?)`).run(parentId, startToSet, finishToSet, comment);
            }
        } else if (newStatus === 'completed') {
             // Оновлюємо дати в існуючому згенерованому логі
             const latestLog = db.prepare('SELECT id, comment FROM watch_logs WHERE media_id = ? ORDER BY finish_date DESC LIMIT 1').get(parentId);
             if (latestLog && latestLog.comment && latestLog.comment.includes('Автоматично згенеровано')) {
                 let comment = `Автоматично згенеровано (всі елементи переглянуто).`;
                 if (startToSet && finishToSet) comment += ` Перегляд: ${startToSet} - ${finishToSet}`;
                 db.prepare('UPDATE watch_logs SET start_date = ?, finish_date = ?, comment = ? WHERE id = ?').run(startToSet, finishToSet, comment, latestLog.id);
             }
        }
        
        await cascadeUp(parent.parent_id);
    }
};

const syncMediaStats = async (mediaId, triggerUp = true, triggerDown = true) => {
    const logs = db.prepare(`
        SELECT id, start_date, finish_date, rating 
        FROM watch_logs 
        WHERE media_id = ? 
        ORDER BY COALESCE(finish_date, start_date, created_at) DESC 
        LIMIT 1
    `).all(mediaId);

    const media = db.prepare('SELECT * FROM media_items WHERE id = ?').get(mediaId);
    if (!media) return;

    let newStatus = media.status;
    let finishDateToCascade = null;
    let latestLogId = null;

    if (logs.length > 0) {
        const latestLog = logs[0];
        latestLogId = latestLog.id;
        const isWatching = (media.media_type === 'season' || media.media_type === 'series') && latestLog.start_date && !latestLog.finish_date;
        newStatus = isWatching ? 'watching' : 'completed';
        finishDateToCascade = latestLog.finish_date || new Date().toISOString().split('T')[0];
        
        db.prepare(`
            UPDATE media_items 
            SET start_date = ?, finish_date = ?, rating = ?, status = ?
            WHERE id = ?
        `).run(
            latestLog.start_date || null, 
            latestLog.finish_date || null, 
            latestLog.rating !== undefined ? latestLog.rating : null, 
            newStatus, 
            mediaId
        );
    } else {
        newStatus = null;
        db.prepare(`
            UPDATE media_items 
            SET start_date = NULL, finish_date = NULL, rating = NULL,
                status = CASE WHEN status IN ('watching', 'completed') THEN NULL ELSE status END
            WHERE id = ?
        `).run(mediaId);
    }

    let cascadeResult = { ok: true };
    if (newStatus === 'completed' && triggerDown) {
        cascadeResult = await cascadeDown(media, finishDateToCascade, latestLogId);
    }
    if (triggerUp) {
        await cascadeUp(media.parent_id);
    }

    return cascadeResult;
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
    if (!item) return reply.code(404).send({ error: 'Елемент не знайдено' });
    
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
    
    if (!item) return reply.code(404).send({ error: 'Елемент не знайдено' });

    try { item.genres = item.genres ? JSON.parse(item.genres) : []; } catch (e) { item.genres = []; }
    return { data: item };
};

export const createMedia = async (request, reply) => {
    const data = request.body;
    const genresStr = data.genres ? JSON.stringify(data.genres) : null;

    if ((data.media_type === 'season' || data.media_type === 'episode') && !data.parent_id) {
        reply.code(400);
        return { error: `Для типу '${data.media_type}' обов'язкове поле parent_id (ідентифікатор батьківського елемента)` };
    }

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
        return { message: 'Елемент додано', data: newItem };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка при додаванні', details: error.message };
    }
};

export const updateMedia = async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    const existing = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    if (!existing) return reply.code(404).send({ error: 'Елемент не знайдено' });

    const allowedFields = ['title', 'original_title', 'media_type', 'status', 'rating', 'review', 'season', 'episode', 'total_seasons', 'total_episodes', 'genres', 'poster_path', 'backdrop_path', 'release_date', 'tmdb_id', 'imdb_id'];
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = ?`);
            values.push(key === 'genres' ? (value ? JSON.stringify(value) : null) : value);
        }
    }
    
    if (fields.length === 0) return { message: 'Немає полів для оновлення' };

    values.push(id);
    
    try {
        db.prepare(`UPDATE media_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        
        const updatedItem = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);

        if (updates.status !== undefined) {
            if (updatedItem.parent_id) {
                await cascadeUp(updatedItem.parent_id);
            }
            if (updates.status === 'completed') {
                await cascadeDown(updatedItem, updatedItem.finish_date || new Date().toISOString().split('T')[0], null);
            }
        }

        try { updatedItem.genres = updatedItem.genres ? JSON.parse(updatedItem.genres) : []; } catch(e){ updatedItem.genres=[]; }
        
        return { message: 'Елемент оновлено', data: updatedItem };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка при оновленні', details: error.message };
    }
};

export const deleteMedia = async (request, reply) => {
    const { id } = request.params;
    const info = db.prepare('DELETE FROM media_items WHERE id = ?').run(id);
    if (info.changes === 0) return reply.code(404).send({ error: 'Елемент не знайдено' });
    return { message: 'Елемент видалено' };
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
    if (!existingMedia) return reply.code(404).send({ error: 'Елемент не знайдено' });

    const cleanRating = (rating !== undefined && rating !== null && rating !== '') ? parseFloat(rating) : null;

    try {
        const info = db.prepare(`
            INSERT INTO watch_logs (media_id, start_date, finish_date, rating, comment)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, start_date || null, finish_date || null, cleanRating, comment || null);

        const cascadeResult = await syncMediaStats(id);
        
        reply.code(201);
        if (cascadeResult && cascadeResult.ok === false) {
            return {
                message: 'Запис створено, але виникли помилки при каскадному оновленні серій (перевірте логи сервера)',
                id: info.lastInsertRowid,
                warning: cascadeResult.error
            };
        }

        return { message: 'Запис створено', id: info.lastInsertRowid };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка при створенні запису', details: error.message };
    }
};

export const updateMediaLog = async (request, reply) => {
    const { log_id } = request.params;
    const { start_date, finish_date, rating, comment } = request.body;

    const existingLog = db.prepare('SELECT * FROM watch_logs WHERE id = ?').get(log_id);
    if (!existingLog) return reply.code(404).send({ error: 'Запис не знайдено' });

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

        const cascadeResult = await syncMediaStats(existingLog.media_id);
        
        if (cascadeResult && cascadeResult.ok === false) {
            return {
                message: 'Запис оновлено, але виникли помилки при каскадному оновленні (перевірте логи сервера)',
                warning: cascadeResult.error
            };
        }

        return { message: 'Запис оновлено' };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка при оновленні запису', details: error.message };
    }
};

export const deleteMediaLog = async (request, reply) => {
    const { log_id } = request.params;
    
    const log = db.prepare('SELECT id, media_id FROM watch_logs WHERE id = ?').get(log_id);
    if (!log) return reply.code(404).send({ error: 'Запис не знайдено' });

    // Отримуємо всіх нащадків логу (рекурсивно)
    const getDescendants = (parentId) => {
        const children = db.prepare('SELECT id, media_id FROM watch_logs WHERE parent_log_id = ?').all(parentId);
        let descendants = [...children];
        for (const child of children) {
            descendants = descendants.concat(getDescendants(child.id));
        }
        return descendants;
    };

    const descendants = getDescendants(log.id);
    const allLogsToDelete = [log, ...descendants];
    const logIds = allLogsToDelete.map(l => l.id);
    
    // Видаляємо лог і всі залежні логи
    db.prepare(`DELETE FROM watch_logs WHERE id IN (${logIds.map(()=>'?').join(',')})`).run(...logIds);

    // Усі media_id, яких торкнулося видалення
    const affectedMediaIds = [...new Set(allLogsToDelete.map(l => l.media_id))];
    
    // Синхронізуємо статуси (без каскадного спрацювання, щоб уникнути конфліктів у циклі)
    for (const mid of affectedMediaIds) {
        await syncMediaStats(mid, false, false); 
    }
    
    // Перераховуємо статуси батьків (від епізодів вгору)
    for (const mid of affectedMediaIds) {
         const m = db.prepare('SELECT parent_id FROM media_items WHERE id = ?').get(mid);
         if (m && m.parent_id) await cascadeUp(m.parent_id);
    }
      
    return { message: 'Запис та залежні елементи видалено' };
};