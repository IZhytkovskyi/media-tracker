// src/controllers/stats.js
import db from '../db/database.js';

export const getGeneralStats = async (request, reply) => {
    try {
        // Загальна кількість переглянутих фільмів
        const movies = db.prepare(`
            SELECT COUNT(DISTINCT h.media_id) as count 
            FROM history h 
            JOIN media_items m ON h.media_id = m.id 
            WHERE m.media_type = 'movie'
        `).get();

        // Загальна кількість переглянутих епізодів
        const episodes = db.prepare(`
            SELECT COUNT(h.id) as count 
            FROM history h 
            JOIN media_items m ON h.media_id = m.id 
            WHERE m.media_type = 'episode'
        `).get();

        // Улюблені жанри (з урахуванням недодивлених серіалів)
        // Знаходимо кореневий серіал для епізодів та сезонів і беремо його жанри
        const watchedItems = db.prepare(`
            SELECT DISTINCT
                CASE
                    WHEN m.media_type = 'episode' THEN (SELECT parent_id FROM media_items s WHERE s.id = m.parent_id)
                    WHEN m.media_type = 'season' THEN m.parent_id
                    ELSE m.id
                END as root_id,
                CASE
                    WHEN m.media_type = 'episode' THEN (SELECT genres FROM media_items series WHERE series.id = (SELECT parent_id FROM media_items s WHERE s.id = m.parent_id))
                    WHEN m.media_type = 'season' THEN (SELECT genres FROM media_items series WHERE series.id = m.parent_id)
                    ELSE m.genres
                END as genres
            FROM history h
            JOIN media_items m ON h.media_id = m.id
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

        const topGenres = Object.entries(genreCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Активність по місяцях (останні 5 місяців)
        const monthlyActivity = db.prepare(`
            SELECT strftime('%Y-%m', watched_at) as month, COUNT(*) as count
            FROM history
            WHERE watched_at >= date('now', 'start of month', '-5 months')
            GROUP BY month
            ORDER BY month ASC
        `).all();

        // Розподіл оцінок користувача
        const ratings = db.prepare(`
            SELECT user_rating as rating, COUNT(*) as count
            FROM media_items
            WHERE user_rating IS NOT NULL AND user_rating > 0
            GROUP BY user_rating
            ORDER BY user_rating DESC
        `).all();

        // Найпопулярніші роки релізу (якщо епізод не має дати, беремо сезон або серіал)
        const releaseYears = db.prepare(`
            SELECT
                strftime('%Y', COALESCE(
                    m.release_date,
                    (SELECT release_date FROM media_items s WHERE s.id = m.parent_id),
                    (SELECT release_date FROM media_items series WHERE series.id = (SELECT parent_id FROM media_items s WHERE s.id = m.parent_id))
                )) as year,
                COUNT(h.id) as count
            FROM history h
            JOIN media_items m ON h.media_id = m.id
            WHERE year IS NOT NULL
            GROUP BY year
            ORDER BY count DESC
            LIMIT 5
        `).all();

        // Активність за останні 30 днів
        const dailyActivity = db.prepare(`
            SELECT date(watched_at) as date, COUNT(*) as count
            FROM history
            WHERE watched_at >= date('now', '-30 days')
            GROUP BY date
            ORDER BY date ASC
        `).all();

        return {
            data: {
                movies: movies.count,
                episodes: episodes.count,
                topGenres,
                activity: monthlyActivity,
                ratings,
                releaseYears,
                dailyActivity
            }
        };
    } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: 'Помилка отримання статистики', details: error.message };
    }
};