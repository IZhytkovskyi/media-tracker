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

const getSeriesLocalId = (mediaId) => {
    const media = db.prepare('SELECT id, parent_id, media_type FROM media_items WHERE id = ?').get(mediaId);
    if (!media) return null;
    if (media.media_type === 'series') return media.id;
    if (media.parent_id) return getSeriesLocalId(media.parent_id);
    return null;
};

// Оновлення кешу наступної серії
const updateNextEpisodeCache = async (seriesId) => {
    const series = db.prepare('SELECT * FROM media_items WHERE id = ? AND media_type = "series"').get(seriesId);
    if (!series || !series.tmdb_id || series.status !== 'watching') {
        db.prepare('UPDATE media_items SET next_episode_cache = NULL WHERE id = ?').run(seriesId);
        return;
    }

    const token = process.env.TMDB_READ_TOKEN;
    if (!token) return;

    const lastEp = db.prepare(`
        SELECT season, episode 
        FROM media_items 
        WHERE media_type = 'episode' AND status = 'completed' 
        AND parent_id IN (SELECT id FROM media_items WHERE parent_id = ? AND media_type = 'season')
        ORDER BY season DESC, episode DESC 
        LIMIT 1
    `).get(seriesId);

    let nextS = lastEp ? lastEp.season : 1;
    let nextE = lastEp ? lastEp.episode + 1 : 1;
    
    try {
        let epRes = await fetch(`https://api.themoviedb.org/3/tv/${series.tmdb_id}/season/${nextS}/episode/${nextE}?language=uk-UA`, { 
            headers: { Authorization: `Bearer ${token}` } 
        });
        
        if (epRes.status === 404) { 
            nextS += 1;
            nextE = 1;
            epRes = await fetch(`https://api.themoviedb.org/3/tv/${series.tmdb_id}/season/${nextS}/episode/${nextE}?language=uk-UA`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
        }
        
        if (epRes.ok) {
            const epData = await epRes.json();
            const nextEpisodeObj = {
                season: nextS,
                episode: nextE,
                title: epData.name,
                original_title: epData.name,
                poster_path: epData.still_path || series.backdrop_path || series.poster_path,
                tmdb_id: epData.id,
                is_tmdb_dynamic: true
            };
            db.prepare('UPDATE media_items SET next_episode_cache = ? WHERE id = ?').run(JSON.stringify(nextEpisodeObj), seriesId);
        } else {
            db.prepare('UPDATE media_items SET next_episode_cache = NULL WHERE id = ?').run(seriesId);
        }
    } catch (e) {
        console.error('Помилка кешування наступної серії:', e);
    }
};

const cascadeDown = async (mediaItem, finishDate, parentLogId) => {
    if (mediaItem.media_type === 'episode' || mediaItem.media_type === 'movie') return { ok: true };

    const seriesTmdbId = getSeriesTmdbId(mediaItem.id);
    if (!seriesTmdbId) return { ok: false, error: 'Батьківський TMDB ID не знайдено' };

    if (mediaItem.media_type === 'season') {
        try {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${seriesTmdbId}/season/${mediaItem.season}?language=uk-UA`, { headers: getTmdbHeaders() });
            if (!res.ok) return { ok: false, error: `TMDB Error: ${res.status}` };
            
            const data = await res.json();
            const series = db.prepare('SELECT title FROM media_items WHERE id = ?').get(mediaItem.parent_id);
            
            db.transaction(() => {
                for (const ep of data.episodes || []) {
                    const epExtId = `episode_${ep.id}`;
                    let epMedia = db.prepare('SELECT id FROM media_items WHERE external_id = ?').get(epExtId);
                    
                    if (!epMedia) {
                        const title = `${series?.title || ''} - S${mediaItem.season}E${ep.episode_number}`;
                        const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, status, season, episode, parent_id, tmdb_id, poster_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title, ep.name, 'episode', epExtId, 'completed', mediaItem.season, ep.episode_number, mediaItem.id, ep.id, ep.still_path || null);
                        epMedia = { id: info.lastInsertRowid };
                    } else {
                        db.prepare(`UPDATE media_items SET status = 'completed' WHERE id = ?`).run(epMedia.id);
                    }

                    const comment = parentLogId ? `Автоматичний запис (успадковано)` : `Автоматично позначено (Разом з сезоном)`;
                    const existingLog = db.prepare(`SELECT id FROM watch_logs WHERE media_id = ? AND (parent_log_id = ? OR comment LIKE '%Автоматично позначено%')`).get(epMedia.id, parentLogId || -1);
                    
                    if (!existingLog) {
                        db.prepare(`INSERT INTO watch_logs (media_id, comment, parent_log_id) VALUES (?, ?, ?)`).run(epMedia.id, comment, parentLogId || null);
                    }
                }
            })();
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    } else if (mediaItem.media_type === 'series') {
        try {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${seriesTmdbId}?language=uk-UA`, { headers: getTmdbHeaders() });
            if (!res.ok) return { ok: false, error: `TMDB Error: ${res.status}` };
            const data = await res.json();

            for (const s of (data.seasons || []).filter(s => s.season_number > 0)) {
                const seasonExtId = `season_${s.id}`;
                let seasonMedia = db.prepare('SELECT id FROM media_items WHERE external_id = ?').get(seasonExtId);
                
                if (!seasonMedia) {
                    const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, status, season, parent_id, tmdb_id, total_episodes, poster_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(`${mediaItem.title} - ${s.name}`, s.name, 'season', seasonExtId, 'completed', s.season_number, mediaItem.id, s.id, s.episode_count || 0, s.poster_path || null);
                    seasonMedia = { id: info.lastInsertRowid, season: s.season_number, parent_id: mediaItem.id, media_type: 'season' };
                } else {
                    db.prepare(`UPDATE media_items SET status = 'completed' WHERE id = ?`).run(seasonMedia.id);
                }

                let seasonLogId;
                const existingLog = db.prepare(`SELECT id FROM watch_logs WHERE media_id = ? AND (parent_log_id = ? OR comment LIKE '%Автоматично позначено%')`).get(seasonMedia.id, parentLogId || -1);
                
                if (!existingLog) {
                    const info = db.prepare(`INSERT INTO watch_logs (media_id, comment, parent_log_id) VALUES (?, ?, ?)`).run(seasonMedia.id, parentLogId ? `Автоматичний запис` : `Автоматично позначено`, parentLogId || null);
                    seasonLogId = info.lastInsertRowid;
                } else {
                    seasonLogId = existingLog.id;
                }

                await cascadeDown(seasonMedia, finishDate, seasonLogId);
            }
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
};

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
        newStatus = (expectedChildren > 0 && completedCount >= expectedChildren) ? 'completed' : 'watching';
    } else if (parent.status === 'watching' || parent.status === 'completed') {
        newStatus = null;
    }
    
    if (parent.status !== newStatus || newStatus === 'completed') {
        let startToSet = null; let finishToSet = null; let shouldAddLog = false;
        if (newStatus === 'completed') {
            const stats = db.prepare(`SELECT MIN(w.start_date) as min_start, MAX(w.finish_date) as max_finish FROM watch_logs w JOIN media_items m ON w.media_id = m.id WHERE m.parent_id = ?`).get(parentId);
            startToSet = stats.min_start || parent.start_date || null;
            finishToSet = stats.max_finish || parent.finish_date || null;
            if (parent.status !== 'completed') shouldAddLog = true;
        }

        db.prepare('UPDATE media_items SET status = ?, start_date = COALESCE(?, start_date), finish_date = COALESCE(?, finish_date) WHERE id = ?').run(newStatus, startToSet, finishToSet, parentId);
        
        if (shouldAddLog && finishToSet) {
            const existingLog = db.prepare('SELECT id FROM watch_logs WHERE media_id = ? AND finish_date = ?').get(parentId, finishToSet);
            if (!existingLog) db.prepare(`INSERT INTO watch_logs (media_id, start_date, finish_date, comment) VALUES (?, ?, ?, ?)`).run(parentId, startToSet, finishToSet, `Автоматично позначено як переглянуте.`);
        }
        await cascadeUp(parent.parent_id);
    }
};

