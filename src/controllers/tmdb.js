// src/controllers/tmdb.js

export const searchTMDB = async (request, reply) => {
    const { query, type = 'multi' } = request.query;
    
    if (!query) {
        reply.code(400);
        return { error: 'Потрібен запит (query)' };
    }

    const token = process.env.TMDB_READ_TOKEN;
    if (!token) {
        reply.code(500);
        return { error: 'Не налаштовано TMDB_READ_TOKEN у .env' };
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
        return { error: 'Помилка пошуку TMDB', details: error.message };
    }
};

const getJobTranslation = (job, gender) => {
    const isFemale = gender === 1;
    const translations = {
        'Director': isFemale ? 'Режисерка' : 'Режисер',
        'Screenplay': isFemale ? 'Сценаристка' : 'Сценарист',
        'Writer': isFemale ? 'Письменниця' : 'Письменник',
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
        'Costume Design': isFemale ? 'Художниця по костюмах' : 'Художник по костюмах',
        'Makeup Artist': 'Гример',
        'Hairstylist': 'Стиліст зачісок',
        'Casting': 'Кастинг-директор',
        'Sound Designer': 'Звукорежисер',
        'Visual Effects Supervisor': 'Супервайзер візуальних ефектів',
        'Stunt Coordinator': 'Постановник трюків',
        'Creator': isFemale ? 'Творчиня' : 'Творець'
    };
    return translations[job] || job;
};

// Універсальний парсер титрів з підтримкою кількості епізодів
const parseCredits = (item, isAggregate = false) => {
    const creditsToUse = (isAggregate && item.aggregate_credits) ? item.aggregate_credits : item.credits;
    
    const cast = creditsToUse?.cast?.map(actor => {
        let character = actor.character;
        if (actor.roles && actor.roles.length > 0) {
            character = actor.roles.map(r => r.character).join(' / ');
        }
        return {
            id: actor.id, name: actor.name, character: character, gender: actor.gender,
            profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null,
            episode_count: actor.total_episode_count || null
        };
    }) || [];

    const uniqueCrew = [];
    const seen = new Set();
    
    for (const member of (creditsToUse?.crew || [])) {
        let jobs = [member.job];
        if (member.jobs && member.jobs.length > 0) {
            jobs = member.jobs.map(j => j.job);
        }
        let epCount = member.total_episode_count || null;
        
        jobs.forEach(job => {
            if (!job) return;
            const key = `${member.id}-${job}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueCrew.push({
                    id: member.id, name: member.name, job: getJobTranslation(job, member.gender),
                    original_job: job, gender: member.gender,
                    profile_path: member.profile_path ? `https://image.tmdb.org/t/p/w185${member.profile_path}` : null,
                    episode_count: epCount
                });
            }
        });
    }
    
    return { cast, crew: uniqueCrew, seenCrew: seen };
};

export const getTMDBDetails = async (request, reply) => {
    const { id, type } = request.params;
    const tmdbType = (type === 'series' || type === 'tv') ? 'tv' : 'movie';

    const token = process.env.TMDB_READ_TOKEN;
    if (!token) {
        reply.code(500);
        return { error: 'Не налаштовано TMDB_READ_TOKEN у .env' };
    }

    const url = `https://api.themoviedb.org/3/${tmdbType}/${id}?language=uk-UA&append_to_response=credits,aggregate_credits,external_ids,images,release_dates,alternative_titles,content_ratings&include_image_language=uk,en,null`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { accept: 'application/json', Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 404) return reply.code(404).send({ error: 'Не знайдено в TMDB' });
        if (!response.ok) throw new Error(`Помилка TMDB API: ${response.statusText}`);
        
        const item = await response.json();
        
        // Використовуємо універсальний парсер (з агрегацією для серіалів)
        const parsed = parseCredits(item, tmdbType === 'tv');
        const cast = parsed.cast;
        const uniqueCrew = parsed.crew;
        const seen = parsed.seenCrew;

        // Додаємо творців серіалу
        if (tmdbType === 'tv' && item.created_by) {
            for (const creator of item.created_by) {
                const key = `${creator.id}-Creator`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCrew.push({
                        id: creator.id, name: creator.name, job: creator.gender === 1 ? 'Творчиня' : 'Творець',
                        original_job: 'Creator', gender: creator.gender,
                        profile_path: creator.profile_path ? `https://image.tmdb.org/t/p/w185${creator.profile_path}` : null,
                        episode_count: item.number_of_episodes || null
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
                season_number: s.season_number, 
                name: s.name, 
                episode_count: s.episode_count,
                air_date: s.air_date, 
                overview: s.overview,
                poster_path: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null
            })) : [],
            
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
        return { error: 'Помилка отримання деталей TMDB', details: error.message };
    }
};

