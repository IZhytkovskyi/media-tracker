import db from '../db/database.js';

const syncMediaStats = (mediaId) => {
    const latestLog = db.prepare(`
        SELECT watch_date, rating 
        FROM watch_logs 
        WHERE media_id = ? 
        ORDER BY watch_date DESC, created_at DESC 
        LIMIT 1
    `).get(mediaId);

    if (latestLog) {
        // Якщо є логи, встановлюємо статус completed і підтягуємо оцінку
        db.prepare(`
            UPDATE media_items 
            SET finish_date = ?, 
                rating = ?,
                status = 'completed'
            WHERE id = ?
        `).run(latestLog.watch_date, latestLog.rating, mediaId);
    } else {
        // Якщо видалені ВСІ логи — фільм втрачає статус completed, оцінку та дату завершення
        db.prepare(`
            UPDATE media_items 
            SET finish_date = NULL,
                rating = NULL,
                status = NULL
            WHERE id = ?
        `).run(mediaId);
    }
};

export const getAllMedia = async (request, reply) => {
    const { type, status, limit = 50, offset = 0 } = request.query;
    
    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);
    const safeLimit = isNaN(parsedLimit) ? 50 : parsedLimit;
    const safeOffset = isNaN(parsedOffset) ? 0 : parsedOffset;

    let query = 'SELECT * FROM media_items WHERE status IS NOT NULL';
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
    
    const formattedItems = items.map(item => ({
        ...item,
        genres: item.genres ? JSON.parse(item.genres) : []
    }));

    return { data: formattedItems };
};

export const getMediaById = async (request, reply) => {
    const { id } = request.params;
    const item = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    
    if (!item) {
        reply.code(404);
        return { error: 'Медіа не знайдено' };
    }
    
    item.genres = item.genres ? JSON.parse(item.genres) : [];
    return { data: item };
};

export const getMediaByTmdbId = async (request, reply) => {
    const { tmdbId } = request.params;
    const item = db.prepare('SELECT * FROM media_items WHERE tmdb_id = ?').get(tmdbId);
    
    if (!item) {
        reply.code(404);
        return { error: 'Медіа не знайдено' };
    }
    
    item.genres = item.genres ? JSON.parse(item.genres) : [];
    return { data: item };
};

export const createMedia = async (request, reply) => {
    const data = request.body;
    const genresStr = data.genres ? JSON.stringify(data.genres) : null;
    
    try {
        const stmt = db.prepare(`
            INSERT INTO media_items 
            (title, original_title, media_type, status, rating, review, 
             season, episode, total_seasons, total_episodes, genres, 
             poster_path, backdrop_path, release_date, tmdb_id, imdb_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const info = stmt.run(
            data.title, 
            data.original_title || null, 
            data.media_type, 
            data.status || null, 
            data.rating ?? null, 
            data.review || null, 
            data.season || 0, 
            data.episode || 0, 
            data.total_seasons || 0, 
            data.total_episodes || 0, 
            genresStr, 
            data.poster_path || null, 
            data.backdrop_path || null, 
            data.release_date || null, 
            data.tmdb_id || null, 
            data.imdb_id || null
        );
        
        const newItem = db.prepare('SELECT * FROM media_items WHERE id = ?').get(info.lastInsertRowid);
        if (newItem) newItem.genres = newItem.genres ? JSON.parse(newItem.genres) : [];

        reply.code(201);
        return { message: 'Створено успішно', data: newItem };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка створення', details: error.message };
    }
};

export const updateMedia = async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    const existing = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    if (!existing) {
        reply.code(404);
        return { error: 'Медіа не знайдено' };
    }

    const allowedFields = ['title', 'original_title', 'media_type', 'status', 'rating', 'review', 'season', 'episode', 'total_seasons', 'total_episodes', 'genres', 'poster_path', 'backdrop_path', 'release_date', 'tmdb_id', 'imdb_id'];
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = ?`);
            if (key === 'genres') {
                values.push(value ? JSON.stringify(value) : null);
            } else {
                values.push(value);
            }
        }
    }
    
    // Якщо немає полів (наприклад, пустий запит для рефрешу фронтенду), просто повертаємо 200
    if (fields.length === 0) return { message: 'Немає полів для оновлення' };
    values.push(id);
    
    try {
        db.prepare(`UPDATE media_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        
        // ВАЖЛИВО: syncMediaStats(id) звідси прибрано! 
        // Щоб ручна зміна статусу (В плани/Дивлюсь) не перетиралась відсутністю логів.

        const updatedItem = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
        if (updatedItem) updatedItem.genres = updatedItem.genres ? JSON.parse(updatedItem.genres) : [];
        return { message: 'Оновлено успішно', data: updatedItem };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка оновлення', details: error.message };
    }
};

export const deleteMedia = async (request, reply) => {
    const { id } = request.params;
    const info = db.prepare('DELETE FROM media_items WHERE id = ?').run(id);
    
    if (info.changes === 0) return reply.code(404).send({ error: 'Медіа не знайдено' });
    return { message: 'Видалено успішно' };
};

export const getMediaLogs = async (request, reply) => {
    const { id } = request.params;
    const logs = db.prepare(`
        SELECT * FROM watch_logs 
        WHERE media_id = ? 
        ORDER BY watch_date DESC, created_at DESC
    `).all(id);
    return { data: logs };
};

export const createMediaLog = async (request, reply) => {
    const { id } = request.params;
    let { watch_date, rating, comment } = request.body;

    const existingMedia = db.prepare('SELECT id FROM media_items WHERE id = ?').get(id);
    if (!existingMedia) return reply.code(404).send({ error: 'Медіа не знайдено' });

    if (!watch_date) watch_date = new Date().toISOString().split('T')[0];
    const cleanRating = (rating !== undefined && rating !== null && rating !== '') ? parseFloat(rating) : null;

    try {
        const info = db.prepare(`
            INSERT INTO watch_logs (media_id, watch_date, rating, comment)
            VALUES (?, ?, ?, ?)
        `).run(id, watch_date, cleanRating, comment || null);

        // Перераховуємо статус (фільм стане completed)
        syncMediaStats(id);
        
        reply.code(201);
        return { message: 'Лог створено', id: info.lastInsertRowid };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка створення логу', details: error.message };
    }
};

export const updateMediaLog = async (request, reply) => {
    const { log_id } = request.params;
    const { watch_date, rating, comment } = request.body;

    const existingLog = db.prepare('SELECT * FROM watch_logs WHERE id = ?').get(log_id);
    if (!existingLog) return reply.code(404).send({ error: 'Лог не знайдено' });

    const cleanRating = (rating !== undefined && rating !== null && rating !== '') ? parseFloat(rating) : null;
    const newDate = watch_date ? watch_date : existingLog.watch_date;
    const newComment = comment !== undefined ? comment : existingLog.comment;

    try {
        db.prepare(`
            UPDATE watch_logs 
            SET watch_date = ?, rating = ?, comment = ?
            WHERE id = ?
        `).run(newDate, cleanRating, newComment, log_id);

        syncMediaStats(existingLog.media_id);

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
    syncMediaStats(log.media_id);
    
    return { message: 'Лог видалено' };
};