// frontend/src/pages/PersonDetail.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, X, ExternalLink, Link as LinkIcon, AtSign, 
  Globe, Database, Tv, ChevronLeft, ChevronRight, Star, Filter, ChevronDown 
} from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import { getJobTranslation, getAverageColor } from '../utils';

const calculateAge = (birthday, deathday) => {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const endDate = deathday ? new Date(deathday) : new Date();
  let age = endDate.getFullYear() - birthDate.getFullYear();
  const m = endDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const getGender = (genderId) => {
  switch (genderId) {
    case 1: return 'Жіноча';
    case 2: return 'Чоловіча';
    case 3: return 'Небінарна';
    default: return 'Не вказано';
  }
};

const getKnownForLabel = (genderId) => {
  if (genderId === 1) return 'Відома за';
  if (genderId === 2) return 'Відомий за';
  return 'Відомі за';
};

const getAlsoKnownAsLabel = (genderId) => {
  if (genderId === 1) return 'Також відома як';
  if (genderId === 2) return 'Також відомий як';
  return 'Також відомі як';
};

const translateDepartment = (dept, gender) => {
  const depts = {
      'Acting': gender === 1 ? 'Акторка' : 'Актор',
      'Directing': gender === 1 ? 'Режисерка' : 'Режисер',
      'Writing': gender === 1 ? 'Сценаристка' : 'Сценарист',
      'Production': gender === 1 ? 'Продюсерка' : 'Продюсер',
      'Camera': gender === 1 ? 'Операторка' : 'Оператор',
      'Sound': 'Звук',
      'Editing': gender === 1 ? 'Монтажерка' : 'Монтажер',
      'Art': 'Художній відділ',
      'Costume & Make-Up': 'Костюми та грим'
  };
  return depts[dept] || dept;
};

const getYear = (dateString) => {
  return dateString ? new Date(dateString).getFullYear() : 'TBA';
};

const isCyrillic = (text) => /[а-яА-ЯёЁіІїЇєЄґҐ]/.test(text);
const hasLatin = (text) => /[a-zA-Z]/.test(text);

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [personData, setPersonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('main');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  
  const [creditFilterRole, setCreditFilterRole] = useState('all');
  const [creditFilterType, setCreditFilterType] = useState('all');
  const [creditSort, setCreditSort] = useState('newest');
  
  const [dominantColor, setDominantColor] = useState('10, 10, 10');

  useEffect(() => {
    const fetchPersonDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/external/tmdb/person/${id}`);
        const json = await response.json();
        if (json.data) {
          setPersonData(json.data);
          // Зчитуємо колір із фото профілю
          if (json.data.profile_path) {
            const url = `https://image.tmdb.org/t/p/w154${json.data.profile_path}`;
            getAverageColor(url).then(color => setDominantColor(color));
          }
        }
      } catch (err) {
        console.error('Помилка завантаження персони:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPersonDetails();
  }, [id]);

  const originalName = useMemo(() => {
    if (!personData) return null;
    if (!isCyrillic(personData.name)) return null; 
    return personData.also_known_as?.find(n => hasLatin(n) && !isCyrillic(n)) || null;
  }, [personData]);

  const otherNames = useMemo(() => {
    if (!personData?.also_known_as) return [];
    return personData.also_known_as.filter(n => n !== originalName);
  }, [personData, originalName]);

  const topCredits = useMemo(() => {
    if (!personData?.combined_credits) return [];
    const isCast = personData.known_for_department === 'Acting';
    let credits = isCast ? personData.combined_credits.cast : personData.combined_credits.crew;
    if (!credits || credits.length === 0) {
        credits = personData.combined_credits.cast?.length > 0 ? personData.combined_credits.cast : personData.combined_credits.crew;
    }
    if (!credits) return [];
    const uniqueCredits = [];
    const seen = new Set();
    [...credits]
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
      .forEach(c => {
          if (!seen.has(c.id)) {
              seen.add(c.id);
              uniqueCredits.push(c);
          }
      });
    return uniqueCredits.slice(0, 15);
  }, [personData]);

  const unifiedCredits = useMemo(() => {
    if (!personData?.combined_credits) return [];
    const projectMap = new Map();
    (personData.combined_credits.cast || []).forEach(item => {
      if (!projectMap.has(item.id)) {
        projectMap.set(item.id, { 
          id: item.id, title: item.title || item.name, original_title: item.original_title || item.original_name,
          media_type: item.media_type, release_date: item.release_date || item.first_air_date,
          poster_path: item.poster_path, vote_average: item.vote_average, castRoles: [], crewJobs: [] 
        });
      }
      projectMap.get(item.id).castRoles.push(item.character || 'У ролі себе');
    });
    (personData.combined_credits.crew || []).forEach(item => {
      if (!projectMap.has(item.id)) {
        projectMap.set(item.id, { 
          id: item.id, title: item.title || item.name, original_title: item.original_title || item.original_name,
          media_type: item.media_type, release_date: item.release_date || item.first_air_date,
          poster_path: item.poster_path, vote_average: item.vote_average, castRoles: [], crewJobs: [] 
        });
      }
      const translatedJob = getJobTranslation(item.job, personData.gender);
      const proj = projectMap.get(item.id);
      if (!proj.crewJobs.includes(translatedJob)) {
          proj.crewJobs.push(translatedJob);
      }
    });
    return Array.from(projectMap.values());
  }, [personData]);

  const availableRoles = useMemo(() => {
    if (!unifiedCredits || unifiedCredits.length === 0) return [];
    const roleCounts = {};
    const actingRoleName = translateDepartment('Acting', personData?.gender);
    unifiedCredits.forEach(c => {
      if (c.castRoles.length > 0) {
        roleCounts[actingRoleName] = (roleCounts[actingRoleName] || 0) + 1;
      }
      c.crewJobs.forEach(job => {
        roleCounts[job] = (roleCounts[job] || 0) + 1;
      });
    });
    return Object.entries(roleCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));      
  }, [unifiedCredits, personData]);

  const processedCredits = useMemo(() => {
    let result = [...unifiedCredits];
    if (creditFilterRole !== 'all') {
      const actingRoleName = translateDepartment('Acting', personData?.gender);
      if (creditFilterRole === actingRoleName) {
        result = result.filter(c => c.castRoles.length > 0);
      } else {
        result = result.filter(c => c.crewJobs.includes(creditFilterRole));
      }
    }
    if (creditFilterType !== 'all') {
      result = result.filter(c => c.media_type === creditFilterType);
    }
    result.sort((a, b) => {
      if (creditSort === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
      const dateA = new Date(a.release_date || (creditSort === 'newest' ? '1900-01-01' : '2099-01-01')).getTime();
      const dateB = new Date(b.release_date || (creditSort === 'newest' ? '1900-01-01' : '2099-01-01')).getTime();
      return creditSort === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [unifiedCredits, creditFilterRole, creditFilterType, creditSort, personData]);

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!personData) return <div style={styles.loadingWrapper}>Помилка завантаження.</div>;

  const age = calculateAge(personData.birthday, personData.deathday);
  const formatBirthday = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('uk-UA') : '-';
  const profiles = personData.images?.profiles || [];
  const links = personData.external_ids || {};

  const sourceGroups = [
    { title: 'Офіційні сайти', icon: <Globe size={20} color="#38bdf8" />, items: [{ label: 'Офіційний сайт', url: personData.homepage, icon: <LinkIcon size={18} /> }] },
    { title: 'Бази даних', icon: <Database size={20} color="#facc15" />, items: [{ label: 'TMDB', url: `https://www.themoviedb.org/person/${personData.id}`, icon: <Tv size={18} /> }, { label: 'IMDb', url: links.imdb_id ? `https://www.imdb.com/name/${links.imdb_id}` : null, icon: <ExternalLink size={18} /> }, { label: 'Wikidata', url: links.wikidata_id ? `https://www.wikidata.org/wiki/${links.wikidata_id}` : null, icon: <ExternalLink size={18} /> }] },
    { title: 'Соціальні мережі', icon: <ExternalLink size={20} color="#2ecc71" />, items: [{ label: 'Instagram', url: links.instagram_id ? `https://www.instagram.com/${links.instagram_id}` : null, icon: <ExternalLink size={18} /> }, { label: 'Twitter (X)', url: links.twitter_id ? `https://twitter.com/${links.twitter_id}` : null, icon: <ExternalLink size={18} /> }, { label: 'Facebook', url: links.facebook_id ? `https://www.facebook.com/${links.facebook_id}` : null, icon: <ExternalLink size={18} /> }, { label: 'TikTok', url: links.tiktok_id ? `https://www.tiktok.com/@${links.tiktok_id}` : null, icon: <ExternalLink size={18} /> }] }
  ];

  const selectStyle = {
    appearance: 'none', WebkitAppearance: 'none',
    background: 'rgba(56, 189, 248, 0.05)', color: '#38bdf8', 
    border: '1px solid rgba(56, 189, 248, 0.2)', padding: '6px 30px 6px 14px', 
    borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', outline: 'none'
  };

  return (
    <div style={styles.container}>
      <MediaGlobalStyles dominantColor={dominantColor} />
      
      {/* Ефект світіння зверху */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '400px', pointerEvents: 'none',
        background: `linear-gradient(to bottom, rgba(${dominantColor}, 0.2) 0%, rgba(10,10,10,0) 100%)`, zIndex: 0
      }} />
      
      <div style={styles.topNav}>
        <button onClick={() => navigate(-1)} style={styles.navButton}>
          <ArrowLeft size={16} /> Назад
        </button>
        <button onClick={() => navigate('/')} style={styles.navButtonIcon}>
          <X size={18} />
        </button>
      </div>

      <div style={styles.mainContent}>
        {/* ЛІВА КОЛОНКА */}
        <div style={styles.leftColumn}>
          <div style={styles.posterWrapper}>
            <img 
              src={personData.profile_path ? `https://image.tmdb.org/t/p/w500${personData.profile_path}` : 'https://via.placeholder.com/300x450?text=Немає+фото'} 
              alt={personData.name} 
              style={styles.poster} 
            />
          </div>

          <div style={{ ...styles.detailsBox, padding: '15px' }}>
            <h3 style={{ ...styles.sectionTitle, fontSize: '16px', marginBottom: '10px' }}>Посилання</h3>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {personData.homepage && (
                <a href={personData.homepage} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }} title="Офіційний сайт">
                  <LinkIcon size={24} />
                </a>
              )}
              {links.imdb_id && (
                <a href={`https://www.imdb.com/name/${links.imdb_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#facc15' }} title="IMDb">
                  <ExternalLink size={24} />
                </a>
              )}
              {links.instagram_id && (
                <a href={`https://www.instagram.com/${links.instagram_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#e1306c' }} title="Instagram">
                  <AtSign size={24} />
                </a>
              )}
              {links.twitter_id && (
                <a href={`https://twitter.com/${links.twitter_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1da1f2' }} title="Twitter (X)">
                  <AtSign size={24} />
                </a>
              )}
              {links.facebook_id && (
                <a href={`https://www.facebook.com/${links.facebook_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1877f2' }} title="Facebook">
                  <AtSign size={24} />
                </a>
              )}
            </div>
            {!personData.homepage && !links.imdb_id && !links.instagram_id && !links.twitter_id && !links.facebook_id && (
              <span style={{color: '#94a3b8', fontSize: '13px'}}>Немає посилань</span>
            )}
          </div>
        </div>

        {/* ПРАВА КОЛОНКА */}
        <div style={styles.rightColumn}>
          <div className="main-tabs-wrapper">
            <div className="main-tabs-container custom-scroll">
              <button className={`main-tab ${activeTab === 'main' ? 'active' : ''}`} onClick={() => setActiveTab('main')}>
                Головна
              </button>
              {profiles.length > 0 && (
                <button className={`main-tab ${activeTab === 'photos' ? 'active' : ''}`} onClick={() => setActiveTab('photos')}>
                  Фотографії ({profiles.length})
                </button>
              )}
              <button className={`main-tab ${activeTab === 'sources' ? 'active' : ''}`} onClick={() => setActiveTab('sources')}>
                Джерела
              </button>
            </div>
          </div>

          {/* ВКЛАДКА: ПРО ЛЮДИНУ */}
          {activeTab === 'main' && (
            <>
              {/* ЗАГОЛОВОК */}
              <div style={styles.headerBlock}>
                <h1 style={styles.mainTitle}>{personData.name}</h1>
                {originalName && (
                  <h2 style={{...styles.originalTitle, color: '#94a3b8', fontWeight: '500'}}>
                    <span style={{color: '#cbd5e1'}}>{originalName}</span>
                  </h2>
                )}
              </div>

              {/* ДЕТАЛІ */}
              <div style={styles.detailsBox}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Стать:</span>
                  <span style={styles.detailValue}>{getGender(personData.gender)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Дата народження:</span>
                  <span style={styles.detailValue}>
                    {formatBirthday(personData.birthday)} {age !== null && !personData.deathday ? `(${age} років)` : ''}
                  </span>
                </div>
                {personData.deathday && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Дата смерті:</span>
                    <span style={styles.detailValue}>
                      {formatBirthday(personData.deathday)} {age !== null ? `(У віці ${age} років)` : ''}
                    </span>
                  </div>
                )}
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Місце народження:</span>
                  <span style={styles.detailValue}>{personData.place_of_birth || '-'}</span>
                </div>
                
                {otherNames.length > 0 && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>{getAlsoKnownAsLabel(personData.gender)}:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {otherNames.map((name, idx) => (
                        <span key={idx} style={styles.detailValue}>{name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* БІОГРАФІЯ */}
              {personData.biography && (
                <div style={styles.sectionBlock}>
                  <h3 style={styles.sectionTitle}>Біографія</h3>
                  <div style={{ position: 'relative' }}>
                    <p style={{ 
                      ...styles.descriptionText, 
                      whiteSpace: 'pre-line',
                      display: isBioExpanded ? 'block' : '-webkit-box',
                      WebkitLineClamp: isBioExpanded ? 'unset' : 6,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {personData.biography}
                    </p>
                    {personData.biography.length > 400 && (
                      <button 
                        onClick={() => setIsBioExpanded(!isBioExpanded)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          padding: '5px 0',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          marginTop: '5px'
                        }}
                      >
                        {isBioExpanded ? 'Згорнути' : 'Читати далі...'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ВІДОМІ РОБОТИ (ГОР. СКРОЛ) */}
              {topCredits.length > 0 && (
                <div style={styles.sectionBlock}>
                  <h3 style={styles.sectionTitle}>{getKnownForLabel(personData.gender)}</h3>
                  <div className="custom-scroll" style={styles.horizontalScroll}>
                    {topCredits.map(credit => {
                      const displayTitle = credit.title || credit.name;
                      const originalDisplayTitle = credit.original_title || credit.original_name;
                      return (
                        <div 
                          key={credit.id} 
                          style={{...styles.personCard, width: '140px', cursor: 'pointer'}} 
                          onClick={() => navigate(`/media/${credit.media_type === 'tv' ? 'series' : 'movie'}/${credit.id}`)}
                        >
                          <img 
                            src={credit.poster_path ? `https://image.tmdb.org/t/p/w342${credit.poster_path}` : 'https://via.placeholder.com/140x210?text=No+Poster'} 
                            alt={displayTitle} 
                            style={{...styles.personPhoto, height: '210px'}} 
                          />
                          <div style={{...styles.personName, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={displayTitle}>
                            {displayTitle}
                          </div>
                          {originalDisplayTitle && originalDisplayTitle !== displayTitle && (
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={originalDisplayTitle}>
                              {originalDisplayTitle}
                            </div>
                          )}
                        </div>
                    )})}
                  </div>
                </div>
              )}

              {/* УСЯ ФІЛЬМОГРАФІЯ */}
              <div style={{...styles.sectionBlock, marginTop: '40px'}}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                  <h3 style={{...styles.sectionTitle, marginBottom: 0}}>Фільмографія</h3>
                  
                  {/* ФІЛЬТРИ */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                    
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      <select value={creditFilterRole} onChange={(e) => setCreditFilterRole(e.target.value)} style={selectStyle}>
                        <option value="all" style={{ background: '#1e293b', color: '#f8fafc' }}>Усі ролі</option>
                        {availableRoles.map(role => (
                          <option key={role.name} value={role.name} style={{ background: '#1e293b', color: '#f8fafc' }}>
                            {role.name} ({role.count})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#38bdf8' }} />
                    </div>

                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      <select value={creditFilterType} onChange={(e) => setCreditFilterType(e.target.value)} style={selectStyle}>
                        <option value="all" style={{ background: '#1e293b', color: '#f8fafc' }}>Всі формати</option>
                        <option value="movie" style={{ background: '#1e293b', color: '#f8fafc' }}>Фільми</option>
                        <option value="tv" style={{ background: '#1e293b', color: '#f8fafc' }}>Серіали</option>
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#38bdf8' }} />
                    </div>

                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 'auto' }}>
                      <select value={creditSort} onChange={(e) => setCreditSort(e.target.value)} style={{...selectStyle, color: '#facc15', borderColor: 'rgba(250, 204, 21, 0.2)', background: 'rgba(250, 204, 21, 0.05)'}}>
                        <option value="newest" style={{ background: '#1e293b', color: '#f8fafc' }}>Спочатку нові</option>
                        <option value="oldest" style={{ background: '#1e293b', color: '#f8fafc' }}>Спочатку старі</option>
                        <option value="rating" style={{ background: '#1e293b', color: '#f8fafc' }}>За рейтингом TMDB</option>
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#facc15' }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {processedCredits.map((credit, idx) => (
                    <div 
                      key={`${credit.id}-${idx}`} 
                      style={{
                        display: 'flex', alignItems: 'center', gap: '15px', 
                        backgroundColor: '#1a1a1a', padding: '10px', 
                        borderRadius: '8px', border: '1px solid #2a2a2a',
                        cursor: 'pointer', transition: 'background 0.2s'
                      }}
                      onClick={() => navigate(`/media/${credit.media_type === 'tv' ? 'series' : 'movie'}/${credit.id}`)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                    >
                      {/* РІК */}
                      <div style={{ width: '45px', textAlign: 'center', color: '#94a3b8', fontSize: '15px', fontWeight: 'bold' }}>
                        {getYear(credit.release_date)}
                      </div>
                      
                      {/* МІНІ-ПОСТЕР */}
                      <img 
                        src={credit.poster_path ? `https://image.tmdb.org/t/p/w92${credit.poster_path}` : 'https://via.placeholder.com/60x90?text=No+Img'} 
                        alt={credit.title}
                        className="img-posters"
                        style={{ width: '60px', height: '90px', borderRadius: '4px', backgroundColor: '#333' }}
                      />
                      
                      {/* ІНФО */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                            {credit.title}
                          </span>
                          {credit.vote_average > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.1)', padding: '2px 6px', borderRadius: '10px' }}>
                              <Star size={12} fill="#facc15" /> {credit.vote_average.toFixed(1)}
                            </span>
                          )}
                        </div>
                        
                        {credit.original_title && credit.original_title !== credit.title && (
                           <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                             {credit.original_title}
                           </div>
                        )}
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                          {credit.castRoles.length > 0 && (
                             <div style={{ fontSize: '13px', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                               <span style={{ color: '#facc15', fontWeight: '600', marginRight: '6px' }}>
                                 {personData.gender === 1 ? 'Роль:' : 'Роль:'}
                               </span>
                                {credit.castRoles.join(', ')}
                             </div>
                          )}
                          
                          {credit.crewJobs.length > 0 && (
                             <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                               {credit.crewJobs.join(', ')}
                             </div>
                          )}
                        </div>
                      </div>
                      
                      {/* ТИП */}
                      <div style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: credit.media_type === 'movie' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: credit.media_type === 'movie' ? '#38bdf8' : '#10b981', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', flexShrink: 0 }}>
                        {credit.media_type === 'movie' ? 'Фільм' : 'Серіал'}
                      </div>
                    </div>
                  ))}
                  
                  {processedCredits.length === 0 && (
                    <p style={styles.emptyText}>Нічого не знайдено.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ВКЛАДКА: ДЖЕРЕЛА */}
          {activeTab === 'sources' && (
            <div style={{ marginTop: '10px' }}>
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
                            <div className="source-icon-wrapper">{item.icon}</div>
                            <span className="source-label">{item.label}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ВКЛАДКА: ФОТО */}
          {activeTab === 'photos' && profiles.length > 0 && (
            <>
              <div style={{ ...styles.imagesGrid, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {profiles.map((img, idx) => (
                  <div key={idx} className="image-card" style={{ cursor: 'pointer' }} onClick={() => setLightboxIndex(idx)}>
                    <img 
                      src={`https://image.tmdb.org/t/p/w500${img.file_path}`} 
                      alt={`Фото ${idx}`} 
                      className="img-posters"
                      loading="lazy" 
                    />
                  </div>
                ))}
              </div>

              {/* Лайтбокс */}
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
                    src={`https://image.tmdb.org/t/p/original${profiles[lightboxIndex].file_path}`} 
                    alt="На повний екран"
                    style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
                  />

                  <button 
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => Math.min(prev + 1, profiles.length - 1)); }}
                    style={{ position: 'absolute', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '15px', borderRadius: '50%', cursor: lightboxIndex === profiles.length - 1 ? 'default' : 'pointer', opacity: lightboxIndex === profiles.length - 1 ? 0.3 : 1 }}
                    disabled={lightboxIndex === profiles.length - 1}
                  ><ChevronRight size={32} /></button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}