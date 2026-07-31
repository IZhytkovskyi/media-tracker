// src/controllers/tmdb.js

export const searchTMDB = async (request, reply) => {
    const { query, type = 'multi' } = request.query;
    
    if (!query) {
        reply.code(400);
        return { error: 'Потрібен параметр пошуку (query)' };
    }

    const token = process.env.TMDB_READ_TOKEN;
    if (!token) {
        reply.code(500);
        return { error: 'Не вказано TMDB_READ_TOKEN в .env' };
    }

    const url = `https://api.themoviedb.org/3/search/${type}?query=${encodeURIComponent(query)}&language=uk-UA&page=1`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${token}` 
            }
        });

        if (!response.ok) throw new Error(`Помилка TMDB API: ${response.statusText}`);

        const data = await response.json();
        
        const results = data.results.map(item => {
            let mt = item.media_type;
            if (mt === 'tv') mt = 'series';
            if (!mt) mt = (type === 'tv' ? 'series' : 'movie');

            return {
                tmdb_id: item.id,
                title: item.title || item.name, 
                media_type: mt,
                release_date: item.release_date || item.first_air_date,
                description: item.overview,
                poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                original_language: item.original_language
            };
        });

        return { data: results };
    } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: 'Не вдалося зв’язатися з TMDB', details: error.message };
    }
};

const getJobTranslation = (job, gender) => {
    const isFemale = gender === 1;
    const translations = {
        'Director': isFemale ? 'Режисерка' : 'Режисер',
        'Screenplay': isFemale ? 'Сценаристка' : 'Сценарист',
        'Writer': isFemale ? 'Сценаристка' : 'Сценарист',
        'Story': isFemale ? 'Авторка історії' : 'Автор історії',
        'Director of Photography': isFemale ? 'Операторка' : 'Оператор',
        'Original Music Composer': isFemale ? 'Композиторка' : 'Композитор',
        'Music': isFemale ? 'Композиторка' : 'Композитор',
        'Producer': isFemale ? 'Продюсерка' : 'Продюсер',
        'Executive Producer': isFemale ? 'Виконавча продюсерка' : 'Виконавчий продюсер',
        'Co-Producer': isFemale ? 'Співпродюсерка' : 'Співпродюсер',
        'Editor': isFemale ? 'Монтажерка' : 'Монтажер',
        'Production Design': 'Художник-постановник',
        'Art Direction': 'Артдиректор',
        'Set Decoration': 'Декоратор',
        'Costume Design': isFemale ? 'Художниця з костюмів' : 'Художник з костюмів',
        'Makeup Artist': 'Гример',
        'Hairstylist': 'Стиліст зачісок',
        'Casting': 'Кастинг-директор',
        'Sound Designer': 'Звукорежисер',
        'Visual Effects Supervisor': 'Супервайзер візуальних ефектів',
        'Stunt Coordinator': 'Постановник трюків',
    };
    return translations[job] || job;
}; 

export const getTMDBDetails = async (request, reply) => {
    const { id, type } = request.params;
    const tmdbType = (type === 'series' || type === 'tv') ? 'tv' : 'movie';

    const token = process.env.TMDB_READ_TOKEN;
    if (!token) {
        reply.code(500);
        return { error: 'Не вказано TMDB_READ_TOKEN в .env' };
    }

    const url = `https://api.themoviedb.org/3/${tmdbType}/${id}?language=uk-UA&append_to_response=credits,external_ids,images,release_dates,alternative_titles,content_ratings&include_image_language=uk,en,null`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { accept: 'application/json', Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 404) return reply.code(404).send({ error: 'Не знайдено в TMDB' });
        if (!response.ok) throw new Error(`Помилка TMDB API: ${response.statusText}`);
        
        const item = await response.json();
        
        const cast = item.credits?.cast?.map(actor => ({
            id: actor.id, name: actor.name, character: actor.character, gender: actor.gender,
            profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
        })) || [];

        const uniqueCrew = [];
        const seen = new Set();

        for (const member of (item.credits?.crew || [])) {
            const key = `${member.id}-${member.job}`; 
            if (!seen.has(key)) {
                seen.add(key);
                uniqueCrew.push({
                    id: member.id, name: member.name, job: getJobTranslation(member.job, member.gender),
                    original_job: member.job, gender: member.gender,
                    profile_path: member.profile_path ? `https://image.tmdb.org/t/p/w185${member.profile_path}` : null
                });
            }
        }

        if (tmdbType === 'tv' && item.created_by) {
            for (const creator of item.created_by) {
                const key = `${creator.id}-Creator`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCrew.push({
                        id: creator.id, name: creator.name, job: creator.gender === 1 ? 'Творчиня' : 'Творець',
                        original_job: 'Creator', gender: creator.gender,
                        profile_path: creator.profile_path ? `https://image.tmdb.org/t/p/w185${creator.profile_path}` : null
                    });
                }
            }
        }

        const jobPriority = ['Director', 'Creator', 'Screenplay', 'Writer', 'Director of Photography', 'Original Music Composer', 'Producer'];
        
        const crew = uniqueCrew.sort((a, b) => {
            const idxA = jobPriority.indexOf(a.original_job);
            const idxB = jobPriority.indexOf(b.original_job);
            
            if (idxA === -1 && idxB === -1) return a.original_job.localeCompare(b.original_job);
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });

        let releases = [];
        let age_rating = null;
        let world_premiere = item.release_date || item.first_air_date || null;
        let ua_premiere = null;
        let digital_premiere = null;

        if (tmdbType === 'movie' && item.release_dates?.results) {
            const uaRating = item.release_dates.results.find(r => r.iso_3166_1 === 'UA')?.release_dates.find(d => d.certification)?.certification;
            const usRating = item.release_dates.results.find(r => r.iso_3166_1 === 'US')?.release_dates.find(d => d.certification)?.certification;
            age_rating = uaRating || usRating || null;

            releases = item.release_dates.results.map(r => ({
                country: r.iso_3166_1, 
                dates: r.release_dates.map(d => ({ type: d.type, date: d.release_date, note: d.note }))
            }));

            const allDates = releases.flatMap(r => r.dates.map(d => d.date)).sort();
            if (allDates.length > 0) world_premiere = allDates[0];
            
            const uaReleases = releases.find(r => r.country === 'UA');
            if (uaReleases) {
                ua_premiere = uaReleases.dates.sort((a, b) => new Date(a.date) - new Date(b.date))[0].date;
            }

            const digitalReleases = releases.flatMap(r => r.dates).filter(d => d.type === 4).sort((a, b) => new Date(a.date) - new Date(b.date));
            if (digitalReleases.length > 0) digital_premiere = digitalReleases[0].date;

        } else if (tmdbType === 'tv') {
            const usRating = item.content_ratings?.results?.find(r => r.iso_3166_1 === 'US');
            age_rating = usRating?.rating || null;
            
            releases = [{
                country: item.origin_country?.[0] || 'US',
                dates: [{ type: 6, date: item.first_air_date, note: item.networks?.map(n => n.name).join(', ') || '' }]
            }];
        }

        const originCountries = item.origin_country || [];
        const altTitlesRaw = tmdbType === 'movie' ? item.alternative_titles?.titles : item.alternative_titles?.results;
        
        const alternative_titles = altTitlesRaw
            ?.filter(t => t.iso_3166_1 === 'UA' || originCountries.includes(t.iso_3166_1))
            .map(t => `${t.title} (${t.iso_3166_1})`) || [];

        const detailedData = {
            tmdb_id: item.id,
            imdb_id: item.external_ids?.imdb_id || null,
            title: item.title || item.name,
            original_title: item.original_title || item.original_name,
            media_type: type === 'tv' ? 'series' : type,
            description: item.overview,
            tagline: item.tagline,
            genres: item.genres?.map(g => g.name) || [],
            release_date: item.release_date || item.first_air_date,
            status: item.status,
            runtime: tmdbType === 'movie' ? item.runtime : (item.episode_run_time?.[0] || null),
            poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            backdrop_path: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
            
            production_countries: item.production_countries?.map(c => c.iso_3166_1) || [],
            original_language: item.original_language,
            age_rating,
            world_premiere,
            ua_premiere,
            digital_premiere,
            budget: item.budget || 0,
            revenue: item.revenue || 0,
            production_companies: item.production_companies?.map(c => c.name) || [],
            alternative_titles,

            crew: crew, 
            cast: cast,
            total_seasons: item.number_of_seasons || 0,
            total_episodes: item.number_of_episodes || 0,

            seasons: tmdbType === 'tv' && item.seasons ? item.seasons.map(s => ({
                season_number: s.season_number, name: s.name, episode_count: s.episode_count,
                air_date: s.air_date, poster_path: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null
            })).filter(s => s.season_number > 0) : [],
            
            images: {
                backdrops: item.images?.backdrops || [],
                posters: item.images?.posters || [],
                logos: item.images?.logos || []
            },
            releases: releases,
            external_links: {
                homepage: item.homepage || null,
                tmdb: `https://www.themoviedb.org/${tmdbType}/${item.id}`,
                imdb: item.external_ids?.imdb_id ? `https://www.imdb.com/title/${item.external_ids.imdb_id}` : null,
                wikidata: item.external_ids?.wikidata_id ? `https://www.wikidata.org/wiki/${item.external_ids.wikidata_id}` : null,
                facebook: item.external_ids?.facebook_id ? `https://www.facebook.com/${item.external_ids.facebook_id}` : null,
                instagram: item.external_ids?.instagram_id ? `https://www.instagram.com/${item.external_ids.instagram_id}` : null,
                twitter: item.external_ids?.twitter_id ? `https://twitter.com/${item.external_ids.twitter_id}` : null,
                tiktok: item.external_ids?.tiktok_id ? `https://www.tiktok.com/@${item.external_ids.tiktok_id}` : null,
            }
        };

        return { data: detailedData };
    } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: 'Не вдалося зв’язатися з TMDB', details: error.message };
    }
};