const syncMediaStats = async (mediaId, triggerUp = true, triggerDown = true) => {
    const logs = db.prepare(`SELECT id, start_date, finish_date, rating FROM watch_logs WHERE media_id = ? ORDER BY COALESCE(finish_date, start_date, created_at) DESC LIMIT 1`).all(mediaId);
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
        
        db.prepare(`UPDATE media_items SET start_date = ?, finish_date = ?, rating = ?, status = ? WHERE id = ?`).run(latestLog.start_date || null, latestLog.finish_date || null, latestLog.rating !== undefined ? latestLog.rating : null, newStatus, mediaId);
    } else {
        newStatus = null;
        db.prepare(`UPDATE media_items SET start_date = NULL, finish_date = NULL, rating = NULL, status = CASE WHEN status IN ('watching', 'completed') THEN NULL ELSE status END WHERE id = ?`).run(mediaId);
    }

    let cascadeResult = { ok: true };
    if (newStatus === 'completed' && triggerDown) cascadeResult = await cascadeDown(media, finishDateToCascade, latestLogId);
    if (triggerUp) await cascadeUp(media.parent_id);

    // Кешування наступної серії після оновлення статусів
    const seriesId = getSeriesLocalId(mediaId);
    if (seriesId) await updateNextEpisodeCache(seriesId);

    return cascadeResult;
};