export const getTMDBSeasonDetails = async (request, reply) => {
    const { id, season } = request.params;
    const token = process.env.TMDB_READ_TOKEN;
    if (!token) return { error: 'Не налаштовано TMDB_READ_TOKEN у .env' };
    
    // Додаємо aggregate_credits та external_ids
    const url = `https://api.themoviedb.org/3/tv/${id}/season/${season}?language=uk-UA&append_to_response=credits,aggregate_credits,images,external_ids&include_image_language=uk,en,null`;

    try {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const item = await response.json();

        const parsed = parseCredits(item, true); // Парсимо з агрегацією
        item.cast = parsed.cast;
        item.crew = parsed.crew;

        // Генеруємо лінки
        item.external_links = {
            tmdb: `https://www.themoviedb.org/tv/${id}/season/${season}`,
            imdb: item.external_ids?.imdb_id ? `https://www.imdb.com/title/${item.external_ids.imdb_id}` : null,
            wikidata: item.external_ids?.wikidata_id ? `https://www.wikidata.org/wiki/${item.external_ids.wikidata_id}` : null,
            facebook: item.external_ids?.facebook_id ? `https://www.facebook.com/${item.external_ids.facebook_id}` : null,
            instagram: item.external_ids?.instagram_id ? `https://www.instagram.com/${item.external_ids.instagram_id}` : null,
            twitter: item.external_ids?.twitter_id ? `https://twitter.com/${item.external_ids.twitter_id}` : null,
        };

        return { data: item };
    } catch (error) {
        return { error: 'Помилка TMDB' };
    }
};

export const getTMDBEpisodeDetails = async (request, reply) => {
    const { id, season, episode } = request.params;
    const token = process.env.TMDB_READ_TOKEN;
    if (!token) return { error: 'Не налаштовано TMDB_READ_TOKEN у .env' };
    
    // Епізоди не мають aggregate_credits, але додаємо external_ids
    const url = `https://api.themoviedb.org/3/tv/${id}/season/${season}/episode/${episode}?language=uk-UA&append_to_response=credits,images,external_ids&include_image_language=uk,en,null`;

    try {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const item = await response.json();

        const parsed = parseCredits(item, false);
        
        // Об'єднуємо guest_stars з cast
        const rawGuests = item.guest_stars || [];
        const seenCast = new Set(parsed.cast.map(c => c.id));
        
        rawGuests.forEach(actor => {
            if (!seenCast.has(actor.id)) {
                seenCast.add(actor.id);
                parsed.cast.push({
                    id: actor.id, name: actor.name, character: actor.character, gender: actor.gender,
                    profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null,
                    episode_count: null
                });
            }
        });
        
        item.cast = parsed.cast;
        item.crew = parsed.crew;

        if (item.images?.stills) {
            item.images.backdrops = item.images.stills;
        }

        item.external_links = {
            tmdb: `https://www.themoviedb.org/tv/${id}/season/${season}/episode/${episode}`,
            imdb: item.external_ids?.imdb_id ? `https://www.imdb.com/title/${item.external_ids.imdb_id}` : null,
            wikidata: item.external_ids?.wikidata_id ? `https://www.wikidata.org/wiki/${item.external_ids.wikidata_id}` : null,
            facebook: item.external_ids?.facebook_id ? `https://www.facebook.com/${item.external_ids.facebook_id}` : null,
            instagram: item.external_ids?.instagram_id ? `https://www.instagram.com/${item.external_ids.instagram_id}` : null,
            twitter: item.external_ids?.twitter_id ? `https://twitter.com/${item.external_ids.twitter_id}` : null,
        };

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
        return { error: 'Не налаштовано TMDB_READ_TOKEN у .env' };
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
        return { error: 'Помилка TMDB', details: error.message };
    }
};