import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Globe, Database, ExternalLink, Link as LinkIcon, Tv } from 'lucide-react';
import { styles } from '../styles/mediaDetailStyles';

// 1. Головна Вкладка
export function TabMain({ media, tmdbData }) {
  const releaseYear = media.release_date ? media.release_date.split('-')[0] : '';
  
  const formatRuntime = (minutes) => {
    if (!minutes) return '-';
    return `${minutes} хв.`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <>
      <div style={styles.headerBlock}>
        <h1 style={styles.mainTitle}>
          {media.title} {releaseYear && <span style={styles.year}>({releaseYear})</span>}
        </h1>
        {media.original_title && <h2 style={styles.originalTitle}>{media.original_title}</h2>}
        {tmdbData?.tagline && <p style={styles.tagline}>«{tmdbData.tagline}»</p>}
      </div>

      <div style={styles.detailsBox}>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Країна:</span>
          <span style={styles.detailValue}>{media.production_countries?.join(', ') || 'США'}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Мова:</span>
          <span style={styles.detailValue}>{media.original_language || 'англійська'}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Тривалість:</span>
          <span style={styles.detailValue}>{formatRuntime(tmdbData?.runtime || media.runtime)}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Прем'єра:</span>
          <span style={styles.detailValue}>{formatDate(media.release_date)}</span>
        </div>
      </div>

      <div style={styles.genresContainer}>
        {media.genres && media.genres.length > 0 ? (
          media.genres.map((genre, idx) => <span key={idx} style={styles.genreBadge}>{genre}</span>)
        ) : (
          <span style={styles.genreBadge}>Жанр не вказано</span>
        )}
      </div>

      {tmdbData?.description && (
        <div style={styles.sectionBlock}>
          <p style={styles.descriptionText}>{tmdbData.description}</p>
        </div>
      )}

      {tmdbData?.cast && tmdbData.cast.length > 0 && (
        <div style={styles.sectionBlock}>
          <h3 style={styles.sectionTitle}>У ролях:</h3>
          <div className="custom-scroll" style={styles.horizontalScroll}>
            {tmdbData.cast.slice(0, 12).map(actor => (
              <div key={`actor-min-${actor.id}`} style={styles.personCard}>
                <img src={actor.profile_path || 'https://via.placeholder.com/105x155?text=Немає+фото'} alt={actor.name} style={styles.personPhoto} />
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
              <div key={`crew-min-${member.id}-${idx}`} style={styles.personCard}>
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

// 2. Вкладка Акторів та Авторів
export function TabActors({ tmdbData }) {
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
      'Костюми та Грим': ['Costume Design', 'Makeup Artist', 'Hairstylist'],
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

    Array.from(ungroupedJobs).sort().forEach(job => {
      tabs.push({ id: job, label: job, jobs: [job] });
    });

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
              <div key={`${activeCrewTab}-${person.id}-${idx}`} style={styles.gridPersonCard}>
                <img src={person.profile_path || 'https://via.placeholder.com/105x155?text=Немає+фото'} alt={person.name} style={styles.personPhoto} />
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
      ) : <p style={styles.emptyText}>У цій категорії інформація відсутня.</p>}
    </>
  );
}

// 3. Вкладка Кадрів
export function TabShots({ tmdbData }) {
  const [activeShotsTab, setActiveShotsTab] = useState('backdrops');
  const [visibleImageCount, setVisibleImageCount] = useState(12);
  const IMAGES_PER_PAGE = 12;

  useEffect(() => { setVisibleImageCount(IMAGES_PER_PAGE); }, [activeShotsTab]);

  const imageSubTabs = useMemo(() => {
    const tabs = [];
    if (tmdbData?.images?.backdrops?.length > 0) tabs.push({ id: 'backdrops', label: 'Фото та Фони' });
    if (tmdbData?.images?.posters?.length > 0) tabs.push({ id: 'posters', label: 'Постери' });
    if (tmdbData?.images?.logos?.length > 0) tabs.push({ id: 'logos', label: 'Логотипи' });
    return tabs;
  }, [tmdbData]);

  // ВИПРАВЛЕНО БАГ З USEMEMO: Ефект встановлення першої доступної вкладки винесено окремо
  useEffect(() => {
    if (imageSubTabs.length > 0 && !imageSubTabs.find(t => t.id === activeShotsTab)) {
      setActiveShotsTab(imageSubTabs[0].id);
    }
  }, [imageSubTabs, activeShotsTab]);

  const displayedImages = tmdbData?.images?.[activeShotsTab] || [];
  const paginatedImages = displayedImages.slice(0, visibleImageCount);
  const hasMoreImages = visibleImageCount < displayedImages.length;

  return (
    <>
      {imageSubTabs.length > 0 ? (
        <div className="sub-tabs-container">
          {imageSubTabs.map(tab => (
            <button key={tab.id} className={`sub-tab ${activeShotsTab === tab.id ? 'active' : ''}`} onClick={() => setActiveShotsTab(tab.id)}>
              {tab.label} ({tmdbData?.images?.[tab.id]?.length || 0})
            </button>
          ))}
        </div>
      ) : <p style={styles.emptyText}>Зображень для цього медіа не знайдено.</p>}

      {paginatedImages.length > 0 && (
        <>
          <div style={{
            ...styles.imagesGrid, 
            gridTemplateColumns: activeShotsTab === 'posters' ? 'repeat(auto-fill, minmax(160px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))'
          }}>
            {paginatedImages.map((imgPath, idx) => (
              <div key={`${activeShotsTab}-${idx}`} className="image-card">
                <img 
                  src={`https://image.tmdb.org/t/p/${activeShotsTab === 'backdrops' ? 'w780' : 'w500'}${imgPath}`} 
                  alt={`Image ${idx}`} className={`img-${activeShotsTab}`} loading="lazy"
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
      )}
    </>
  );
}

// 4. Вкладка Прем'єра
export function TabPremiere({ tmdbData }) {
  const releaseTypeNames = {
    1: 'Прем\'єра', 2: 'Обмежений прокат', 3: 'Кінопрокат',
    4: 'Цифровий реліз', 5: 'На фізичних носіях', 6: 'Телебачення'
  };

  const getCountryName = (isoCode) => {
    try {
      const displayNames = new Intl.DisplayNames(['uk'], { type: 'region' });
      return displayNames.of(isoCode);
    } catch (e) {
      return isoCode;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (!tmdbData?.releases || tmdbData.releases.length === 0) {
    return <p style={styles.emptyText}>Інформація про прем'єри відсутня.</p>;
  }

  const sortedReleases = [...tmdbData.releases].sort((a, b) => {
    if (a.country === 'UA') return -1;
    if (b.country === 'UA') return 1;
    return getCountryName(a.country).localeCompare(getCountryName(b.country), 'uk');
  });

  return (
    <div style={styles.premiereContainer}>
      <h3 style={styles.sectionTitle}>Дати релізів у світі</h3>
      <div style={styles.countryGrid}>
        {sortedReleases.map((countryRelease) => (
          <div key={countryRelease.country} style={styles.countryCard}>
            <div style={styles.countryCardHeader}>
              <Globe size={18} color="#2ecc71" />
              <h4 style={styles.countryName}>{getCountryName(countryRelease.country)}</h4>
            </div>
            <div style={styles.datesList}>
              {[...countryRelease.dates].sort((a, b) => new Date(a.date) - new Date(b.date)).map((dateItem, idx) => (
                <div key={idx} style={styles.dateItem}>
                  <div style={styles.dateTypeWrapper}>
                    <span style={styles.dateTypeBadge}>{releaseTypeNames[dateItem.type] || 'Інше'}</span>
                    {dateItem.note && <span style={styles.dateNote}>({dateItem.note})</span>}
                  </div>
                  <div style={styles.dateValue}>{formatDate(dateItem.date)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. Вкладка Джерела
export function TabSources({ tmdbData }) {
  if (!tmdbData?.external_links) return <p style={styles.emptyText}>Джерела не знайдено.</p>;

  const links = tmdbData.external_links;

  const sourceGroups = [
    {
      title: 'Офіційні ресурси',
      icon: <Globe size={20} color="#38bdf8" />,
      items: [{ label: 'Офіційний сайт', url: links.homepage, icon: <LinkIcon size={18} /> }]
    },
    {
      title: 'Бази даних',
      icon: <Database size={20} color="#facc15" />,
      items: [
        { label: 'The Movie Database (TMDB)', url: links.tmdb, icon: <Tv size={18} /> },
        { label: 'IMDb', url: links.imdb, icon: <ExternalLink size={18} /> },
        { label: 'Wikidata', url: links.wikidata, icon: <ExternalLink size={18} /> }
      ]
    },
    {
      title: 'Соціальні мережі',
      icon: <ExternalLink size={20} color="#2ecc71" />,
      items: [
        { label: 'Instagram', url: links.instagram, icon: <ExternalLink size={18} /> },
        { label: 'Twitter (X)', url: links.twitter, icon: <ExternalLink size={18} /> },
        { label: 'Facebook', url: links.facebook, icon: <ExternalLink size={18} /> },
        { label: 'TikTok', url: links.tiktok, icon: <ExternalLink size={18} /> }
      ]
    }
  ];

  return (
    <div style={styles.sourcesContainer}>
      {sourceGroups.map((group, gIdx) => {
        const validItems = group.items.filter(item => item.url);
        if (validItems.length === 0) return null;

        return (
          <div key={gIdx} style={styles.sourceGroup}>
            <div style={styles.sourceGroupHeader}>
              {group.icon}
              <h3 style={styles.sectionTitle} className="mb-0">{group.title}</h3>
            </div>
            
            <div style={styles.sourceGrid}>
              {validItems.map((item, iIdx) => (
                <a key={iIdx} href={item.url} target="_blank" rel="noopener noreferrer" className="source-card">
                  <div className="source-icon-wrapper">
                    {item.icon}
                  </div>
                  <span className="source-label">{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}