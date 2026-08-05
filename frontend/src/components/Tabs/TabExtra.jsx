// frontend/src/components/Tabs/TabExtra.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown, Globe, Database, ExternalLink, Link as LinkIcon, Tv,
  Calendar, Star, X, ChevronLeft, ChevronRight,
  Popcorn, Disc, MonitorPlay, Video, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { styles } from '../../styles/mediaDetailStyles';
import { ScrollableSubTabs, PersonImage, getFlagEmoji, getCountryName, formatDate } from './TabShared';

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
      'Костюми та Макіяж': ['Costume Design', 'Makeup Artist', 'Hairstylist'],
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
    if (tmdbData?.images?.backdrops?.length > 0) tabs.push({ id: 'backdrops', label: 'Кадри' });
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
          
          <img src={`https://image.tmdb.org/t/p/original${displayedImages[lightboxIndex].file_path}`} alt="Збільшене зображення" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          
          <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => Math.min(prev + 1, displayedImages.length - 1)); }} style={{ position: 'absolute', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '15px', borderRadius: '50%', cursor: lightboxIndex === displayedImages.length - 1 ? 'default' : 'pointer', opacity: lightboxIndex === displayedImages.length - 1 ? 0.3 : 1 }} disabled={lightboxIndex === displayedImages.length - 1}><ChevronRight size={32} /></button>
        </div>
      )}
    </>
  );
}

export function TabPremiere({ tmdbData }) {
  const getReleaseTypeInfo = (type) => {
    switch (type) {
      case 1: return { label: 'Фестиваль', icon: <Star size={14} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 2: return { label: 'Прокат (обмежений)', icon: <Video size={14} />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 3: return { label: 'Прокат', icon: <Popcorn size={14} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 4: return { label: 'Цифровий', icon: <MonitorPlay size={14} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 5: return { label: 'Фізичний', icon: <Disc size={14} />, color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
      case 6: return { label: 'Телебачення', icon: <Tv size={14} />, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' };
      default: return { label: 'Невідомо', icon: <Calendar size={14} />, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  if (!tmdbData?.releases || tmdbData.releases.length === 0) return <p style={styles.emptyText}>Немає інформації про релізи.</p>;

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
        <h3 style={styles.sectionTitle}>Хронологія усіх релізів</h3>
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

export function TabSources({ tmdbData }) {
  if (!tmdbData?.external_links) return <p style={styles.emptyText}>Немає посилань.</p>;

  const links = tmdbData.external_links;
  const sourceGroups = [
    { title: 'Офіційні', icon: <Globe size={20} color="#38bdf8" />, items: [{ label: 'Офіційний сайт', url: links.homepage, icon: <LinkIcon size={18} /> }] },
    { title: 'Бази даних', icon: <Database size={20} color="#facc15" />, items: [{ label: 'TMDB', url: links.tmdb, icon: <Tv size={18} /> }, { label: 'IMDb', url: links.imdb, icon: <ExternalLink size={18} /> }, { label: 'Wikidata', url: links.wikidata, icon: <ExternalLink size={18} /> }] },
    { title: 'Соцмережі', icon: <ExternalLink size={20} color="#2ecc71" />, items: [{ label: 'Instagram', url: links.instagram, icon: <ExternalLink size={18} /> }, { label: 'Twitter (X)', url: links.twitter, icon: <ExternalLink size={18} /> }, { label: 'Facebook', url: links.facebook, icon: <ExternalLink size={18} /> }] }
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

export function TabSeasons({ tmdbData, media }) {
  const navigate = useNavigate();
  if (!tmdbData?.seasons || tmdbData.seasons.length === 0) return <p style={styles.emptyText}>Немає даних про сезони.</p>;

  const sortedSeasons = [...tmdbData.seasons].sort((a, b) => {
    if (a.season_number === 0) return 1;
    if (b.season_number === 0) return -1;
    return a.season_number - b.season_number;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {sortedSeasons.map((season) => (
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
            src={season.poster_path ? `https://image.tmdb.org/t/p/w342${season.poster_path}` : 'https://via.placeholder.com/120x180?text=No+Poster'}
            alt={season.name}
            style={{ width: '120px', height: '180px', objectFit: 'cover', borderRadius: '8px', backgroundColor: '#334155', flexShrink: 0 }}
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '20px', fontWeight: 'bold' }}>
              {season.season_number === 0 && !season.name.toLowerCase().includes('спец') ? 'Спецвипуски' : season.name}
            </h3>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '4px 10px', borderRadius: '8px', color: '#38bdf8', fontSize: '13px', fontWeight: 'bold' }}>
                {season.episode_count} еп.
              </span>
              
              {season.air_date && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: '8px', color: '#94a3b8', fontSize: '13px' }}>
                  <Calendar size={14} /> Прем'єра: {new Date(season.air_date).toLocaleDateString('uk-UA')}
                </span>
              )}
            </div>

            {season.overview ? (
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {season.overview}
              </p>
            ) : (
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>Опис відсутній.</p>
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