export const getTMDBSeasonDetails = async (request, reply) => {
    const { id, season } = request.params;
    const token = process.env.TMDB_READ_TOKEN;
    if (!token) return { error: 'Не вказано TMDB_READ_TOKEN в .env' };
    
    // Додано append_to_response для акторів та зображень
    const url = `https://api.themoviedb.org/3/tv/${id}/season/${season}?language=uk-UA&append_to_response=credits,images&include_image_language=uk,en,null`;
    try {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const item = await response.json();

        // Нормалізація для перевикористання у компонентах
        item.cast = item.credits?.cast?.map(actor => ({
            id: actor.id, name: actor.name, character: actor.character, gender: actor.gender,
            profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
        })) || [];
        
        const uniqueCrew = [];
        const seen = new Set();
        for (const member of (item.credits?.crew || [])) {
            const key = `${member.id}-${member.job}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueCrew.push({
                    id: member.id, name: member.name, job: getJobTranslation(member.job, member.gender),
                    original_job: member.job, gender: member.gender,
                    profile_path: member.profile_path ? `https://image.tmdb.org/t/p/w185${member.profile_path}` : null
                });
            }
        }
        item.crew = uniqueCrew;

        return { data: item };
    } catch (error) {
        return { error: 'Помилка TMDB' };
    }
};

