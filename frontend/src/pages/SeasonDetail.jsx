// frontend/src/pages/SeasonDetail.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, CheckCircle, Circle } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import ActionButtons from '../components/ActionButtons';
import { TabMainSeason, TabActors, TabShots, TabHistory, TabSources } from '../components/MediaTabs';
import { getAverageColor, getLocalDateString } from '../utils';
import { api } from '../utils/api';

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
      const res = await api.getMediaByExternalId(externalId);
      if (res.data) {
        setLocalMedia(res.data);
        
        const [historyRes, childrenRes] = await Promise.all([
            api.getHistory(res.data.id),
            api.getMediaChildren(res.data.id)
        ]);
        setLogs(historyRes.data || []);
        if (childrenRes.data) {
          const statusByEpisode = {};
          childrenRes.data.forEach(child => {
            if (child.media_type === 'episode') {
              statusByEpisode[child.episode] = child.isWatched;
            }
          });
          setEpisodeStatuses(statusByEpisode);
        }
      }
    } catch (err) {
       setEpisodeStatuses({});
       setLogs([]);
    }
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
        
        let seriesMediaId = null;
        try {
            const seriesRes = await api.getMediaByExternalId(`tv_${tmdbId}`);
            seriesMediaId = seriesRes.data.id;
        } catch (err) {
            const createSeriesRes = await api.createMedia({
                title: seriesData.title, 
                original_title: seriesData.original_title,
                media_type: 'series', 
                external_id: `tv_${tmdbId}`, 
                tmdb_id: seriesData.tmdb_id,
                total_seasons: seriesData.total_seasons || seriesData.number_of_seasons || 1,
                total_episodes: seriesData.total_episodes || seriesData.number_of_episodes || 0,
                poster_path: seriesData.poster_path,
                backdrop_path: seriesData.backdrop_path,
                release_date: seriesData.first_air_date || seriesData.release_date
            });
            seriesMediaId = createSeriesRes.data.id;
        }

        if (!seriesMediaId) return null;

        try {
            const res = await api.createMedia({
                title: `${seriesData.title} - ${seasonData.name}`,
                original_title: seasonData.name,
                media_type: 'season',
                external_id: externalId,
                parent_id: seriesMediaId,
                poster_path: seasonData.poster_path || seriesData.poster_path,
                release_date: seasonData.air_date || null,
                season: parseInt(seasonNumber, 10),
                total_episodes: seasonData.episodes?.length || 1,
                tmdb_id: seasonData.id
            });
            setLocalMedia(res.data);
            return res.data;
        } catch (e) {
            const retryRes = await api.getMediaByExternalId(externalId);
            setLocalMedia(retryRes.data);
            return retryRes.data;
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
      await api.updateMedia(mediaId, updates);
      await reloadLocalMedia();
    } catch (err) {}
  };

  const handleAddToHistory = async (mediaId, data) => {
    try {
      await api.addToHistory(mediaId, data);
      await reloadLocalMedia();
    } catch (err) {}
  };

  const handleRemoveFromHistory = async (mediaId) => {
    try {
      await api.removeFromHistory(mediaId);
      await reloadLocalMedia();
    } catch (err) {}
  };

  const handleToggleWatchlist = async (mediaId) => {
    try {
      await api.toggleWatchlist(mediaId);
      await reloadLocalMedia();
    } catch (err) {}
  };

  const handleQuickEpisodeWatch = async (e, ep) => {
    e.stopPropagation();
    const isWatched = !!episodeStatuses[ep.episode_number];
    const newWatchedState = !isWatched;

    setEpisodeStatuses(prev => ({ ...prev, [ep.episode_number]: newWatchedState }));

    try {
        const seasonMedia = await ensureLocalMedia();
        if (!seasonMedia) throw new Error("Не вдалося створити сезон");

        let epMediaId = null;
        const epExtId = `episode_${ep.id}`;
        
        try {
            const checkRes = await api.getMediaByExternalId(epExtId);
            epMediaId = checkRes.data.id;
        } catch (err) {
            const createRes = await api.createMedia({
                title: `${seriesData.title} - S${seasonNumber}E${ep.episode_number}`,
                original_title: ep.name,
                media_type: 'episode',
                external_id: epExtId,
                parent_id: seasonMedia.id,
                poster_path: ep.still_path,
                release_date: ep.air_date,
                season: parseInt(seasonNumber, 10),
                episode: ep.episode_number,
                tmdb_id: ep.id
            });
            epMediaId = createRes.data.id;
        }

        if (newWatchedState) {
            const isoString = new Date().toISOString();
            await api.addToHistory(epMediaId, { watched_at: isoString });
        } else {
            await api.removeFromHistory(epMediaId);
        }
        
        reloadLocalMedia();
    } catch (err) {
        console.error(err);
        setEpisodeStatuses(prev => ({ ...prev, [ep.episode_number]: isWatched }));
    }
  };

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!seasonData) return <div style={styles.loadingWrapper}>Сезон не знайдено</div>;

  const displaySeriesTitle = seriesData ? seriesData.title : 'Завантаження...';
  const totalEpisodes = seasonData.episodes?.length || 0;
  const watchedEpisodesCount = Object.values(episodeStatuses).filter(Boolean).length;
  const seasonProgressPercent = totalEpisodes > 0 ? (watchedEpisodesCount / totalEpisodes) * 100 : 0;

  const tabs = [
    { id: 'episodes', label: 'Епізоди' },
    { id: 'main', label: 'Огляд' },
    { id: 'actors', label: 'Актори' },
    { id: 'shots', label: 'Кадри' },
    { id: 'history', label: 'Історія' },
    { id: 'sources', label: 'Джерела' }
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
            ensureLocalMedia={ensureLocalMedia}
            handleUpdate={handleUpdate}
            handleAddToHistory={handleAddToHistory}
            handleRemoveFromHistory={handleRemoveFromHistory}
            handleToggleWatchlist={handleToggleWatchlist}
          />
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.headerBlock}>
            <h1 style={styles.mainTitle}>
              {seasonData.season_number === 0 && !seasonData.name.toLowerCase().includes('спец') ? 'Спеціальні епізоди' : seasonData.name}
            </h1>
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

          {activeTab === 'main' && <TabMainSeason tmdbData={seasonData} />}
          
          {activeTab === 'episodes' && (
            <>
              {seasonData.episodes && seasonData.episodes.length > 0 ? (
                <div style={styles.sectionBlock}>
                  
                  <div style={{ marginBottom: '25px', backgroundColor: '#1a1a1a', padding: '16px', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Прогрес сезону</span>
                      <span style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 'bold' }}>
                        {watchedEpisodesCount} / {totalEpisodes}
                      </span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        backgroundColor: '#38bdf8', 
                        width: `${seasonProgressPercent}%`,
                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
                      }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {seasonData.episodes.map(ep => {
                      const isWatched = !!episodeStatuses[ep.episode_number];
                      
                      return (
                      <div 
                        key={ep.episode_number} 
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#1a1a1a', 
                            padding: '12px', borderRadius: '12px', border: isWatched ? '1px solid rgba(46, 204, 113, 0.3)' : '1px solid #2a2a2a', 
                            cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative'
                        }}
                        onClick={() => navigate(`/media/${type}/${tmdbId}/season/${seasonNumber}/episode/${ep.episode_number}`)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#222'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                      >
                        <div style={{ position: 'relative', width: '140px', flexShrink: 0 }}>
                          <img 
                            src={ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : 'https://via.placeholder.com/300x170?text=No+Image'} 
                            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '8px', opacity: isWatched ? 0.5 : 1, transition: 'opacity 0.3s' }} 
                            alt={ep.name}
                            loading="lazy"
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ color: isWatched ? '#2ecc71' : '#38bdf8', fontSize: '13px', fontWeight: '900' }}>
                                    {ep.episode_number}
                                </span>
                                <h3 style={{ margin: 0, color: isWatched ? '#cbd5e1' : '#fff', fontSize: '16px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {ep.name}
                                </h3>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '15px', color: '#64748b', fontSize: '13px' }}>
                                <span>{ep.air_date ? new Date(ep.air_date).toLocaleDateString('uk-UA') : 'ТБА'}</span>
                                {ep.runtime > 0 && <span>{ep.runtime} хв.</span>}
                            </div>
                            
                            <p style={{ 
                                margin: '8px 0 0 0', color: '#94a3b8', fontSize: '13px', lineHeight: '1.4',
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' 
                            }}>
                                {ep.overview || 'Опис відсутній'}
                            </p>
                        </div>

                        <button 
                            onClick={(e) => handleQuickEpisodeWatch(e, ep)}
                            style={{ 
                                background: 'transparent', border: 'none', cursor: 'pointer', padding: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            title={isWatched ? "Скасувати перегляд" : "Відмітити як переглянуто"}
                        >
                            {isWatched ? (
                                <CheckCircle size={28} color="#2ecc71" fill="rgba(46, 204, 113, 0.2)" />
                            ) : (
                                <Circle size={28} color="#475569" />
                            )}
                        </button>
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
          {activeTab === 'sources' && <TabSources tmdbData={seasonData} />}
          
          {activeTab === 'history' && (
            <TabHistory 
              localMedia={localMedia}
              logs={logs} 
              ensureLocalMedia={ensureLocalMedia}
              onHistoryChange={() => reloadLocalMedia()}
            />
          )}
        </div>
      </div>
    </div>
  );
}