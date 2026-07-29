import db from '../db/database.js';

export const getAllMedia = async (request, reply) => {
    // Додав підтримку пагінації: limit та offset
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
    
    // Парсимо JSON-рядок жанрів назад у масив для віддачі на фронтенд
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
        return { error: 'Запис не знайдено' };
    }
    
    item.genres = item.genres ? JSON.parse(item.genres) : [];
    return { data: item };
};

export const createMedia = async (request, reply) => {
    const data = request.body;
    
    // Перетворюємо масив жанрів у JSON-рядок для SQLite
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
        return { message: 'Створено успішно', id: info.lastInsertRowid };
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
        return { error: 'Запис не знайдено' };
    }

    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        // Якщо оновлюємо жанри, перетворюємо масив на JSON
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
        return { message: 'Оновлено успішно', id };
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
        return { error: 'Запис не знайдено' };
    }
    
    return { message: 'Видалено успішно' };
};