export const watchNextEpisode = async (request, reply) => {
    const { id } = request.params; 
    const series = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    if (!series || series.media_type !== 'series') return reply.code(400).send({error: 'Невірний серіал'});

    const lastEp = db.prepare(`
        SELECT season, episode FROM media_items 
        WHERE media_type = 'episode' AND status = 'completed' AND parent_id IN (SELECT id FROM media_items WHERE parent_id = ? AND media_type = 'season')
        ORDER BY season DESC, episode DESC LIMIT 1
    `).get(series.id);

    let nextSeasonNum = lastEp ? lastEp.season : 1;
    let nextEpNum = lastEp ? lastEp.episode + 1 : 1;

    const token = process.env.TMDB_READ_TOKEN;
    let seasonRes = await fetch(`https://api.themoviedb.org/3/tv/${series.tmdb_id}/season/${nextSeasonNum}?language=uk-UA`, {headers: {Authorization: `Bearer ${token}`}});
    if (!seasonRes.ok) return reply.code(400).send({error: 'Не вдалося отримати дані сезону з TMDB'});
    let seasonData = await seasonRes.json();

    if (nextEpNum > seasonData.episodes.length) {
        nextSeasonNum += 1;
        nextEpNum = 1;
        seasonRes = await fetch(`https://api.themoviedb.org/3/tv/${series.tmdb_id}/season/${nextSeasonNum}?language=uk-UA`, {headers: {Authorization: `Bearer ${token}`}});
        if (!seasonRes.ok) return reply.code(400).send({error: 'Наступного сезону або епізоду не знайдено'});
        seasonData = await seasonRes.json();
    }

    const epData = seasonData.episodes.find(e => e.episode_number === nextEpNum);
    if (!epData) return reply.code(400).send({error: 'Епізод не знайдено'});

    let seasonExtId = `season_${seasonData._id || seasonData.id}`;
    let seasonMedia = db.prepare('SELECT id FROM media_items WHERE external_id = ?').get(seasonExtId);
    if (!seasonMedia) {
        const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, status, season, parent_id, tmdb_id, total_episodes, poster_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(`${series.title} - ${seasonData.name}`, seasonData.name, 'season', seasonExtId, 'watching', nextSeasonNum, series.id, seasonData.id, seasonData.episodes.length, seasonData.poster_path || series.poster_path);
        seasonMedia = { id: info.lastInsertRowid };
    }

    let epExtId = `episode_${epData.id}`;
    let epMedia = db.prepare('SELECT id FROM media_items WHERE external_id = ?').get(epExtId);
    if (!epMedia) {
        const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, status, season, episode, parent_id, tmdb_id, poster_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(`${series.title} - S${nextSeasonNum}E${nextEpNum}`, epData.name, 'episode', epExtId, 'completed', nextSeasonNum, nextEpNum, seasonMedia.id, epData.id, epData.still_path || null);
        epMedia = { id: info.lastInsertRowid };
    } else {
        db.prepare(`UPDATE media_items SET status = 'completed' WHERE id = ?`).run(epMedia.id);
    }

    const today = new Date().toISOString().split('T')[0];
    db.prepare(`INSERT INTO watch_logs (media_id, start_date, finish_date, comment) VALUES (?, ?, ?, ?)`).run(epMedia.id, today, today, 'Відмічено з дашборду');

    await syncMediaStats(epMedia.id);
    return { message: 'Відмічено!' };
};

