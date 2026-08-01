// src/controllers/lists.js
import db from '../db/database.js';

export const getAllLists = async (request, reply) => {
    try {
        const lists = db.prepare('SELECT * FROM custom_lists ORDER BY updated_at DESC').all();
        
        // Підраховуємо кількість елементів у кожному списку
        const listsWithCounts = lists.map(list => {
            const count = db.prepare('SELECT COUNT(*) as count FROM list_items WHERE list_id = ?').get(list.id).count;
            return { ...list, item_count: count };
        });
        
        return { data: listsWithCounts };
    } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: 'Помилка отримання списків', details: error.message };
    }
};

export const createList = async (request, reply) => {
    const { name, description } = request.body;
    try {
        const info = db.prepare('INSERT INTO custom_lists (name, description) VALUES (?, ?)')
            .run(name, description || null);
        const newList = db.prepare('SELECT * FROM custom_lists WHERE id = ?').get(info.lastInsertRowid);
        
        reply.code(201);
        return { message: 'Список успішно створено', data: { ...newList, item_count: 0 } };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка при створенні списку', details: error.message };
    }
};

export const updateList = async (request, reply) => {
    const { id } = request.params;
    const { name, description } = request.body;
    try {
        const existing = db.prepare('SELECT * FROM custom_lists WHERE id = ?').get(id);
        if (!existing) return reply.code(404).send({ error: 'Список не знайдено' });

        db.prepare('UPDATE custom_lists SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?')
            .run(name !== undefined ? name : null, description !== undefined ? description : null, id);
        
        const updatedList = db.prepare('SELECT * FROM custom_lists WHERE id = ?').get(id);
        const count = db.prepare('SELECT COUNT(*) as count FROM list_items WHERE list_id = ?').get(id).count;

        return { message: 'Список оновлено', data: { ...updatedList, item_count: count } };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка оновлення списку', details: error.message };
    }
};

export const deleteList = async (request, reply) => {
    const { id } = request.params;
    try {
        const info = db.prepare('DELETE FROM custom_lists WHERE id = ?').run(id);
        if (info.changes === 0) return reply.code(404).send({ error: 'Список не знайдено' });
        return { message: 'Список видалено' };
    } catch (error) {
        reply.code(500);
        return { error: 'Помилка видалення списку', details: error.message };
    }
};

// --- Робота з елементами списків ---

export const getListItems = async (request, reply) => {
    const { id } = request.params;
    try {
        const items = db.prepare(`
            SELECT m.* FROM media_items m
            JOIN list_items li ON m.id = li.media_id
            WHERE li.list_id = ?
            ORDER BY li.added_at DESC
        `).all(id);
        
        return { data: items };
    } catch (error) {
        reply.code(500);
        return { error: 'Помилка отримання медіа списку', details: error.message };
    }
};

export const addMediaToList = async (request, reply) => {
    const { id } = request.params;
    const { media_id } = request.body;
    try {
        db.prepare('INSERT OR IGNORE INTO list_items (list_id, media_id) VALUES (?, ?)').run(id, media_id);
        reply.code(201);
        return { message: 'Медіа додано до списку' };
    } catch (error) {
        reply.code(400);
        return { error: 'Помилка додавання', details: error.message };
    }
};

export const removeMediaFromList = async (request, reply) => {
    const { id, media_id } = request.params;
    try {
        db.prepare('DELETE FROM list_items WHERE list_id = ? AND media_id = ?').run(id, media_id);
        return { message: 'Медіа видалено зі списку' };
    } catch (error) {
        reply.code(500);
        return { error: 'Помилка видалення', details: error.message };
    }
};

export const getListsForMedia = async (request, reply) => {
    const { media_id } = request.params;
    try {
        const lists = db.prepare('SELECT list_id FROM list_items WHERE media_id = ?').all(media_id);
        return { data: lists.map(l => l.list_id) };
    } catch (error) {
        reply.code(500);
        return { error: 'Помилка', details: error.message };
    }
};