// src/controllers/tmdb.js

export const searchTMDB = async (request, reply) => {
    const { query, type = 'multi' } = request.query;
    
    if (!query) {
        reply.code(400);
        return { error: 'Вкажіть запит для пошуку (query)' };
    }

    const token = process.env.TMDB_READ_TOKEN;
    if (!token) {
        reply.code(500);
        return { error: 'Не налаштовано TMDB_READ_TOKEN в .env' };
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
        
        const results = data.results.map(item => ({
            tmdb_id: item.id,
            title: item.title || item.name, 
            media_type: item.media_type || (type === 'tv' ? 'series' : 'movie'),
            release_date: item.release_date || item.first_air_date,
            description: item.overview,
            poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            original_language: item.original_language
        }));

        return { data: results };
    } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: 'Помилка при пошуку в TMDB', details: error.message };
    }
};

const getJobTranslation = (job, gender) => {
    const isFemale = gender === 1;
    
    const translations = {
        'Director': isFemale ? 'режисерка' : 'режисер',
        'Screenplay': isFemale ? 'сценаристка' : 'сценарист',
        'Writer': isFemale ? 'сценаристка' : 'сценарист',
        'Story': isFemale ? 'авторка сюжету' : 'автор сюжету',
        'Director of Photography': isFemale ? 'операторка' : 'оператор',
        'Original Music Composer': isFemale ? 'композиторка' : 'композитор',
        'Music': isFemale ? 'композиторка' : 'композитор',
        'Producer': isFemale ? 'продюсерка' : 'продюсер',
        'Executive Producer': isFemale ? 'виконавча продюсерка' : 'виконавчий продюсер',
        'Co-Producer': isFemale ? 'співпродюсерка' : 'співпродюсер',
        'Editor': isFemale ? 'монтажерка' : 'монтажер',
        'Production Design': 'художник-постановник',
        'Art Direction': 'арт-директор',
        'Set Decoration': 'декоратор',
        'Costume Design': isFemale ? 'художниця по костюмах' : 'художник по костюмах',
        'Makeup Artist': 'візажист',
        'Hairstylist': 'стиліст по зачісках',
        'Casting': 'кастинг-директор',
        'Sound Designer': 'звукорежисер',
        'Visual Effects Supervisor': 'супервайзер візуальних ефектів',
        'Stunt Coordinator': 'постановник трюків'
    };

    return translations[job] || job; 
};

export const getTMDBDetails = async (request, reply) => {
    const { id, type } = request.params;
    
    const tmdbType = type === 'series' ? 'tv' : 'movie';
    const token = process.env.TMDB_READ_TOKEN;

    if (!token) {
        reply.code(500);
        return { error: 'Не налаштовано TMDB_READ_TOKEN в .env' };
    }

    const url = `https://api.themoviedb.org/3/${tmdbType}/${id}?language=uk-UA&append_to_response=credits,external_ids,images,release_dates&include_image_language=uk,en,null`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${token}`
            }
        });
        
        if (response.status === 404) {
            reply.code(404);
            return { error: 'Медіа не знайдено на TMDB' };
        }
        
        if (!response.ok) throw new Error(`Помилка TMDB API: ${response.statusText}`);
        
        const item = await response.json();
        
        const cast = item.credits?.cast?.map(actor => ({
            id: actor.id,
            name: actor.name,
            character: actor.character,
            gender: actor.gender,
            profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
        })) || [];

        let crew = [];
        const rawCrew = item.credits?.crew || [];
        const uniqueCrew = [];
        const seen = new Set();

        for (const member of rawCrew) {
            const translatedJob = getJobTranslation(member.job, member.gender);
            const key = `${member.id}-${member.job}`; 
            
            if (!seen.has(key)) {
                seen.add(key);
                uniqueCrew.push({
                    id: member.id,
                    name: member.name,
                    job: translatedJob,
                    original_job: member.job,
                    gender: member.gender,
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
                        id: creator.id,
                        name: creator.name,
                        job: creator.gender === 1 ? 'творчиня' : 'творець',
                        original_job: 'Creator',
                        gender: creator.gender,
                        profile_path: creator.profile_path ? `https://image.tmdb.org/t/p/w185${creator.profile_path}` : null
                    });
                }
            }
        }

        const jobPriority = ['Director', 'Creator', 'Screenplay', 'Writer', 'Director of Photography', 'Original Music Composer', 'Producer'];
        crew = uniqueCrew
            .sort((a, b) => {
                const idxA = jobPriority.indexOf(a.original_job);
                const idxB = jobPriority.indexOf(b.original_job);
                if (idxA === -1 && idxB === -1) return a.original_job.localeCompare(b.original_job);
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });

        const seasons = tmdbType === 'tv' && item.seasons ? item.seasons.map(s => ({
            season_number: s.season_number,
            name: s.name,
            episode_count: s.episode_count,
            air_date: s.air_date,
            poster_path: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null
        })).filter(s => s.season_number > 0) : [];

        const images = {
            backdrops: item.images?.backdrops?.map(img => img.file_path) || [],
            posters: item.images?.posters?.map(img => img.file_path) || [],
            logos: item.images?.logos?.map(img => img.file_path) || []
        };

        let releases = [];
        if (tmdbType === 'movie' && item.release_dates?.results) {
            releases = item.release_dates.results.map(r => ({
                country: r.iso_3166_1, 
                dates: r.release_dates.map(d => ({
                    type: d.type, 
                    date: d.release_date,
                    note: d.note
                }))
            }));
        } else if (tmdbType === 'tv') {
            releases = [{
                country: item.origin_country?.[0] || 'US',
                dates: [{
                    type: 6, 
                    date: item.first_air_date,
                    note: item.networks?.map(n => n.name).join(', ') || ''
                }]
            }];
        }

        // ДОДАНО: Формування посилань з external_ids
        const external_links = {
            homepage: item.homepage || null,
            tmdb: `https://www.themoviedb.org/${tmdbType}/${item.id}`,
            imdb: item.external_ids?.imdb_id ? `https://www.imdb.com/title/${item.external_ids.imdb_id}` : null,
            wikidata: item.external_ids?.wikidata_id ? `https://www.wikidata.org/wiki/${item.external_ids.wikidata_id}` : null,
            facebook: item.external_ids?.facebook_id ? `https://www.facebook.com/${item.external_ids.facebook_id}` : null,
            instagram: item.external_ids?.instagram_id ? `https://www.instagram.com/${item.external_ids.instagram_id}` : null,
            twitter: item.external_ids?.twitter_id ? `https://twitter.com/${item.external_ids.twitter_id}` : null,
            tiktok: item.external_ids?.tiktok_id ? `https://www.tiktok.com/@${item.external_ids.tiktok_id}` : null,
        };

        const detailedData = {
            tmdb_id: item.id,
            imdb_id: item.external_ids?.imdb_id || null,
            title: item.title || item.name,
            original_title: item.original_title || item.original_name,
            media_type: type,
            description: item.overview,
            tagline: item.tagline,
            genres: item.genres?.map(g => g.name) || [],
            release_date: item.release_date || item.first_air_date,
            status: item.status,
            runtime: tmdbType === 'movie' ? item.runtime : (item.episode_run_time?.[0] || null),
            poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            backdrop_path: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
            crew: crew, 
            cast: cast,
            total_seasons: item.number_of_seasons || 0,
            total_episodes: item.number_of_episodes || 0,
            seasons: seasons,
            images: images,
            releases: releases,
            external_links: external_links // Додано в об'єкт
        };

        return { data: detailedData };
    } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: 'Помилка при отриманні деталей з TMDB', details: error.message };
    }
};