export const getUpcomingMedia = async (request, reply) => {
    try {
        const localUpcoming = db.prepare(`
            SELECT m.*, 
                CASE 
                    WHEN m.media_type = 'episode' OR m.media_type = 'season' THEN (
                        COALESCE((SELECT tmdb_id FROM media_items s WHERE s.id = m.parent_id AND s.media_type = 'series'), (SELECT s2.tmdb_id FROM media_items s1 JOIN media_items s2 ON s1.parent_id = s2.id WHERE s1.id = m.parent_id AND s2.media_type = 'series'))
                    )
                    ELSE m.tmdb_id
                END as series_tmdb_id
            FROM media_items m
            WHERE m.release_date >= date('now', 'localtime') AND (m.status IS NULL OR m.status != 'dropped')
        `).all();

        const activeSeries = db.prepare(`SELECT id, title, tmdb_id, poster_path FROM media_items WHERE media_type = 'series' AND status IN ('watching', 'planned') AND tmdb_id IS NOT NULL`).all();
        const tmdbUpcoming = [];
        const token = process.env.TMDB_READ_TOKEN;

        if (token && activeSeries.length > 0) {
            const promises = activeSeries.map(async (series) => {
                try {
                    const res = await fetch(`https://api.themoviedb.org/3/tv/${series.tmdb_id}?language=uk-UA`, { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) return null;
                    const data = await res.json();
                    const nextEp = data.next_episode_to_air;
                    
                    if (nextEp && !localUpcoming.find(item => item.media_type === 'episode' && item.tmdb_id === nextEp.id)) {
                        return { id: `dynamic_${nextEp.id}`, tmdb_id: nextEp.id, series_tmdb_id: series.tmdb_id, title: series.title, original_title: nextEp.name, media_type: 'episode', season: nextEp.season_number, episode: nextEp.episode_number, release_date: nextEp.air_date, poster_path: nextEp.still_path || series.poster_path, status: 'planned', is_dynamic: true };
                    }
                } catch (e) { }
                return null;
            });
            const results = await Promise.all(promises);
            tmdbUpcoming.push(...results.filter(Boolean));
        }

        const combined = [...localUpcoming, ...tmdbUpcoming].map(item => {
            let parsedGenres = [];
            try { parsedGenres = typeof item.genres === 'string' ? JSON.parse(item.genres) : (Array.isArray(item.genres) ? item.genres : []); } catch (e) {}
            return { ...item, genres: parsedGenres };
        }).sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
        
        return { data: combined.slice(0, 15) };
    } catch (error) {
        return { error: 'Помилка отримання очікуваних релізів', details: error.message };
    }
};

export const getAllMedia = async (request, reply) => {
    const { type, status, limit = 50, offset = 0 } = request.query;
    
    const safeLimit = isNaN(parseInt(limit)) ? 50 : parseInt(limit);
    const safeOffset = isNaN(parseInt(offset)) ? 0 : parseInt(offset);

    let query = "SELECT * FROM media_items WHERE status IS NOT NULL AND media_type IN ('movie', 'series', 'book', 'game', 'comic', 'manga', 'season', 'episode')";
    const params = [];

    if (type && type !== 'all') {
        query += ' AND media_type = ?'; params.push(type);
    }
    if (status) {
        query += ' AND status = ?'; params.push(status);
    }
    
    query += ' ORDER BY COALESCE(finish_date, updated_at) DESC LIMIT ? OFFSET ?';
    params.push(safeLimit, safeOffset);

    const items = db.prepare(query).all(...params);
    
    // Миттєвий рендер завдяки кешу
    const formattedItems = items.map((item) => {
        let parsedGenres = [];
        try { parsedGenres = item.genres ? JSON.parse(item.genres) : []; } catch (e) { }

        let progress = null;
        let lastWatched = null;
        let nextEpisode = null;

        if (item.media_type === 'series') {
            const watchedEps = db.prepare(`SELECT COUNT(*) as count FROM media_items WHERE media_type = 'episode' AND status = 'completed' AND parent_id IN (SELECT id FROM media_items WHERE parent_id = ? AND media_type = 'season')`).get(item.id).count;
            const lastEp = db.prepare(`SELECT season, episode, title, original_title FROM media_items WHERE media_type = 'episode' AND status = 'completed' AND parent_id IN (SELECT id FROM media_items WHERE parent_id = ? AND media_type = 'season') ORDER BY season DESC, episode DESC LIMIT 1`).get(item.id);

            if (lastEp) lastWatched = lastEp;

            if (item.next_episode_cache) {
                try { nextEpisode = JSON.parse(item.next_episode_cache); } catch(e) {}
            } else if (!lastWatched) {
                nextEpisode = db.prepare(`SELECT season, episode, title, original_title, poster_path, id, tmdb_id FROM media_items WHERE media_type = 'episode' AND parent_id IN (SELECT id FROM media_items WHERE parent_id = ? AND media_type = 'season') ORDER BY season ASC, episode ASC LIMIT 1`).get(item.id);
            }

            progress = {
                watched: watchedEps,
                total: item.total_episodes || 0,
                left: Math.max(0, (item.total_episodes || 0) - watchedEps)
            };
        }

        return { ...item, genres: parsedGenres, progress, lastWatched, nextEpisode };
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
    if (!item) return reply.code(404).send({ error: 'Медіа не знайдено' });
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
    
    if (!item) return reply.code(404).send({ error: 'Медіа не знайдено' });
    try { item.genres = item.genres ? JSON.parse(item.genres) : []; } catch (e) { item.genres = []; }
    return { data: item };
};

export const createMedia = async (request, reply) => {
    const data = request.body;
    const genresStr = data.genres ? JSON.stringify(data.genres) : null;

    if ((data.media_type === 'season' || data.media_type === 'episode') && !data.parent_id) {
        reply.code(400); return { error: `Для типу '${data.media_type}' обов'язкове поле parent_id` };
    }

    try {
        const info = db.prepare(`INSERT INTO media_items (title, original_title, media_type, external_id, parent_id, status, rating, review, season, episode, total_seasons, total_episodes, genres, poster_path, backdrop_path, release_date, tmdb_id, imdb_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(data.title, data.original_title || null, data.media_type, data.external_id, data.parent_id || null, data.status || null, data.rating ?? null, data.review || null, data.season || 0, data.episode || 0, data.total_seasons || 0, data.total_episodes || 0, genresStr, data.poster_path || null, data.backdrop_path || null, data.release_date || null, data.tmdb_id || null, data.imdb_id || null);
        const newItem = db.prepare('SELECT * FROM media_items WHERE id = ?').get(info.lastInsertRowid);
        
        if (newItem.media_type === 'series' && newItem.status === 'watching') {
            await updateNextEpisodeCache(newItem.id);
        }

        try { newItem.genres = newItem.genres ? JSON.parse(newItem.genres) : []; } catch(e){ newItem.genres=[]; }
        reply.code(201);
        return { message: 'Медіа створено', data: newItem };
    } catch (error) {
        reply.code(400); return { error: 'Помилка при створенні медіа', details: error.message };
    }
};

export const updateMedia = async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    const existing = db.prepare('SELECT * FROM media_items WHERE id = ?').get(id);
    if (!existing) return reply.code(404).send({ error: 'Медіа не знайдено' });

    const allowedFields = ['title', 'original_title', 'media_type', 'status', 'rating', 'review', 'season', 'episode', 'total_seasons', 'total_episodes', 'genres', 'poster_path', 'backdrop_path', 'release_date', 'tmdb_id', 'imdb_id'];
    const fields = []; const values = [];
    
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
            if (updatedItem.parent_id) await cascadeUp(updatedItem.parent_id);
            if (updates.status === 'completed') await cascadeDown(updatedItem, updatedItem.finish_date || new Date().toISOString().split('T')[0], null);
            const seriesId = getSeriesLocalId(updatedItem.id);
            if (seriesId) await updateNextEpisodeCache(seriesId);
        }

        try { updatedItem.genres = updatedItem.genres ? JSON.parse(updatedItem.genres) : []; } catch(e){ updatedItem.genres=[]; }
        return { message: 'Медіа оновлено', data: updatedItem };
    } catch (error) {
        reply.code(400); return { error: 'Помилка при оновленні медіа', details: error.message };
    }
};

export const deleteMedia = async (request, reply) => {
    const { id } = request.params;
    const info = db.prepare('DELETE FROM media_items WHERE id = ?').run(id);
    if (info.changes === 0) return reply.code(404).send({ error: 'Медіа не знайдено' });
    return { message: 'Медіа видалено' };
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

    const logs = db.prepare(`SELECT w.*, m.media_type, m.season, m.episode, m.title as media_title FROM watch_logs w JOIN media_items m ON w.media_id = m.id WHERE m.id IN (${placeholders}) ORDER BY COALESCE(w.finish_date, w.start_date, w.created_at) DESC`).all(...targetIds);
    return { data: logs };
};

export const createMediaLog = async (request, reply) => {
    const { id } = request.params;
    let { start_date, finish_date, rating, comment } = request.body;
    const existingMedia = db.prepare('SELECT id FROM media_items WHERE id = ?').get(id);
    if (!existingMedia) return reply.code(404).send({ error: 'Медіа не знайдено' });

    const cleanRating = (rating !== undefined && rating !== null && rating !== '') ? parseFloat(rating) : null;
    try {
        const info = db.prepare(`INSERT INTO watch_logs (media_id, start_date, finish_date, rating, comment) VALUES (?, ?, ?, ?, ?)`).run(id, start_date || null, finish_date || null, cleanRating, comment || null);
        const cascadeResult = await syncMediaStats(id);
        
        reply.code(201);
        if (cascadeResult && cascadeResult.ok === false) return { message: 'Лог створено, помилка TMDB', id: info.lastInsertRowid, warning: cascadeResult.error };
        return { message: 'Лог створено', id: info.lastInsertRowid };
    } catch (error) {
        reply.code(400); return { error: 'Помилка при створенні логу', details: error.message };
    }
};

export const updateMediaLog = async (request, reply) => {
    const { log_id } = request.params;
    const { start_date, finish_date, rating, comment } = request.body;
    const existingLog = db.prepare('SELECT * FROM watch_logs WHERE id = ?').get(log_id);
    if (!existingLog) return reply.code(404).send({ error: 'Лог не знайдено' });

    const cleanRating = (rating !== undefined && rating !== null && rating !== '') ? parseFloat(rating) : null;
    try {
        db.prepare(`UPDATE watch_logs SET start_date = ?, finish_date = ?, rating = ?, comment = ? WHERE id = ?`).run(start_date !== undefined ? start_date : existingLog.start_date, finish_date !== undefined ? finish_date : existingLog.finish_date, cleanRating, comment !== undefined ? comment : existingLog.comment, log_id);
        const cascadeResult = await syncMediaStats(existingLog.media_id);
        
        if (cascadeResult && cascadeResult.ok === false) return { message: 'Лог оновлено, помилка TMDB', warning: cascadeResult.error };
        return { message: 'Лог оновлено' };
    } catch (error) {
        reply.code(400); return { error: 'Помилка при оновленні логу', details: error.message };
    }
};

export const deleteMediaLog = async (request, reply) => {
    const { log_id } = request.params;
    const log = db.prepare('SELECT id, media_id FROM watch_logs WHERE id = ?').get(log_id);
    if (!log) return reply.code(404).send({ error: 'Лог не знайдено' });

    const getDescendants = (parentId) => {
        const children = db.prepare('SELECT id, media_id FROM watch_logs WHERE parent_log_id = ?').all(parentId);
        let descendants = [...children];
        for (const child of children) descendants = descendants.concat(getDescendants(child.id));
        return descendants;
    };

    const allLogsToDelete = [log, ...getDescendants(log.id)];
    const logIds = allLogsToDelete.map(l => l.id);
    db.prepare(`DELETE FROM watch_logs WHERE id IN (${logIds.map(()=>'?').join(',')})`).run(...logIds);

    const affectedMediaIds = [...new Set(allLogsToDelete.map(l => l.media_id))];
    for (const mid of affectedMediaIds) await syncMediaStats(mid, false, false); 
    for (const mid of affectedMediaIds) {
         const m = db.prepare('SELECT parent_id FROM media_items WHERE id = ?').get(mid);
         if (m && m.parent_id) await cascadeUp(m.parent_id);
         const seriesId = getSeriesLocalId(mid);
         if (seriesId) await updateNextEpisodeCache(seriesId);
    }
      
    return { message: 'Лог видалено' };
};