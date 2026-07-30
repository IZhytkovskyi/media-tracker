// frontend/src/components/MediaTabs.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, Globe, Database, ExternalLink, Link as LinkIcon, Tv, 
  Trash2, Calendar, Star, Pen, Plus, X, ChevronLeft, ChevronRight, 
  Popcorn, Disc, MonitorPlay, Video, Filter 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { styles } from '../styles/mediaDetailStyles';

const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

const getCountryName = (isoCode) => {
  try {
    const displayNames = new Intl.DisplayNames(['uk'], { type: 'region' });
    return displayNames.of(isoCode);
  } catch (e) {
    return isoCode;
  }
};

const getLanguageName = (isoCode) => {
  try {
    const displayNames = new Intl.DisplayNames(['uk'], { type: 'language' });
    return displayNames.of(isoCode);
  } catch (e) {
    return isoCode;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatCurrency = (amount) => {
  if (!amount || amount === 0) return null;
  return '$' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- 1. Вкладка "Головна" ---
export function TabMain({ media, tmdbData }) {
  const navigate = useNavigate();
  const releaseYear = media.release_date ? media.release_date.split('-')[0] : '';

  const formatRuntime = (minutes) => {
    if (!minutes) return null;
    return `${minutes} хв.`;
  };

  const InfoRow = ({ label, value, children }) => {
    if (!value && !children) return null;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'baseline' }}>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>{label}</span>
        <div style={{ color: '#f8fafc', fontSize: '14px', lineHeight: '1.4' }}>
          {children || value}
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={styles.headerBlock}>
        <h1 style={styles.mainTitle}>
          {media.title} {releaseYear && <span style={styles.year}>({releaseYear})</span>}
        </h1>
        {media.original_title && <h2 style={styles.originalTitle}>{media.original_title}</h2>}
        {tmdbData?.tagline && <p style={styles.tagline}>"{tmdbData.tagline}"</p>}
      </div>

      <div style={styles.detailsBox}>
        <InfoRow label="Країна:" value={tmdbData?.production_countries?.map(getCountryName).join(', ')} />
        <InfoRow label="Мова:" value={getLanguageName(tmdbData?.original_language)} />
        <InfoRow label="Тривалість:" value={formatRuntime(tmdbData?.runtime || media.runtime)} />
        <InfoRow label="Вік:" value={tmdbData?.age_rating ? `${tmdbData.age_rating}` : null} />
        
        <InfoRow label="Прем'єра у світі:">
          {tmdbData?.world_premiere && (
            <span>{formatDate(tmdbData.world_premiere)}</span>
          )}
        </InfoRow>
        <InfoRow label="Прем'єра в Україні:" value={formatDate(tmdbData?.ua_premiere)} />
        <InfoRow label="Цифрова прем'єра:" value={formatDate(tmdbData?.digital_premiere)} />
        <InfoRow label="Бюджет:" value={formatCurrency(tmdbData?.budget)} />
        <InfoRow label="Збори:" value={formatCurrency(tmdbData?.revenue)} />
        <InfoRow label="Студії:" value={tmdbData?.production_companies?.join(', ')} />
        
        {tmdbData?.alternative_titles && tmdbData.alternative_titles.length > 0 && (
          <InfoRow label="Також відомий як:">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {tmdbData.alternative_titles.map((titleStr, idx) => {
                 const match = titleStr.match(/(.+?)\s*\((\w+)\)$/);
                 if (match) {
                    return (
                      <span key={idx}>
                        {match[1]} <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '4px' }}>{getCountryName(match[2])}</span>
                      </span>
                    );
                 }
                 return <span key={idx}>{titleStr}</span>;
              })}
            </div>
          </InfoRow>
        )}
      </div>

      <div style={styles.genresContainer}>
        {media.genres && media.genres.length > 0 ? (
          media.genres.map((genre, idx) => <span key={idx} style={styles.genreBadge}>{genre}</span>)
        ) : (
          <span style={styles.genreBadge}>Немає жанрів</span>
        )}
      </div>

      {tmdbData?.description && (
        <div style={styles.sectionBlock}>
          <p style={styles.descriptionText}>{tmdbData.description}</p>
        </div>
      )}

      {tmdbData?.seasons && tmdbData.seasons.length > 0 && (
        <div style={styles.sectionBlock}>
          <h3 style={styles.sectionTitle}>Сезони:</h3>
          <div className="custom-scroll" style={styles.horizontalScroll}>
            {tmdbData.seasons.map((season) => (
              <div 
                key={season.season_number} 
                style={{...styles.personCard, cursor: 'pointer'}}
                onClick={() => navigate(`/media/${media.media_type}/${media.id}/season/${season.season_number}`)}
              >
                <img src={season.poster_path || 'https://via.placeholder.com/105x155?text=No+Poster'} alt={season.name} style={styles.personPhoto} />
                <div style={styles.personName}>{season.name}</div>
                <div style={styles.personRole}>{season.episode_count} епізодів</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tmdbData?.cast && tmdbData.cast.length > 0 && (
        <div style={styles.sectionBlock}>
          <h3 style={styles.sectionTitle}>У ролях:</h3>
          <div className="custom-scroll" style={styles.horizontalScroll}>
            {tmdbData.cast.slice(0, 12).map(actor => (
              <div 
                key={`actor-min-${actor.id}`} 
                style={{...styles.personCard, cursor: 'pointer'}} 
                onClick={() => navigate(`/person/${actor.id}`)}
              >
                <img src={actor.profile_path || 'https://via.placeholder.com/105x155?text=No+Photo'} alt={actor.name} style={styles.personPhoto} />
                <div style={styles.personName}>{actor.name}</div>
                <div style={styles.personRole}>{actor.character}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tmdbData?.crew && tmdbData.crew.length > 0 && (
        <div style={styles.sectionBlock}>
          <h3 style={styles.sectionTitle}>Автори:</h3>
          <div className="custom-scroll" style={styles.horizontalScroll}>
            {tmdbData.crew
              .filter(c => ['Director', 'Creator', 'Screenplay', 'Writer', 'Director of Photography', 'Original Music Composer'].includes(c.original_job))
              .slice(0, 12)
              .map((member, idx) => (
              <div 
                key={`crew-min-${member.id}-${idx}`} 
                style={{...styles.personCard, cursor: 'pointer'}}
                onClick={() => navigate(`/person/${member.id}`)}
              >
                <img src={member.profile_path || 'https://via.placeholder.com/105x155?text=Немає+фото'} alt={member.name} style={styles.personPhoto} />
                <div style={styles.personName}>{member.name}</div>
                <div style={styles.personRole}>{member.job}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// --- 2. Вкладка "Знімальна група" ---
export function TabActors({ tmdbData }) {
  const navigate = useNavigate();
  const [activeCrewTab, setActiveCrewTab] = useState('cast');
  const [visibleCount, setVisibleCount] = useState(14); 
  const ITEMS_PER_PAGE = 14;

  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [activeCrewTab]);

  const crewSubTabs = useMemo(() => {
    const tabs = [{ id: 'cast', label: 'Актори', jobs: [] }];
    if (!tmdbData?.crew) return tabs;

    const jobGroups = {
      'Режисура': ['Director', 'Creator'],
      'Сценарій': ['Screenplay', 'Writer', 'Story'],
      'Оператори': ['Director of Photography', 'Camera Operator'],
      'Композитори': ['Original Music Composer', 'Music'],
      'Продюсери': ['Producer', 'Executive Producer', 'Co-Producer'],
      'Художники': ['Production Design', 'Art Direction', 'Set Decoration'],
      'Монтаж': ['Editor'],
      'Костюми та грим': ['Costume Design', 'Makeup Artist', 'Hairstylist'],
      'Звук': ['Sound Designer', 'Original Music Composer']
    };

    const existingGroups = new Set();
    const ungroupedJobs = new Set();

    tmdbData.crew.forEach(member => {
      let isGrouped = false;
      for (const [groupName, jobList] of Object.entries(jobGroups)) {
        if (jobList.includes(member.original_job)) {
          existingGroups.add(groupName);
          isGrouped = true;
          break;
        }
      }
      if (!isGrouped) ungroupedJobs.add(member.original_job);
    });

    Object.keys(jobGroups).forEach(groupName => {
      if (existingGroups.has(groupName)) tabs.push({ id: groupName, label: groupName, jobs: jobGroups[groupName] });
    });

    Array.from(ungroupedJobs).sort().forEach(job => tabs.push({ id: job, label: job, jobs: [job] }));
    return tabs;
  }, [tmdbData]);

  const displayedCrew = useMemo(() => {
    if (!tmdbData) return [];
    if (activeCrewTab === 'cast') return tmdbData.cast || [];
    const currentTab = crewSubTabs.find(t => t.id === activeCrewTab);
    if (currentTab && currentTab.jobs) return tmdbData.crew.filter(c => currentTab.jobs.includes(c.original_job));
    return [];
  }, [tmdbData, activeCrewTab, crewSubTabs]);

  const paginatedCrew = displayedCrew.slice(0, visibleCount);
  const hasMoreCrew = visibleCount < displayedCrew.length;

  return (
    <>
      <div className="sub-tabs-container">
        {crewSubTabs.map(tab => {
          let hasPeople = tab.id === 'cast' ? tmdbData?.cast?.length > 0 : tmdbData?.crew?.some(c => tab.jobs.includes(c.original_job));
          if (!hasPeople) return null;
          return (
            <button key={tab.id} className={`sub-tab ${activeCrewTab === tab.id ? 'active' : ''}`} onClick={() => setActiveCrewTab(tab.id)}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {paginatedCrew.length > 0 ? (
        <>
          <div style={styles.peopleGrid}>
            {paginatedCrew.map((person, idx) => (
              <div 
                key={`${activeCrewTab}-${person.id}-${idx}`} 
                style={{...styles.gridPersonCard, cursor: 'pointer'}}
                onClick={() => navigate(`/person/${person.id}`)}
              >
                <img src={person.profile_path || 'https://via.placeholder.com/105x155?text=No+Photo'} alt={person.name} style={styles.personPhoto} />
                <div style={styles.personName}>{person.name}</div>
                <div style={styles.personRole}>{person.character || person.job}</div>
              </div>
            ))}
          </div>
          {hasMoreCrew && (
            <div style={styles.loadMoreContainer}>
              <button style={styles.loadMoreButton} onClick={() => setVisibleCount(p => p + ITEMS_PER_PAGE)}>
                Показати ще ({displayedCrew.length - visibleCount}) <ChevronDown size={16} />
              </button>
            </div>
          )}
        </>
      ) : <p style={styles.emptyText}>Немає інформації.</p>}
    </>
  );
}

// --- 3. Вкладка "Кадри" ---
export function TabShots({ tmdbData }) {
  const [activeShotsTab, setActiveShotsTab] = useState('backdrops');
  const [visibleImageCount, setVisibleImageCount] = useState(12);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [filterLang, setFilterLang] = useState('all');

  const IMAGES_PER_PAGE = 12;

  useEffect(() => { 
    setVisibleImageCount(IMAGES_PER_PAGE); 
    setFilterLang('all');
  }, [activeShotsTab]);

  const imageSubTabs = useMemo(() => {
    const tabs = [];
    if (tmdbData?.images?.backdrops?.length > 0) tabs.push({ id: 'backdrops', label: 'Фони' });
    if (tmdbData?.images?.posters?.length > 0) tabs.push({ id: 'posters', label: 'Постери' });
    if (tmdbData?.images?.logos?.length > 0) tabs.push({ id: 'logos', label: 'Логотипи' });
    return tabs;
  }, [tmdbData]);

  useEffect(() => {
    if (imageSubTabs.length > 0 && !imageSubTabs.find(t => t.id === activeShotsTab)) {
      setActiveShotsTab(imageSubTabs[0].id);
    }
  }, [imageSubTabs, activeShotsTab]);

  const rawImages = tmdbData?.images?.[activeShotsTab] || [];

  const availableLangs = useMemo(() => {
    const langs = new Set(rawImages.map(img => img.iso_639_1 || 'none'));
    return Array.from(langs).sort();
  }, [rawImages]);

  const displayedImages = useMemo(() => {
    let filtered = [...rawImages];
    
    if (filterLang !== 'all') {
      filtered = filtered.filter(img => (img.iso_639_1 || 'none') === filterLang);
    }

    const originalLang = tmdbData?.original_language;

    filtered.sort((a, b) => {
      // Пріоритетне сортування мов (застосовується найперше до постерів)
      if (activeShotsTab === 'posters') {
        const getPriority = (lang) => {
          if (lang === 'uk') return 1;
          if (lang === 'en') return 2;
          if (lang === originalLang) return 3;
          if (!lang || lang === 'none' || lang === 'null') return 4;
          return 5;
        };

        const pA = getPriority(a.iso_639_1);
        const pB = getPriority(b.iso_639_1);

        if (pA !== pB) return pA - pB;
      }

      // Якщо мови однакові (або це не постери), сортуємо за оцінкою TMDB (від найвищої до найнижчої)
      return (b.vote_average || 0) - (a.vote_average || 0);
    });

    return filtered;
  }, [rawImages, filterLang, activeShotsTab, tmdbData]);

  const paginatedImages = displayedImages.slice(0, visibleImageCount);
  const hasMoreImages = visibleImageCount < displayedImages.length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        {/* Підвкладки */}
        {imageSubTabs.length > 0 ? (
          <div className="sub-tabs-container" style={{ marginBottom: 0 }}>
            {imageSubTabs.map(tab => (
              <button key={tab.id} className={`sub-tab ${activeShotsTab === tab.id ? 'active' : ''}`} onClick={() => setActiveShotsTab(tab.id)}>
                {tab.label} ({tmdbData?.images?.[tab.id]?.length || 0})
              </button>
            ))}
          </div>
        ) : <p style={styles.emptyText}>Немає зображень.</p>}

        {/* Кастомний фільтр */}
        {rawImages.length > 0 && (
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '14px', pointerEvents: 'none', display: 'flex', color: '#38bdf8' }}>
              <Filter size={16} />
            </div>
            <select
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value)}
              style={{ 
                appearance: 'none',
                WebkitAppearance: 'none',
                background: 'rgba(56, 189, 248, 0.05)', 
                color: '#38bdf8', 
                border: '1px solid rgba(56, 189, 248, 0.2)', 
                padding: '8px 40px', 
                borderRadius: '20px', 
                fontSize: '13px', 
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => {
                 e.target.style.background = 'rgba(56, 189, 248, 0.1)';
                 e.target.style.borderColor = 'rgba(56, 189, 248, 0.4)';
              }}
              onMouseLeave={(e) => {
                 e.target.style.background = 'rgba(56, 189, 248, 0.05)';
                 e.target.style.borderColor = 'rgba(56, 189, 248, 0.2)';
              }}
            >
              <option value="all" style={{ background: '#1e293b', color: '#f8fafc' }}>Всі мови</option>
              {availableLangs.map(lang => (
                <option key={lang} value={lang} style={{ background: '#1e293b', color: '#f8fafc' }}>
                  {lang === 'none' ? 'Без тексту' : lang.toUpperCase()}
                </option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '14px', pointerEvents: 'none', display: 'flex', color: '#38bdf8' }}>
              <ChevronDown size={16} />
            </div>
          </div>
        )}
      </div>

      {paginatedImages.length > 0 ? (
        <>
          <div style={{
            ...styles.imagesGrid, 
            gridTemplateColumns: activeShotsTab === 'posters' ? 'repeat(auto-fill, minmax(160px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))'
          }}>
            {paginatedImages.map((img, idx) => (
              <div key={`${activeShotsTab}-${idx}`} className="image-card" style={{ cursor: 'pointer' }} onClick={() => setLightboxIndex(idx)}>
                <img 
                  src={`https://image.tmdb.org/t/p/${activeShotsTab === 'backdrops' ? 'w780' : 'w500'}${img.file_path}`} 
                  alt={`Кадр ${idx}`} className={`img-${activeShotsTab}`} loading="lazy" 
                />
              </div>
            ))}
          </div>
          
          {hasMoreImages && (
            <div style={styles.loadMoreContainer}>
              <button style={styles.loadMoreButton} onClick={() => setVisibleImageCount(p => p + IMAGES_PER_PAGE)}>
                Показати ще ({displayedImages.length - visibleImageCount}) <ChevronDown size={16} />
              </button>
            </div>
          )}
        </>
      ) : rawImages.length > 0 ? (
        <p style={styles.emptyText}>За заданими фільтрами результатів не знайдено.</p>
      ) : null}

      {lightboxIndex !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <button 
            onClick={() => setLightboxIndex(null)}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10000 }}
          ><X size={36} /></button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => Math.max(prev - 1, 0)); }}
            style={{ position: 'absolute', left: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '15px', borderRadius: '50%', cursor: lightboxIndex === 0 ? 'default' : 'pointer', opacity: lightboxIndex === 0 ? 0.3 : 1 }}
            disabled={lightboxIndex === 0}
          ><ChevronLeft size={32} /></button>
          
          <img 
            src={`https://image.tmdb.org/t/p/original${displayedImages[lightboxIndex].file_path}`} 
            alt="Повний розмір"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
          />

          <button 
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => Math.min(prev + 1, displayedImages.length - 1)); }}
            style={{ position: 'absolute', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '15px', borderRadius: '50%', cursor: lightboxIndex === displayedImages.length - 1 ? 'default' : 'pointer', opacity: lightboxIndex === displayedImages.length - 1 ? 0.3 : 1 }}
            disabled={lightboxIndex === displayedImages.length - 1}
          ><ChevronRight size={32} /></button>
        </div>
      )}
    </>
  );
}

// --- 4. Вкладка "Прем'єри" ---
export function TabPremiere({ tmdbData }) {
  const getReleaseTypeInfo = (type) => {
    switch (type) {
      case 1: return { label: 'Світова прем\'єра', icon: <Star size={14} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 2: return { label: 'У кіно (Обмежено)', icon: <Video size={14} />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 3: return { label: 'У кіно', icon: <Popcorn size={14} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 4: return { label: 'Цифровий реліз', icon: <MonitorPlay size={14} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 5: return { label: 'На фізичних носіях', icon: <Disc size={14} />, color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
      case 6: return { label: 'На ТБ', icon: <Tv size={14} />, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' };
      default: return { label: 'Реліз', icon: <Calendar size={14} />, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  if (!tmdbData?.releases || tmdbData.releases.length === 0) {
    return <p style={styles.emptyText}>Немає інформації про релізи.</p>;
  }

  const productionCountries = tmdbData.production_countries || [];

  const sortedReleases = [...tmdbData.releases].sort((a, b) => {
    if (a.country === 'UA') return -1;
    if (b.country === 'UA') return 1;
    
    const aIsProd = productionCountries.includes(a.country);
    const bIsProd = productionCountries.includes(b.country);
    if (aIsProd && !bIsProd) return -1;
    if (!aIsProd && bIsProd) return 1;

    return getCountryName(a.country).localeCompare(getCountryName(b.country), 'uk');
  });

  return (
    <div style={styles.premiereContainer}>
      <h3 style={styles.sectionTitle}>Дати виходу</h3>
      <div style={{ ...styles.countryGrid, gap: '20px' }}>
        {sortedReleases.map((countryRelease) => {
          const isUkraine = countryRelease.country === 'UA';
          const isProducer = productionCountries.includes(countryRelease.country);

          return (
            <div key={countryRelease.country} style={{ 
              ...styles.countryCard, 
              backgroundColor: isUkraine ? 'rgba(56, 189, 248, 0.04)' : '#111827',
              borderColor: isUkraine ? '#0284c7' : (isProducer ? '#334155' : '#1e293b'),
              boxShadow: isUkraine ? '0 4px 12px rgba(2, 132, 199, 0.1)' : 'none'
            }}>
              <div style={{ ...styles.countryCardHeader, borderBottom: `1px solid ${isUkraine ? 'rgba(56, 189, 248, 0.2)' : '#1e293b'}`, paddingBottom: '12px' }}>
                <span style={{ fontSize: '28px', lineHeight: '1' }}>{getFlagEmoji(countryRelease.country)}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ ...styles.countryName, fontSize: '16px', fontWeight: isUkraine ? 'bold' : '600', color: isUkraine ? '#bae6fd' : '#f8fafc' }}>
                    {getCountryName(countryRelease.country)}
                  </h4>
                  {isProducer && !isUkraine && <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Країна-виробник</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[...countryRelease.dates].sort((a, b) => new Date(a.date) - new Date(b.date)).map((dateItem, idx) => {
                  const typeInfo = getReleaseTypeInfo(dateItem.type);
                  const isLast = idx === countryRelease.dates.length - 1;
                  
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', borderBottom: isLast ? 'none' : '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: typeInfo.color, backgroundColor: typeInfo.bg, padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                          {typeInfo.icon}
                          <span>{typeInfo.label}</span>
                        </div>
                        {dateItem.note && <span style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic', textAlign: 'right', maxWidth: '50%' }}>{dateItem.note}</span>}
                      </div>
                      <div style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {formatDate(dateItem.date)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- 5. Вкладка "Джерела" ---
export function TabSources({ tmdbData }) {
  if (!tmdbData?.external_links) return <p style={styles.emptyText}>Немає зовнішніх посилань.</p>;
  
  const links = tmdbData.external_links;
  
  const sourceGroups = [
    { title: 'Офіційні', icon: <Globe size={20} color="#38bdf8" />, items: [{ label: 'Офіційний сайт', url: links.homepage, icon: <LinkIcon size={18} /> }] },
    { title: 'Бази даних', icon: <Database size={20} color="#facc15" />, items: [{ label: 'TMDB', url: links.tmdb, icon: <Tv size={18} /> }, { label: 'IMDb', url: links.imdb, icon: <ExternalLink size={18} /> }, { label: 'Wikidata', url: links.wikidata, icon: <ExternalLink size={18} /> }] },
    { title: 'Соціальні мережі', icon: <ExternalLink size={20} color="#2ecc71" />, items: [{ label: 'Instagram', url: links.instagram, icon: <ExternalLink size={18} /> }, { label: 'Twitter (X)', url: links.twitter, icon: <ExternalLink size={18} /> }, { label: 'Facebook', url: links.facebook, icon: <ExternalLink size={18} /> }] }
  ];

  return (
    <div style={styles.sourcesContainer}>
      {sourceGroups.map((group, gIdx) => {
        const validItems = group.items.filter(item => item.url);
        if (validItems.length === 0) return null;
        
        return (
          <div key={gIdx} style={styles.sourceGroup}>
            <div style={styles.sourceGroupHeader}>{group.icon}<h3 style={styles.sectionTitle} className="mb-0">{group.title}</h3></div>
            <div style={styles.sourceGrid}>{validItems.map((item, iIdx) => (<a key={iIdx} href={item.url} target="_blank" rel="noopener noreferrer" className="source-card"><div className="source-icon-wrapper">{item.icon}</div><span className="source-label">{item.label}</span></a>))}</div>
          </div>
        );
      })}
    </div>
  );
}

// --- 6. Вкладка "Історія" ---
export function TabHistory({ logs, onDelete, onCreate, onUpdate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [formData, setFormData] = useState({ watch_date: '', rating: '' });

  const formatDateStr = (dateString) => {
    if (!dateString) return 'Невідомо';
    return new Date(dateString).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const openAddModal = () => {
    setEditingLogId(null);
    setFormData({ watch_date: getLocalDateString(), rating: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (log) => {
    setEditingLogId(log.id);
    setFormData({ 
      watch_date: log.watch_date || '', 
      rating: log.rating !== null && log.rating !== undefined ? log.rating : '' 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { 
      watch_date: formData.watch_date || getLocalDateString(), 
      rating: formData.rating === '' ? null : parseFloat(formData.rating) 
    };
    
    if (editingLogId) {
      onUpdate(editingLogId, payload);
    } else {
      onCreate(payload);
    }
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={styles.sectionTitle} className="mb-0">Історія переглядів</h3>
        <button onClick={openAddModal} style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
          <Plus size={16} /> Додати
        </button>
      </div>

      {(!logs || logs.length === 0) ? (
        <p style={styles.emptyText}>Ще немає записів про перегляд.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          {logs.map((log, index) => (
            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: '16px 20px', borderRadius: '12px', border: index === 0 ? '1px solid #38bdf8' : '1px solid #333' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ backgroundColor: '#2a2a2a', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={20} color="#a3a3a3" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>
                    {formatDateStr(log.watch_date)}
                    {index === 0 && <span style={{ marginLeft: '10px', fontSize: '11px', color: '#38bdf8', border: '1px solid #38bdf8', padding: '2px 6px', borderRadius: '4px' }}>Останній</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <Star size={14} color={log.rating !== null && log.rating !== undefined ? "#facc15" : "#555"} fill={log.rating !== null && log.rating !== undefined ? "#facc15" : "none"} />
                    <span style={{ color: log.rating !== null && log.rating !== undefined ? '#facc15' : '#555', fontSize: '14px', fontWeight: '500' }}>
                      {log.rating !== null && log.rating !== undefined ? `${log.rating} / 5` : 'Без оцінки'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => openEditModal(log)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#a3a3a3' }}><Pen size={18} /></button>
                <button onClick={() => onDelete(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#ef4444' }}><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid #334155' }}>
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '20px' }}>{editingLogId ? 'Редагувати запис' : 'Додати запис'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: '#94a3b8', fontSize: '13px' }}>Дата перегляду</label>
                <input type="date" value={formData.watch_date} onChange={e => setFormData({...formData, watch_date: e.target.value})} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: '#94a3b8', fontSize: '13px' }}>Оцінка (0 - 5, необов'язково)</label>
                <input type="number" step="0.5" min="0" max="5" placeholder="Наприклад: 4.5" value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value})} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: '1px solid #444', color: '#ccc', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Скасувати</button>
                <button type="submit" style={{ background: '#38bdf8', border: 'none', color: '#000', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}