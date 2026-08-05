// frontend/src/components/Tabs/TabMain.jsx
import React, { useMemo } from 'react';
import { Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { styles } from '../../styles/mediaDetailStyles';
import { InfoRow, HorizontalPeopleList, getCountryName, getLanguageName, formatDate, formatCurrency } from './TabShared';

export function TabMain({ media, tmdbData, omdbData }) {
  const navigate = useNavigate();
  const releaseYear = media.release_date ? media.release_date.split('-')[0] : '';

  const formatRuntime = (minutes) => {
    if (!minutes) return null;
    return `${minutes} хв.`;
  };

  const uniqueAltTitles = useMemo(() => {
    if (!tmdbData?.alternative_titles) return [];
    const mainTitleLower = media.title?.trim().toLowerCase() || '';
    const origTitleLower = media.original_title?.trim().toLowerCase() || '';
    
    return tmdbData.alternative_titles.filter(titleStr => {
      const match = titleStr.match(/(.+?)\s*\((\w+)\)$/);
      const cleanTitle = match ? match[1].trim().toLowerCase() : titleStr.trim().toLowerCase();
      return cleanTitle !== mainTitleLower && cleanTitle !== origTitleLower;
    });
  }, [tmdbData?.alternative_titles, media.title, media.original_title]);

  const mainSeasons = useMemo(() => {
    const seasons = tmdbData?.seasons || [];
    return [...seasons].sort((a, b) => {
      if (a.season_number === 0) return 1;
      if (b.season_number === 0) return -1;
      return a.season_number - b.season_number;
    });
  }, [tmdbData?.seasons]);

  const safeGenres = useMemo(() => {
    let rawGenres = [];
    if (Array.isArray(media?.genres)) rawGenres = media.genres;
    else if (typeof media?.genres === 'string') {
        try { rawGenres = JSON.parse(media.genres); } catch (e) {}
    }
    
    if ((!rawGenres || rawGenres.length === 0) && Array.isArray(tmdbData?.genres)) {
        rawGenres = tmdbData.genres;
    }
    
    return Array.isArray(rawGenres) ? rawGenres.filter(g => typeof g === 'string' && g.trim() !== '') : [];
  }, [media?.genres, tmdbData?.genres]);

  const festivalPremiere = useMemo(() => {
    if (!tmdbData?.releases) return null;
    let earliestFestival = null;
    let earliestTheatrical = null;

    tmdbData.releases.forEach(r => {
        r.dates.forEach(d => {
            const dateObj = new Date(d.date);
            if (d.type === 1) { // Festival
                if (!earliestFestival || dateObj < earliestFestival.date) {
                    earliestFestival = { date: dateObj, rawDate: d.date, note: d.note };
                }
            }
            if (d.type === 2 || d.type === 3) { // Theatrical
                if (!earliestTheatrical || dateObj < earliestTheatrical.date) {
                    earliestTheatrical = { date: dateObj, rawDate: d.date };
                }
            }
        });
    });

    if (earliestFestival && (!earliestTheatrical || earliestFestival.date <= earliestTheatrical.date)) {
        return earliestFestival;
    }
    return null;
  }, [tmdbData]);

  const worldTheatricalPremiere = useMemo(() => {
    if (!tmdbData?.releases) return tmdbData?.world_premiere || null;
    let earliestTheatrical = null;
    tmdbData.releases.forEach(r => {
      r.dates.forEach(d => {
        if (d.type === 2 || d.type === 3) {
          const dDate = new Date(d.date);
          if (!earliestTheatrical || dDate < earliestTheatrical.date) {
            earliestTheatrical = { date: dDate, rawDate: d.date };
          }
        }
      });
    });
    return earliestTheatrical ? earliestTheatrical.rawDate : tmdbData?.world_premiere;
  }, [tmdbData]);

  const hasFestival = !!festivalPremiere;
  const hasTheatrical = !!worldTheatricalPremiere;
  const isSameDate = hasFestival && hasTheatrical && festivalPremiere.rawDate === worldTheatricalPremiere;

  const renderRatings = () => {
    if (!omdbData || !omdbData.Ratings || omdbData.Ratings.length === 0) return null;
    return (
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {omdbData.Ratings.map((rating, idx) => {
          let bgColor = '#1e293b';
          let textColor = '#fff';
          let borderColor = '#334155';
          let label = rating.Source;

          if (rating.Source === 'Internet Movie Database') {
            bgColor = '#f5c518'; textColor = '#000'; borderColor = '#f5c518'; label = 'IMDb';
          } else if (rating.Source === 'Rotten Tomatoes') {
            bgColor = '#fa320a'; textColor = '#fff'; borderColor = '#fa320a';
          } else if (rating.Source === 'Metacritic') {
            bgColor = '#61c700'; textColor = '#fff'; borderColor = '#61c700';
          }

          return (
            <div key={idx} style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              backgroundColor: bgColor, color: textColor, 
              padding: '6px 12px', borderRadius: '8px', 
              border: `1px solid ${borderColor}`, fontWeight: 'bold', fontSize: '14px' 
            }}>
              <span>{label}:</span>
              <span>{rating.Value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div style={styles.headerBlock}>
        <h1 style={styles.mainTitle}>{media.title} {releaseYear && <span style={styles.year}>({releaseYear})</span>}</h1>
        {media.original_title && <h2 style={styles.originalTitle}>{media.original_title}</h2>}
        {tmdbData?.tagline && <p style={styles.tagline}>"{tmdbData.tagline}"</p>}
      </div>

      {renderRatings()}

      {omdbData?.Awards && omdbData.Awards !== 'N/A' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.3)', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', color: '#facc15' }}>
          <Award size={20} />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{omdbData.Awards}</span>
        </div>
      )}

      <div style={styles.detailsBox}>
        <InfoRow label="Країна:" value={tmdbData?.production_countries?.map(getCountryName).join(', ')} />
        <InfoRow label="Мова оригіналу:" value={getLanguageName(tmdbData?.original_language)} />
        <InfoRow label="Тривалість:" value={formatRuntime(tmdbData?.runtime || media.runtime)} />
        <InfoRow label="Віковий рейтинг:" value={tmdbData?.age_rating ? `${tmdbData.age_rating}` : null} />
        
        {festivalPremiere && (
          <InfoRow label="Прем'єра:">
            {formatDate(festivalPremiere.rawDate)}
            {(!isSameDate || hasTheatrical) && <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px', fontWeight: 'normal' }}>{festivalPremiere.note}</span>}
          </InfoRow>
        )}

        {worldTheatricalPremiere && (!isSameDate) && (
          <InfoRow label="Прем'єра у світі:">
            {formatDate(worldTheatricalPremiere)}
            {hasFestival && <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px', fontWeight: 'normal' }}>кінопрокат</span>}
          </InfoRow>
        )}

        {tmdbData?.ua_premiere && (
          <InfoRow label="Прем'єра в Україні:" value={formatDate(tmdbData.ua_premiere)} />
        )}

        <InfoRow label="Цифровий реліз:" value={formatDate(tmdbData?.digital_premiere)} />
        <InfoRow label="Бюджет:" value={formatCurrency(tmdbData?.budget)} />
        <InfoRow label="Збори:" value={formatCurrency(tmdbData?.revenue)} />
        <InfoRow label="Студії:" value={tmdbData?.production_companies?.join(', ')} />
        
        {uniqueAltTitles.length > 0 && (
          <InfoRow label="Альтернативні назви:">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {uniqueAltTitles.map((titleStr, idx) => {
                 const match = titleStr.match(/(.+?)\s*\((\w+)\)$/);
                 if (match) {
                    return <span key={idx}>{match[1]} <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '4px' }}>{getCountryName(match[2])}</span></span>;
                 }
                 return <span key={idx}>{titleStr}</span>;
              })}
            </div>
          </InfoRow>
        )}
      </div>

      <div style={styles.genresContainer}>
        {safeGenres.length > 0 ? (
          safeGenres.map((genre, idx) => <span key={idx} style={styles.genreBadge}>{genre}</span>)
        ) : (
          <span style={styles.genreBadge}>Жанри не вказані</span>
        )}
      </div>

      {tmdbData?.description && (
        <div style={styles.sectionBlock}>
          <p style={styles.descriptionText}>{tmdbData.description}</p>
        </div>
      )}

      {mainSeasons.length > 0 && (
        <div style={styles.sectionBlock}>
          <h3 style={styles.sectionTitle}>Сезони та спецвипуски:</h3>
          <div className="custom-scroll" style={styles.horizontalScroll}>
            {mainSeasons.map((season) => (
              <div 
                key={`main-season-${season.season_number}`} 
                style={{...styles.personCard, cursor: 'pointer'}}
                onClick={() => navigate(`/media/${media.media_type}/${tmdbData.tmdb_id}/season/${season.season_number}`)}
              >
                <img src={season.poster_path ? `https://image.tmdb.org/t/p/w342${season.poster_path}` : 'https://via.placeholder.com/105x155?text=No+Poster'} alt={season.name} style={styles.personPhoto} loading="lazy" />
                <div style={styles.personName}>
                  {season.season_number === 0 && !season.name.toLowerCase().includes('спец') ? 'Спецвипуски' : season.name}
                </div>
                <div style={styles.personRole}>{season.episode_count} еп.</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <HorizontalPeopleList title="У ролях:" people={tmdbData?.cast} />
      <HorizontalPeopleList title="Автори:" people={tmdbData?.crew} isCrew={true} />
    </>
  );
}

export function TabMainSeason({ tmdbData }) {
  return (
    <>
      <div style={styles.detailsBox}>
        <InfoRow label="Дата виходу:" value={formatDate(tmdbData?.air_date)} />
        <InfoRow label="Кількість епізодів:" value={tmdbData?.episodes?.length} />
      </div>

      {tmdbData?.overview && (
        <div style={styles.sectionBlock}>
          <p style={styles.descriptionText}>{tmdbData.overview}</p>
        </div>
      )}

      <HorizontalPeopleList title="У ролях:" people={tmdbData?.cast} />
      <HorizontalPeopleList title="Автори:" people={tmdbData?.crew} isCrew={true} />
    </>
  );
}

export function TabMainEpisode({ tmdbData }) {
  return (
    <>
      <div style={styles.detailsBox}>
        <InfoRow label="Дата виходу:" value={formatDate(tmdbData?.air_date)} />
        <InfoRow label="Тривалість:" value={tmdbData?.runtime ? `${tmdbData.runtime} хв.` : '-'} />
        <InfoRow label="Оцінка TMDB:" value={tmdbData?.vote_average > 0 ? `${tmdbData.vote_average.toFixed(1)} / 10` : '-'} />
      </div>

      {tmdbData?.overview && (
        <div style={styles.sectionBlock}>
          <p style={styles.descriptionText}>{tmdbData.overview}</p>
        </div>
      )}

      <HorizontalPeopleList title="У ролях:" people={tmdbData?.cast} />
      <HorizontalPeopleList title="Автори:" people={tmdbData?.crew} isCrew={true} />
    </>
  );
}