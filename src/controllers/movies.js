import db from '../db/database.js';

export const getAllMedia = async (request, reply) => {
    const { type, status, limit = 50, offset = 0 } = request.query;
    
    let query = 'SELECT * FROM media_items';
    const params = [];
    const conditions = [];

    if (type) {
        conditions.push('media_type = ?');
        params.push(type);
    }
    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

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
        return { error: 'Не знайдено' };
    }
    
    item.genres = item.genres ? JSON.parse(item.genres) : [];
    return { data: item };
};

export const getMediaByTmdbId = async (request, reply) => {
    const { tmdbId } = request.params;
    const item = db.prepare('SELECT * FROM media_items WHERE tmdb_id = ?').get(tmdbId);
    
    if (!item) {
        reply.code(404);
        return { error: 'Не знайдено' };
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
            data.title, data.original_title || null, data.media_type, data.status || 'planned', 
            data.rating || null, data.review || null, data.season || 0, data.episode || 0, 
            data.total_seasons || 0, data.total_episodes || 0, genresStr, 
            data.poster_path || null, data.backdrop_path || null, data.release_date || null, 
            data.tmdb_id || null, data.imdb_id || null
        );
        
        reply.code(201);
        return { message: 'Успішно створено', id: info.lastInsertRowid };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка збереження', details: error.message };
    }
};

export const updateMedia = async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    const existing = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    if (!existing) {
        reply.code(404);
        return { error: 'Не знайдено' };
    }

    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        if (key === 'genres') {
            values.push(JSON.stringify(value));
        } else {
            values.push(value);
        }
    }
    
    if (fields.length === 0) {
        return { message: 'Немає даних для оновлення' };
    }

    values.push(id);
    
    try {
        const stmt = db.prepare(`UPDATE media_items SET ${fields.join(', ')} WHERE id = ?`);
        stmt.run(...values);
        return { message: 'Оновлено', id };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка оновлення', details: error.message };
    }
};

export const deleteMedia = async (request, reply) => {
    const { id } = request.params;
    const info = db.prepare('DELETE FROM media_items WHERE id = ?').run(id);
    
    if (info.changes === 0) {
        reply.code(404);
        return { error: 'Не знайдено' };
    }
    
    return { message: 'Видалено' };
};

// --- ЛОГІКА ІСТОРІЇ ПЕРЕГЛЯДІВ (LOGS) ---

export const getMediaLogs = async (request, reply) => {
    const { id } = request.params;
    // Сортуємо: спочатку за watch_date (найновіші), а якщо дати рівні/відсутні - за created_at
    const logs = db.prepare(`
        SELECT * FROM watch_logs 
        WHERE media_id = ? 
        ORDER BY watch_date DESC, created_at DESC
    `).all(id);
    
    return { data: logs };
};

export const createMediaLog = async (request, reply) => {
    const { id } = request.params;
    const { watch_date, rating } = request.body;

    // Перевірка існування медіа
    const existingMedia = db.prepare('SELECT id FROM media_items WHERE id = ?').get(id);
    if (!existingMedia) {
        reply.code(404);
        return { error: 'Медіа не знайдено' };
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO watch_logs (media_id, watch_date, rating)
            VALUES (?, ?, ?)
        `);
        const info = stmt.run(id, watch_date || null, rating !== undefined ? rating : null);
        
        reply.code(201);
        return { message: 'Лог створено', id: info.lastInsertRowid };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка створення логу', details: error.message };
    }
};

export const updateMediaLog = async (request, reply) => {
    const { log_id } = request.params;
    const { watch_date, rating } = request.body;

    const existingLog = db.prepare('SELECT * FROM watch_logs WHERE id = ?').get(log_id);
    if (!existingLog) {
        reply.code(404);
        return { error: 'Лог не знайдено' };
    }

    try {
        // Дозволяємо оновлювати або лише дату, або лише оцінку, або все разом
        const newDate = watch_date !== undefined ? watch_date : existingLog.watch_date;
        const newRating = rating !== undefined ? rating : existingLog.rating;

        const stmt = db.prepare(`
            UPDATE watch_logs 
            SET watch_date = ?, rating = ? 
            WHERE id = ?
        `);
        stmt.run(newDate, newRating, log_id);

        return { message: 'Лог оновлено' };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка оновлення логу', details: error.message };
    }
};

export const deleteMediaLog = async (request, reply) => {
    const { log_id } = request.params;
    const info = db.prepare('DELETE FROM watch_logs WHERE id = ?').run(log_id);
    
    if (info.changes === 0) {
        reply.code(404);
        return { error: 'Лог не знайдено' };
    }
    
    return { message: 'Лог видалено' };
};