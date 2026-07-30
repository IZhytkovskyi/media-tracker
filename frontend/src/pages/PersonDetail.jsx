// frontend/src/pages/PersonDetail.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ExternalLink, Link as LinkIcon, ChevronLeft, ChevronRight, AtSign } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';

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
    default: return 'Невідомо';
  }
};

const getYear = (item) => {
  const date = item.release_date || item.first_air_date;
  return date ? new Date(date).getFullYear() : '—';
};

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [personData, setPersonData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Вкладки: 'main', 'credits', 'photos'
  const [activeTab, setActiveTab] = useState('main');
  const [activeCreditTab, setActiveCreditTab] = useState('cast'); // 'cast' або 'crew'
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    const fetchPersonDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/external/tmdb/person/${id}`);
        const json = await response.json();
        if (json.data) setPersonData(json.data);
      } catch (err) {
        console.error('Помилка при завантаженні даних про особу:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPersonDetails();
  }, [id]);

  // Сортування фільмографії за датою (від новіших до старіших)
  const sortedCast = useMemo(() => {
    if (!personData?.combined_credits?.cast) return [];
    return [...personData.combined_credits.cast].sort((a, b) => {
      const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
      const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
      return dateB - dateA;
    });
  }, [personData]);

  const sortedCrew = useMemo(() => {
    if (!personData?.combined_credits?.crew) return [];
    return [...personData.combined_credits.crew].sort((a, b) => {
      const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
      const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
      return dateB - dateA;
    });
  }, [personData]);

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!personData) return <div style={styles.loadingWrapper}>Не вдалося завантажити дані.</div>;

  const age = calculateAge(personData.birthday, personData.deathday);
  const formatBirthday = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('uk-UA') : '-';
  const profiles = personData.images?.profiles || [];

  return (
    <div style={styles.container}>
      <MediaGlobalStyles />
      
      <div style={styles.topNav}>
        <button onClick={() => navigate(-1)} style={styles.navButton}>
          <ArrowLeft size={16} /> Назад
        </button>
        <button onClick={() => navigate('/')} style={styles.navButtonIcon}>
          <X size={18} />
        </button>
      </div>

      <div style={styles.mainContent}>
        {/* ЛІВА КОЛОНКА: Фото та зовнішні посилання */}
        <div style={styles.leftColumn}>
          <div style={styles.posterWrapper}>
            <img
              src={personData.profile_path ? `https://image.tmdb.org/t/p/w500${personData.profile_path}` : 'https://via.placeholder.com/300x450?text=Немає+Фото'}
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
              {personData.external_ids?.imdb_id && (
                <a href={`https://www.imdb.com/name/${personData.external_ids.imdb_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#facc15' }} title="IMDb">
                  <ExternalLink size={24} />
                </a>
              )}
              {personData.external_ids?.instagram_id && (
                <a href={`https://www.instagram.com/${personData.external_ids.instagram_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#e1306c' }} title="Instagram">
                  <AtSign size={24} />
                </a>
              )}
              {personData.external_ids?.twitter_id && (
                <a href={`https://twitter.com/${personData.external_ids.twitter_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1da1f2' }} title="Twitter (X)">
                  <AtSign size={24} />
                </a>
              )}
              {personData.external_ids?.facebook_id && (
                <a href={`https://www.facebook.com/${personData.external_ids.facebook_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1877f2' }} title="Facebook">
                  <AtSign size={24} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ПРАВА КОЛОНКА: Вкладки та контент */}
        <div style={styles.rightColumn}>
          <div className="main-tabs-wrapper">
            <div className="main-tabs-container custom-scroll">
              <button className={`main-tab ${activeTab === 'main' ? 'active' : ''}`} onClick={() => setActiveTab('main')}>
                Біографія
              </button>
              <button className={`main-tab ${activeTab === 'credits' ? 'active' : ''}`} onClick={() => setActiveTab('credits')}>
                Фільмографія
              </button>
              {profiles.length > 0 && (
                <button className={`main-tab ${activeTab === 'photos' ? 'active' : ''}`} onClick={() => setActiveTab('photos')}>
                  Галерея ({profiles.length})
                </button>
              )}
            </div>
          </div>

          {/* Вкладка: Біографія */}
          {activeTab === 'main' && (
            <>
              <div style={styles.headerBlock}>
                <h1 style={styles.mainTitle}>{personData.name}</h1>
                {personData.known_for_department && (
                  <h2 style={styles.originalTitle}>{personData.known_for_department}</h2>
                )}
              </div>

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
                      {formatBirthday(personData.deathday)} {age !== null ? `(У віці: ${age} років)` : ''}
                    </span>
                  </div>
                )}
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Місце народження:</span>
                  <span style={styles.detailValue}>{personData.place_of_birth || '-'}</span>
                </div>
                {personData.also_known_as && personData.also_known_as.length > 0 && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Також відомо як:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {personData.also_known_as.map((name, idx) => (
                        <span key={idx} style={styles.detailValue}>{name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {personData.biography && (
                <div style={styles.sectionBlock}>
                  <h3 style={styles.sectionTitle}>Біографія</h3>
                  <p style={{ ...styles.descriptionText, whiteSpace: 'pre-line' }}>{personData.biography}</p>
                </div>
              )}
            </>
          )}

          {/* Вкладка: Фільмографія */}
          {activeTab === 'credits' && (
            <>
              <div className="sub-tabs-container">
                <button 
                  className={`sub-tab ${activeCreditTab === 'cast' ? 'active' : ''}`} 
                  onClick={() => setActiveCreditTab('cast')}
                >
                  Актор / Акторка ({sortedCast.length})
                </button>
                <button 
                  className={`sub-tab ${activeCreditTab === 'crew' ? 'active' : ''}`} 
                  onClick={() => setActiveCreditTab('crew')}
                >
                  За кадром ({sortedCrew.length})
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(activeCreditTab === 'cast' ? sortedCast : sortedCrew).map((credit, idx) => (
                  <div 
                    key={`${credit.credit_id}-${idx}`}
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
                    <div style={{ width: '50px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>
                      {getYear(credit)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>
                        {credit.title || credit.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                        {activeCreditTab === 'cast' ? (
                          credit.character ? `Роль: ${credit.character}` : 'Роль не вказана'
                        ) : (
                          `Посада: ${credit.job || credit.department}`
                        )}
                        {credit.episode_count ? ` (${credit.episode_count} епізодів)` : ''}
                      </div>
                    </div>
                    <div style={{ color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                      {credit.media_type === 'movie' ? 'Фільм' : 'Серіал'}
                    </div>
                  </div>
                ))}
                
                {(activeCreditTab === 'cast' ? sortedCast : sortedCrew).length === 0 && (
                  <p style={styles.emptyText}>Немає записів у цій категорії.</p>
                )}
              </div>
            </>
          )}

          {/* Вкладка: Галерея */}
          {activeTab === 'photos' && profiles.length > 0 && (
            <>
              <div style={{ ...styles.imagesGrid, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {profiles.map((img, idx) => (
                  <div key={idx} className="image-card" style={{ cursor: 'pointer' }} onClick={() => setLightboxIndex(idx)}>
                    <img 
                      src={`https://image.tmdb.org/t/p/w500${img.file_path}`} 
                      alt={`Фото ${idx}`} 
                      style={styles.imgPosters} 
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
                    alt="Оригінал" 
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