export const getTMDBEpisodeDetails = async (request, reply) => {
    const { id, season, episode } = request.params;
    const token = process.env.TMDB_READ_TOKEN;
    if (!token) return { error: 'Не вказано TMDB_READ_TOKEN в .env' };
    
    // Додано append_to_response для акторів та зображень
    const url = `https://api.themoviedb.org/3/tv/${id}/season/${season}/episode/${episode}?language=uk-UA&append_to_response=credits,images&include_image_language=uk,en,null`;
    try {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const item = await response.json();

        // Об'єднуємо guest_stars та cast для серії
        const rawCast = item.credits?.cast || [];
        const rawGuests = item.guest_stars || [];
        
        const uniqueCast = [];
        const seenCast = new Set();
        [...rawGuests, ...rawCast].forEach(actor => {
            if (!seenCast.has(actor.id)) {
                seenCast.add(actor.id);
                uniqueCast.push({
                    id: actor.id, name: actor.name, character: actor.character, gender: actor.gender,
                    profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
                });
            }
        });
        item.cast = uniqueCast;

        const uniqueCrew = [];
        const seenCrew = new Set();
        for (const member of (item.credits?.crew || [])) {
            const key = `${member.id}-${member.job}`;
            if (!seenCrew.has(key)) {
                seenCrew.add(key);
                uniqueCrew.push({
                    id: member.id, name: member.name, job: getJobTranslation(member.job, member.gender),
                    original_job: member.job, gender: member.gender,
                    profile_path: member.profile_path ? `https://image.tmdb.org/t/p/w185${member.profile_path}` : null
                });
            }
        }
        item.crew = uniqueCrew;

        // Перетворюємо stills на backdrops, щоб наша вкладка TabShots змогла їх відрендерити
        if (item.images?.stills) {
            item.images.backdrops = item.images.stills;
        }

        return { data: item };
    } catch (error) {
        return { error: 'Помилка TMDB' };
    }
};

export const getTMDBPersonDetails = async (request, reply) => {
    const { id } = request.params;
    const token = process.env.TMDB_READ_TOKEN;
    
    if (!token) {
        reply.code(500);
        return { error: 'Не вказано TMDB_READ_TOKEN в .env' };
    }

    const url = `https://api.themoviedb.org/3/person/${id}?language=uk-UA&append_to_response=combined_credits,images,external_ids`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { accept: 'application/json', Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 404) return reply.code(404).send({ error: 'Не знайдено в TMDB' });
        if (!response.ok) throw new Error(`Помилка TMDB API: ${response.statusText}`);
        
        const item = await response.json();
        return { data: item };
    } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: 'Не вдалося зв’язатися з TMDB', details: error.message };
    }
};