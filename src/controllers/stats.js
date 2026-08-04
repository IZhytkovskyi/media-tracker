// src/controllers/stats.js
import db from '../db/database.js';

export const getGeneralStats = async (request, reply) => {
    try {
        // Загальна кількість унікальних переглянутих фільмів
        const movies = db.prepare(`
            SELECT COUNT(DISTINCT h.media_id) as count 
            FROM history h 
            JOIN media_items m ON h.media_id = m.id 
            WHERE m.media_type = 'movie'
        `).get();

        // Загальна кількість переглянутих епізодів (включаючи ревотчі)
        const episodes = db.prepare(`
            SELECT COUNT(h.id) as count 
            FROM history h 
            JOIN media_items m ON h.media_id = m.id 
            WHERE m.media_type = 'episode'
        `).get();

        // Отримання жанрів для побудови топу
        const watchedItems = db.prepare(`
            SELECT m.genres 
            FROM history h 
            JOIN media_items m ON h.media_id = m.id 
            GROUP BY m.id
        `).all();

        const genreCounts = {};
        watchedItems.forEach(item => {
            if (item.genres) {
                try {
                    const genres = JSON.parse(item.genres);
                    genres.forEach(g => {
                        genreCounts[g] = (genreCounts[g] || 0) + 1;
                    });
                } catch(e) {}
            }
        });

        // Сортуємо жанри від найпопулярнішого
        const topGenres = Object.entries(genreCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Активність за останні 6 місяців
        const activity = db.prepare(`
            SELECT strftime('%Y-%m', watched_at) as month, COUNT(*) as count
            FROM history
            WHERE watched_at >= date('now', 'start of month', '-5 months')
            GROUP BY month
            ORDER BY month ASC
        `).all();

        return {
            data: {
                movies: movies.count,
                episodes: episodes.count,
                topGenres,
                activity
            }
        };
    } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: 'Помилка отримання статистики', details: error.message };
    }
};