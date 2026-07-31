import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Check } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import ActionButtons from '../components/ActionButtons';
import { TabActors, TabShots, TabHistory } from '../components/MediaTabs';
import { getAverageColor } from '../utils';

export default function SeasonDetail() {
  const { type, tmdbId, seasonNumber } = useParams();
  const navigate = useNavigate();
  
  const [localMedia, setLocalMedia] = useState(null);
  const [seasonData, setSeasonData] = useState(null);
  const [seriesData, setSeriesData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [episodeStatuses, setEpisodeStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState('10, 10, 10');
  const [activeTab, setActiveTab] = useState('episodes');
  
  const creatingRef = useRef(null);
  const externalId = `season_${seasonData?.id || 'temp'}`;

  const reloadLocalMedia = async () => {
    if (!seasonData) return;
    try {
      const res = await fetch(`/api/media/external/${externalId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setLocalMedia(json.data);
          const logsRes = await fetch(`/api/media/${json.data.id}/logs`);
          if (logsRes.ok) {
            const logsJson = await logsRes.json();
            setLogs(logsJson.data || []);
          }

          const childrenRes = await fetch(`/api/media/${json.data.id}/children`);
          if (childrenRes.ok) {
            const childrenJson = await childrenRes.json();
            const statusByEpisode = {};
            (childrenJson.data || []).forEach(child => {
              if (child.media_type === 'episode') {
                statusByEpisode[child.episode] = child.status;
              }
            });
            setEpisodeStatuses(statusByEpisode);
          }
        } else {
          setEpisodeStatuses({});
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [seasonRes, seriesRes] = await Promise.all([
          fetch(`/api/external/tmdb/details/series/${tmdbId}/season/${seasonNumber}`),
          fetch(`/api/external/tmdb/details/series/${tmdbId}`)
        ]);
        
        const seasonJson = await seasonRes.json();
        const seriesJson = await seriesRes.json();
        
        if (seasonJson.data) {
            setSeasonData(seasonJson.data);
            if (seasonJson.data.poster_path) {
                const url = `https://image.tmdb.org/t/p/w154${seasonJson.data.poster_path}`;
                getAverageColor(url).then(color => setDominantColor(color));
            }
        }
        
        if (seriesJson.data) {
            setSeriesData(seriesJson.data);
        }
      } catch (err) {
        console.error('Помилка завантаження:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [type, tmdbId, seasonNumber]);

  useEffect(() => {
      if (seasonData) reloadLocalMedia();
  }, [seasonData]);

  const ensureLocalMedia = async () => {
    if (localMedia) return localMedia;
    if (creatingRef.current) return await creatingRef.current;
    
    creatingRef.current = (async () => {
      try {
        if (!seriesData || !seasonData) return null;
        
        // 1. Спочатку перевіряємо/створюємо серіал
        let seriesMediaId = null;
        const seriesRes = await fetch(`/api/media/external/tv_${tmdbId}`);
        if (!seriesRes.ok) {
            const res = await fetch('/api/media', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: seriesData.title, original_title: seriesData.original_title,
                    media_type: 'series', external_id: `tv_${tmdbId}`, tmdb_id: seriesData.id,
                    total_seasons: seriesData.total_seasons || seriesData.number_of_seasons || 1
                })
            });
            const j = await res.json();
            seriesMediaId = j.data.id;
        } else {
            seriesMediaId = (await seriesRes.json()).data.id;
        }

        // 2. Створюємо сезон (обов'язково парсимо в число, щоб не ламати БД)
        const res = await fetch('/api/media', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${seriesData.title} - ${seasonData.name}`,
            media_type: 'season',
            external_id: externalId,
            parent_id: seriesMediaId,
            poster_path: seasonData.poster_path,
            season: parseInt(seasonNumber, 10),
            total_episodes: seasonData.episodes?.length || 1,
            tmdb_id: seasonData.id
          })
        });
        
        if (res.ok) {
          const json = await res.json();
          setLocalMedia(json.data);
          return json.data;
        }
      } catch (err) {} finally {
        creatingRef.current = null;
      }
      return null;
    })();
    return await creatingRef.current;
  };

  const handleUpdate = async (mediaId, updates) => {
    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) await reloadLocalMedia();
    } catch (err) {}
  };

  const handleLogCreate = async (mediaId, logData) => {
    try {
      await fetch(`/api/media/${mediaId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      await reloadLocalMedia();
    } catch (err) {}
  };

  const handleLogUpdate = async (mediaId, logId, logData) => {
    try {
      await fetch(`/api/media/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      await reloadLocalMedia();
    } catch (err) {}
  };

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!seasonData) return <div style={styles.loadingWrapper}>Дані не знайдено</div>;

  const displaySeriesTitle = seriesData ? seriesData.title : 'Завантаження...';

  const tabs = [
    { id: 'episodes', label: 'Серії' },
    { id: 'actors', label: 'Актори' },
    { id: 'shots', label: 'Кадри' },
    { id: 'history', label: 'Історія' }
  ];

  return (
    <div style={styles.container}>
      <MediaGlobalStyles dominantColor={dominantColor} />
      
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '400px', pointerEvents: 'none',
        background: `linear-gradient(to bottom, rgba(${dominantColor}, 0.2) 0%, rgba(10,10,10,0) 100%)`, zIndex: 0
      }} />

      <div style={styles.topNav}>
        <button onClick={() => navigate(-1)} style={styles.navButton}><ArrowLeft size={16} /> Назад</button>
        <button onClick={() => navigate('/')} style={styles.navButtonIcon}><X size={18} /></button>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.leftColumn}>
          <div style={styles.posterWrapper}>
            <img
              src={seasonData.poster_path ? `https://image.tmdb.org/t/p/w500${seasonData.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster'}
              alt={seasonData.name}
              style={styles.poster}
            />
          </div>
          <ActionButtons 
            type="season" 
            localMedia={localMedia} 
            logs={logs}
            ensureLocalMedia={ensureLocalMedia}
            handleUpdate={handleUpdate}
            handleLogCreate={handleLogCreate}
            handleLogUpdate={handleLogUpdate}
          />
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.headerBlock}>
            <h1 style={styles.mainTitle}>{seasonData.name}</h1>
            <h2 style={styles.originalTitle} onClick={() => navigate(`/media/series/${tmdbId}`)} className="series-link">
                {displaySeriesTitle}
            </h2>
            <style>{`
                .series-link { cursor: pointer; transition: color 0.2s; display: inline-block; }
                .series-link:hover { color: #38bdf8 !important; }
            `}</style>
          </div>

          <div className="main-tabs-wrapper">
            <div className="main-tabs-container custom-scroll">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`main-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'episodes' && (
            <>
              {seasonData.overview && (
                <div style={styles.sectionBlock}>
                  <p style={styles.descriptionText}>{seasonData.overview}</p>
                </div>
              )}

              {seasonData.episodes && seasonData.episodes.length > 0 ? (
                <div style={styles.sectionBlock}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                    {seasonData.episodes.map(ep => {
                      const epStatus = episodeStatuses[ep.episode_number];
                      const isWatched = epStatus === 'completed';
                      return (
                      <div
                        key={ep.episode_number}
                        style={{
                            backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', 
                            border: isWatched ? '1px solid #2ecc71' : '1px solid #2a2a2a', cursor: 'pointer', transition: 'transform 0.2s',
                            position: 'relative'
                        }}
                        onClick={() => navigate(`/media/${type}/${tmdbId}/season/${seasonNumber}/episode/${ep.episode_number}`)}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <div style={{ position: 'relative' }}>
                          <img
                            src={ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : 'https://via.placeholder.com/300x170?text=No+Image'}
                            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', opacity: isWatched ? 0.7 : 1 }}
                            alt={ep.name}
                          />
                          {isWatched && (
                            <div style={{
                              position: 'absolute', top: '8px', right: '8px',
                              backgroundColor: '#2ecc71', borderRadius: '50%',
                              width: '24px', height: '24px', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.5)'
                            }}>
                              <Check size={16} color="#000" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '12px' }}>
                            <div style={{ color: isWatched ? '#2ecc71' : '#38bdf8', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                                Епізод {ep.episode_number}{isWatched ? ' • Переглянуто' : ''}
                            </div>
                            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ep.name}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                                {ep.air_date ? new Date(ep.air_date).toLocaleDateString('uk-UA') : 'Невідома дата'}
                            </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p style={styles.emptyText}>Епізоди не знайдено.</p>
              )}
            </>
          )}

          {activeTab === 'actors' && <TabActors tmdbData={seasonData} />}
          {activeTab === 'shots' && <TabShots tmdbData={seasonData} />}
          {activeTab === 'history' && (
            <TabHistory
              logs={logs}
              viewType="season"
              onUpdate={async (id, data) => localMedia && handleLogUpdate(localMedia.id, id, data)}
              onCreate={async (data) => {
                  const media = await ensureLocalMedia();
                  if (media) await handleLogCreate(media.id, data);
              }}
              onDelete={async (id) => {
                 if(window.confirm('Точно видалити?')) {
                     await fetch(`/api/media/logs/${id}`, { method: 'DELETE' });
                     await reloadLocalMedia();
                 }
              }}
            />
          )}

        </div>
      </div>
    </div>
  );
}