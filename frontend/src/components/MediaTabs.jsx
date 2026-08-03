// frontend/src/components/MediaTabs.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronDown, Globe, Database, ExternalLink, Link as LinkIcon, Tv, 
  Trash2, Calendar, Star, Pen, Plus, X, ChevronLeft, ChevronRight,
  Popcorn, Disc, MonitorPlay, Video, Filter, User, Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { styles } from '../styles/mediaDetailStyles';
import { getLocalDateString } from '../utils';

const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

const getCountryName = (isoCode) => {
  if (isoCode === 'US') return 'США';
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

const PersonImage = ({ src, alt }) => {
  if (src) {
    return <img src={src} alt={alt} style={styles.personPhoto} loading="lazy" />;
  }
  return (
    <div style={{
      ...styles.personPhoto, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#1e293b', 
      color: '#64748b'
    }}>
      <User size={40} strokeWidth={1.5} />
    </div>
  );
};

const HorizontalPeopleList = ({ title, people, isCrew = false, limit = 12 }) => {
  const navigate = useNavigate();
  if (!people || people.length === 0) return null;
  
  let displayPeople = people;
  if (isCrew) {
    const mainJobs = ['Director', 'Creator', 'Screenplay', 'Writer', 'Director of Photography', 'Original Music Composer'];
    displayPeople = people.filter(c => mainJobs.includes(c.original_job));
  }
  displayPeople = displayPeople.slice(0, limit);
  
  if (displayPeople.length === 0) return null;

  return (
    <div style={styles.sectionBlock}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <div className="custom-scroll" style={styles.horizontalScroll}>
        {displayPeople.map((person, idx) => (
          <div 
            key={`${isCrew ? 'crew' : 'actor'}-${person.id}-${idx}`} 
            style={{...styles.personCard, cursor: 'pointer'}}
            onClick={() => navigate(`/person/${person.id}`)}
          >
            <PersonImage src={person.profile_path} alt={person.name} />
            <div style={styles.personName}>{person.name}</div>
            <div style={styles.personRole}>
              {isCrew ? person.job : person.character}
              {person.episode_count && (
                <div style={{fontSize: '11px', color: '#38bdf8', marginTop: '2px'}}>
                  {person.episode_count} {person.episode_count % 10 === 1 && person.episode_count % 100 !== 11 ? 'епізод' : (person.episode_count % 10 >= 2 && person.episode_count % 10 <= 4 && (person.episode_count % 100 < 10 || person.episode_count % 100 >= 20) ? 'епізоди' : 'епізодів')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ScrollableSubTabs = ({ tabs, activeTab, onTabChange, containerStyle = {} }) => {
  const scrollRef = useRef(null);
  const [showArrows, setShowArrows] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        setShowArrows(scrollRef.current.scrollWidth > scrollRef.current.clientWidth + 5);
      }
    };
    checkScroll();
    setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', marginBottom: '25px', ...containerStyle }}>
      <style>{`
        .scroll-btn-hover:hover { background: var(--dominant-color-strong, #38bdf8) !important; transform: scale(1.1); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {showArrows && <button onClick={() => scroll('left')} style={scrollBtnStyle} className="scroll-btn-hover"><ChevronLeft size={16} /></button>}
      
      <div ref={scrollRef} className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollBehavior: 'smooth', flexWrap: 'nowrap', padding: '4px 2px' }}>
        {tabs.map(tab => (
          <button key={tab.id} className={`sub-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => onTabChange(tab.id)} style={{ flexShrink: 0 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {showArrows && <button onClick={() => scroll('right')} style={scrollBtnStyle} className="scroll-btn-hover"><ChevronRight size={16} /></button>}
    </div>
  );
};

const scrollBtnStyle = {
  background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff',
  borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease', boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
};


// --- 1. Вкладка "Інфо" (Головна) ---
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

  const mainSeasons = tmdbData?.seasons?.filter(s => s.season_number > 0) || [];

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

  // Оцінки з OMDb
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
            bgColor = '#f5c518';
            textColor = '#000';
            borderColor = '#f5c518';
            label = 'IMDb';
          } else if (rating.Source === 'Rotten Tomatoes') {
            bgColor = '#fa320a';
            textColor = '#fff';
            borderColor = '#fa320a';
          } else if (rating.Source === 'Metacritic') {
            bgColor = '#61c700'; // зелений для хороших оцінок (за замовчуванням)
            textColor = '#fff';
            borderColor = '#61c700';
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

      {/* Рейтинги OMDb */}
      {renderRatings()}

      {/* Нагороди OMDb */}
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
        <InfoRow label="Вік:" value={tmdbData?.age_rating ? `${tmdbData.age_rating}` : null} />
        
        {festivalPremiere && (
          <InfoRow label="Прем'єра у світі:">
            {formatDate(festivalPremiere.rawDate)}
            {(!isSameDate || hasTheatrical) && <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px', fontWeight: 'normal' }}>фестиваль</span>}
          </InfoRow>
        )}

        {worldTheatricalPremiere && (!isSameDate) && (
          <InfoRow label="Прем'єра у світі:">
            {formatDate(worldTheatricalPremiere)}
            {hasFestival && <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px', fontWeight: 'normal' }}>кінопрокат</span>}
          </InfoRow>
        )}

        {tmdbData?.ua_premiere && (
          <InfoRow 
            label="Прем'єра в Україні:" 
            value={formatDate(tmdbData.ua_premiere)} 
          />
        )}

        <InfoRow label="Цифровий реліз:" value={formatDate(tmdbData?.digital_premiere)} />
        <InfoRow label="Бюджет:" value={formatCurrency(tmdbData?.budget)} />
        <InfoRow label="Збори:" value={formatCurrency(tmdbData?.revenue)} />
        <InfoRow label="Студії:" value={tmdbData?.production_companies?.join(', ')} />
        
        {uniqueAltTitles.length > 0 && (
          <InfoRow label="Також відомий як:">
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
        {media.genres && media.genres.length > 0 ? media.genres.map((genre, idx) => <span key={idx} style={styles.genreBadge}>{genre}</span>) : <span style={styles.genreBadge}>Немає жанрів</span>}
      </div>

      {tmdbData?.description && (
        <div style={styles.sectionBlock}>
          <p style={styles.descriptionText}>{tmdbData.description}</p>
        </div>
      )}

      {mainSeasons.length > 0 && (
        <div style={styles.sectionBlock}>
          <h3 style={styles.sectionTitle}>Сезони:</h3>
          <div className="custom-scroll" style={styles.horizontalScroll}>
            {mainSeasons.map((season) => (
              <div 
                key={`main-season-${season.season_number}`} 
                style={{...styles.personCard, cursor: 'pointer'}}
                onClick={() => navigate(`/media/${media.media_type}/${tmdbData.tmdb_id}/season/${season.season_number}`)}
              >
                <img src={season.poster_path || 'https://via.placeholder.com/105x155?text=No+Poster'} alt={season.name} style={styles.personPhoto} loading="lazy" />
                <div style={styles.personName}>{season.name}</div>
                <div style={styles.personRole}>{season.episode_count} епізодів</div>
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

// --- Вкладка "Інфо" (Сезон) ---
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

      <HorizontalPeopleList title="У головних ролях:" people={tmdbData?.cast} />
      <HorizontalPeopleList title="Команда:" people={tmdbData?.crew} isCrew={true} />
    </>
  );
}

// --- Вкладка "Інфо" (Епізод) ---
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


// --- 2. Вкладка Команда ---
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
      'Режисери': ['Director', 'Creator'],
      'Сценаристи': ['Screenplay', 'Writer', 'Story'],
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

  const crewTabsForScroll = crewSubTabs
    .filter(tab => tab.id === 'cast' ? tmdbData?.cast?.length > 0 : tmdbData?.crew?.some(c => tab.jobs.includes(c.original_job)))
    .map(tab => ({ id: tab.id, label: tab.label }));

  const paginatedCrew = displayedCrew.slice(0, visibleCount);
  const hasMoreCrew = visibleCount < displayedCrew.length;

  return (
    <>
      <style>{`
        @keyframes fadeInScale { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-grid { animation: fadeInScale 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
      
      {crewTabsForScroll.length > 0 && (
        <ScrollableSubTabs tabs={crewTabsForScroll} activeTab={activeCrewTab} onTabChange={setActiveCrewTab} />
      )}

      {paginatedCrew.length > 0 ? (
        <div key={activeCrewTab} className="animated-grid">
          <div style={styles.peopleGrid}>
            {paginatedCrew.map((person, idx) => (
              <div 
                key={`${activeCrewTab}-${person.id}-${idx}`} 
                style={{...styles.gridPersonCard, cursor: 'pointer'}}
                onClick={() => navigate(`/person/${person.id}`)}
              >
                <PersonImage src={person.profile_path} alt={person.name} />
                <div style={styles.personName}>{person.name}</div>
                <div style={styles.personRole}>
                  {person.character || person.job}
                  {person.episode_count ? <div style={{fontSize: '11px', color: '#38bdf8', marginTop: '2px'}}>{person.episode_count} еп.</div> : null}
                </div>
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
        </div>
      ) : <p style={styles.emptyText}>Немає даних.</p>}
    </>
  );
}


// --- 3. Вкладка Кадри ---
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
      return (b.vote_average || 0) - (a.vote_average || 0);
    });

    return filtered;
  }, [rawImages, filterLang, activeShotsTab, tmdbData]);

  const imageTabsForScroll = imageSubTabs.map(tab => ({
    id: tab.id, label: `${tab.label} (${tmdbData?.images?.[tab.id]?.length || 0})`
  }));

  const paginatedImages = displayedImages.slice(0, visibleImageCount);
  const hasMoreImages = visibleImageCount < displayedImages.length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        {imageTabsForScroll.length > 0 ? (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <ScrollableSubTabs tabs={imageTabsForScroll} activeTab={activeShotsTab} onTabChange={setActiveShotsTab} containerStyle={{ marginBottom: 0 }} />
          </div>
        ) : <p style={styles.emptyText}>Немає зображень.</p>}

        {rawImages.length > 0 && (
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '14px', pointerEvents: 'none', display: 'flex', color: '#38bdf8' }}><Filter size={16} /></div>
            <select
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value)}
              style={{
                  appearance: 'none', WebkitAppearance: 'none', background: 'rgba(56, 189, 248, 0.05)', color: '#38bdf8', 
                  border: '1px solid rgba(56, 189, 248, 0.2)', padding: '8px 40px', borderRadius: '20px', fontSize: '13px', 
                  fontWeight: '600', cursor: 'pointer', outline: 'none', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => { e.target.style.background = 'rgba(56, 189, 248, 0.1)'; e.target.style.borderColor = 'rgba(56, 189, 248, 0.4)'; }}
              onMouseLeave={(e) => { e.target.style.background = 'rgba(56, 189, 248, 0.05)'; e.target.style.borderColor = 'rgba(56, 189, 248, 0.2)'; }}
            >
              <option value="all" style={{ background: '#1e293b', color: '#f8fafc' }}>Всі мови</option>
              {availableLangs.map(lang => (
                <option key={lang} value={lang} style={{ background: '#1e293b', color: '#f8fafc' }}>{lang === 'none' ? 'Без тексту' : lang.toUpperCase()}</option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '14px', pointerEvents: 'none', display: 'flex', color: '#38bdf8' }}><ChevronDown size={16} /></div>
          </div>
        )}
      </div>

      {paginatedImages.length > 0 ? (
        <div key={`${activeShotsTab}-${filterLang}`} className="animated-grid">
          <div style={{...styles.imagesGrid, gridTemplateColumns: activeShotsTab === 'posters' ? 'repeat(auto-fill, minmax(160px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))'}}>
            {paginatedImages.map((img, idx) => (
              <div key={`${activeShotsTab}-${idx}`} className="image-card" style={{ cursor: 'pointer' }} onClick={() => setLightboxIndex(idx)}>
                <img src={`https://image.tmdb.org/t/p/${activeShotsTab === 'backdrops' ? 'w780' : 'w500'}${img.file_path}`} alt={`Зображення ${idx}`} className={`img-${activeShotsTab}`} loading="lazy" />
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
        </div>
      ) : rawImages.length > 0 ? (
        <p style={styles.emptyText}>Немає зображень для обраної мови.</p>
      ) : null}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <button onClick={() => setLightboxIndex(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10000 }}><X size={36} /></button>
          
          <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => Math.max(prev - 1, 0)); }} style={{ position: 'absolute', left: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '15px', borderRadius: '50%', cursor: lightboxIndex === 0 ? 'default' : 'pointer', opacity: lightboxIndex === 0 ? 0.3 : 1 }} disabled={lightboxIndex === 0}><ChevronLeft size={32} /></button>
          
          <img src={`https://image.tmdb.org/t/p/original${displayedImages[lightboxIndex].file_path}`} alt="Перегляд" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          
          <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => Math.min(prev + 1, displayedImages.length - 1)); }} style={{ position: 'absolute', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '15px', borderRadius: '50%', cursor: lightboxIndex === displayedImages.length - 1 ? 'default' : 'pointer', opacity: lightboxIndex === displayedImages.length - 1 ? 0.3 : 1 }} disabled={lightboxIndex === displayedImages.length - 1}><ChevronRight size={32} /></button>
        </div>
      )}
    </>
  );
}

// --- 4. Вкладка Прем'єри ---
export function TabPremiere({ tmdbData }) {
  const getReleaseTypeInfo = (type) => {
    switch (type) {
      case 1: return { label: 'Прем\'єра', icon: <Star size={14} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 2: return { label: 'Кінопрокат (Обмежений)', icon: <Video size={14} />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 3: return { label: 'Кінопрокат', icon: <Popcorn size={14} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 4: return { label: 'Цифровий реліз', icon: <MonitorPlay size={14} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 5: return { label: 'Фізичні носії', icon: <Disc size={14} />, color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
      case 6: return { label: 'ТБ', icon: <Tv size={14} />, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' };
      default: return { label: 'Невідомо', icon: <Calendar size={14} />, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  if (!tmdbData?.releases || tmdbData.releases.length === 0) return <p style={styles.emptyText}>Немає інформації про прем'єри.</p>;

  const productionCountries = tmdbData.production_countries || [];

  const pinnedCountries = tmdbData.releases.filter(r => r.country === 'UA' || productionCountries.includes(r.country));
  
  pinnedCountries.sort((a, b) => {
    if (a.country === 'UA') return -1;
    if (b.country === 'UA') return 1;
    return getCountryName(a.country).localeCompare(getCountryName(b.country), 'uk');
  });

  const allReleasesTimeline = [];
  tmdbData.releases.forEach(releaseInfo => {
    releaseInfo.dates.forEach(dateItem => {
      allReleasesTimeline.push({
        country: releaseInfo.country,
        ...dateItem
      });
    });
  });

  allReleasesTimeline.sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div style={styles.premiereContainer}>
      {pinnedCountries.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pinnedCountries.map((countryRelease) => {
              const isUkraine = countryRelease.country === 'UA';
              
              return (
                <div key={`pinned-${countryRelease.country}`} style={{
                  backgroundColor: isUkraine ? 'rgba(56, 189, 248, 0.04)' : '#1a1a1a', 
                  border: isUkraine ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid #2a2a2a',
                  borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '24px', lineHeight: '1' }}>{getFlagEmoji(countryRelease.country)}</span>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: isUkraine ? 'bold' : '600', color: isUkraine ? '#bae6fd' : '#f8fafc' }}>
                      {getCountryName(countryRelease.country)}
                    </h4>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[...countryRelease.dates].sort((a, b) => new Date(a.date) - new Date(b.date)).map((dateItem, idx) => {
                      const typeInfo = getReleaseTypeInfo(dateItem.type);
                      return (
                        <div key={idx} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px', padding: '10px', backgroundColor: '#111827', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: typeInfo.color, minWidth: '160px', backgroundColor: typeInfo.bg, padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                            {typeInfo.icon}
                            <span>{typeInfo.label}</span>
                          </div>
                          <div style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: '500', minWidth: '120px' }}>
                            {formatDate(dateItem.date)}
                          </div>
                          {dateItem.note && <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', flex: 1 }}>{dateItem.note}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 style={styles.sectionTitle}>Прем'єри</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {allReleasesTimeline.map((item, idx) => {
            const typeInfo = getReleaseTypeInfo(item.type);
            const isUkraine = item.country === 'UA';
            
            return (
              <div key={`timeline-${idx}`} style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px', padding: '12px 16px', 
                backgroundColor: isUkraine ? 'rgba(56, 189, 248, 0.04)' : '#1a1a1a', 
                borderRadius: '8px', border: isUkraine ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid #2a2a2a'
              }}>
                <div style={{ width: '130px', color: '#e2e8f0', fontSize: '14px', fontWeight: 'bold' }}>
                  {formatDate(item.date)}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '220px' }}>
                  <span style={{ fontSize: '20px', lineHeight: '1' }}>{getFlagEmoji(item.country)}</span>
                  <span style={{ color: isUkraine ? '#bae6fd' : '#f8fafc', fontSize: '14px', fontWeight: isUkraine ? 'bold' : '500' }}>
                    {getCountryName(item.country)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: typeInfo.color, width: '180px', backgroundColor: typeInfo.bg, padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                  {typeInfo.icon}
                  <span>{typeInfo.label}</span>
                </div>
                
                {item.note && <div style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', flex: 1 }}>{item.note}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- 5. Вкладка Джерела ---
export function TabSources({ tmdbData }) {
  if (!tmdbData?.external_links) return <p style={styles.emptyText}>Немає посилань.</p>;

  const links = tmdbData.external_links;
  
  const sourceGroups = [
    { title: 'Офіційні ресурси', icon: <Globe size={20} color="#38bdf8" />, items: [{ label: 'Офіційний сайт', url: links.homepage, icon: <LinkIcon size={18} /> }] },
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

// --- 6. Вкладка Історія ---
export function TabHistory({ logs, viewType, onDelete, onCreate, onUpdate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [formData, setFormData] = useState({ start_date: '', finish_date: '', rating: '' });
  
  const isSingleDate = viewType === 'movie' || viewType === 'episode';

  const formatDateStr = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
        start_date: formData.start_date || null,
        finish_date: formData.finish_date || null,
        rating: formData.rating === '' ? null : parseFloat(formData.rating)
      };

    if (editingLogId) onUpdate(editingLogId, payload);
    else onCreate(payload);

    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={styles.sectionTitle} className="mb-0">Історія переглядів</h3>
        <button onClick={() => {
            setEditingLogId(null);
            const today = getLocalDateString();
            setFormData({ start_date: today, finish_date: today, rating: '' }); 
            setIsModalOpen(true);
        }} style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
          <Plus size={16} /> Додати запис
        </button>
      </div>

      {(!logs || logs.length === 0) ? (
        <p style={styles.emptyText}>Історія порожня.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          {logs.map((log, index) => {
            const start = formatDateStr(log.start_date);
            const finish = formatDateStr(log.finish_date);
            
            if (viewType === 'episode' && log.media_type === 'season') {
                if (start && finish && start !== finish) {
                    return (
                        <div key={log.id} style={{ padding: '12px', backgroundColor: 'rgba(56, 189, 248, 0.05)', borderLeft: '3px solid #38bdf8', borderRadius: '4px', fontSize: '14px', color: '#94a3b8' }}>
                            <Star size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-top' }} color="#38bdf8" /> 
                            Період перегляду сезону: <span style={{ color: '#fff', fontWeight: 'bold' }}>{start} - {finish}</span>
                        </div>
                    );
                }
                return null;
            }

            let dateText = 'Без дати';
            if (start && finish) dateText = start === finish ? `Дата: ${start}` : `Період: ${start} - ${finish}`;
            else if (start) dateText = `Початок: ${start}`;
            else if (finish) dateText = `Завершення: ${finish}`;

            const isChildLog = (viewType === 'series' && log.media_type !== 'series') || (viewType === 'season' && log.media_type === 'episode');

            return (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: '16px 20px', borderRadius: '12px', border: index === 0 && !isChildLog ? '1px solid var(--dominant-color-strong, #38bdf8)' : '1px solid #333' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ backgroundColor: '#2a2a2a', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={20} color={isChildLog ? "#64748b" : "#a3a3a3"} />
                  </div>
                  <div>
                    {isChildLog && <div style={{ fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>{log.media_title}</div>}
                    <div style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>
                      {dateText}
                      {index === 0 && !isChildLog && <span style={{ marginLeft: '10px', fontSize: '11px', color: '#38bdf8', border: '1px solid #38bdf8', padding: '2px 6px', borderRadius: '4px' }}>Останній</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <Star size={14} color={log.rating !== null && log.rating !== undefined ? "#facc15" : "#555"} fill={log.rating !== null && log.rating !== undefined ? "#facc15" : "none"} />
                      <span style={{ color: log.rating !== null && log.rating !== undefined ? '#facc15' : '#555', fontSize: '14px', fontWeight: '500' }}>
                        {log.rating !== null && log.rating !== undefined ? `${log.rating} / 5` : 'Без оцінки'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {!isChildLog && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => { 
                           setEditingLogId(log.id); 
                           setFormData({ 
                               start_date: log.start_date || '', 
                               finish_date: log.finish_date || (isSingleDate ? log.start_date || '' : ''), 
                               rating: log.rating !== null ? log.rating : '' 
                           }); 
                           setIsModalOpen(true); 
                       }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#a3a3a3' }}><Pen size={18} /></button>
                      <button onClick={() => onDelete(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#ef4444' }}><Trash2 size={18} /></button>
                    </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid #334155' }}>
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '20px' }}>{editingLogId ? 'Редагувати запис' : 'Новий запис'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {isSingleDate ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '13px' }}>Дата перегляду</label>
                  <input 
                    type="date" 
                    value={formData.finish_date} 
                    onChange={e => setFormData({...formData, start_date: e.target.value, finish_date: e.target.value})} 
                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }} 
                   />
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#94a3b8', fontSize: '13px' }}>Дата початку</label>
                    <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#94a3b8', fontSize: '13px' }}>Дата завершення</label>
                    <input type="date" value={formData.finish_date} onChange={e => setFormData({...formData, finish_date: e.target.value})} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: '#94a3b8', fontSize: '13px' }}>Оцінка (0 - 5)</label>
                <input type="number" step="0.5" min="0" max="5" value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value})} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }} />
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

// --- 7. Вкладка Сезони ---
export function TabSeasons({ tmdbData, media }) {
  const navigate = useNavigate();
  if (!tmdbData?.seasons || tmdbData.seasons.length === 0) return <p style={styles.emptyText}>Немає інформації про сезони.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {tmdbData.seasons.map((season) => (
        <div
          key={`season-list-${season.season_number}`}
          style={{
            display: 'flex', gap: '15px', backgroundColor: '#1a1a1a', padding: '16px', 
            borderRadius: '12px', border: '1px solid #2a2a2a', cursor: 'pointer', 
            transition: 'all 0.2s ease', alignItems: 'flex-start'
          }}
          onClick={() => navigate(`/media/${media.media_type}/${tmdbData.tmdb_id}/season/${season.season_number}`)}
          onMouseEnter={(e) => { 
              e.currentTarget.style.backgroundColor = '#2a2a2a'; 
              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
              e.currentTarget.style.transform = 'translateX(5px)';
            }}
          onMouseLeave={(e) => { 
              e.currentTarget.style.backgroundColor = '#1a1a1a';
              e.currentTarget.style.borderColor = '#2a2a2a'; 
              e.currentTarget.style.transform = 'translateX(0)';
            }}
        >
          <img
            src={season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : 'https://via.placeholder.com/120x180?text=No+Poster'}
            alt={season.name}
            style={{ width: '120px', height: '180px', objectFit: 'cover', borderRadius: '8px', backgroundColor: '#334155', flexShrink: 0 }}
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '20px', fontWeight: 'bold' }}>
              {season.season_number === 0 && !season.name.toLowerCase().includes('спеціальні') ? 'Спеціальні випуски' : season.name}
            </h3>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '4px 10px', borderRadius: '8px', color: '#38bdf8', fontSize: '13px', fontWeight: 'bold' }}>
                {season.episode_count} Епізодів
              </span>
              
              {season.air_date && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: '8px', color: '#94a3b8', fontSize: '13px' }}>
                  <Calendar size={14} /> Вихід: {new Date(season.air_date).toLocaleDateString('uk-UA')}
                </span>
              )}
            </div>

            {season.overview ? (
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {season.overview}
              </p>
            ) : (
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>Немає опису.</p>
            )}
          </div>

          <div style={{ padding: '0 5px', color: '#64748b', alignSelf: 'center' }}>
            <ChevronRight size={24} />
          </div>
        </div>
      ))}
    </div>
  );
}