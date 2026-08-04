// frontend/src/pages/MediaDetail.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import { TabMain, TabActors, TabShots, TabPremiere, TabSources, TabHistory, TabSeasons } from '../components/MediaTabs';
import ActionButtons from '../components/ActionButtons';
import { getAverageColor } from '../utils';
import { api } from '../utils/api'; // Імпортуємо наш новий API

export default function MediaDetail() {
  const { type, tmdbId } = useParams();
  const navigate = useNavigate();
  
  const [localMedia, setLocalMedia] = useState(null);
  const [tmdbData, setTmdbData] = useState(null);
  const [omdbData, setOmdbData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('main');
  const [dominantColor, setDominantColor] = useState('10, 10, 10');
  const [currentPosterIndex, setCurrentPosterIndex] = useState(0);
  
  const creatingRef = useRef(null);
  const externalId = `${type === 'series' ? 'tv' : 'movie'}_${tmdbId}`;

  const reloadLogsAndMedia = async (mediaId) => {
    if (!mediaId) return;
    try {
      const [logsRes, mediaRes] = await Promise.all([
        api.getHistory(mediaId),
        api.getMediaById(mediaId)
      ]);
      setLogs(logsRes.data || []);
      setLocalMedia(mediaRes.data || null);
    } catch (err) {
      console.error('Помилка оновлення даних:', err);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [localRes, tmdbRes] = await Promise.all([
          fetch(`/api/media/external/${externalId}`),
          fetch(`/api/external/tmdb/details/${type}/${tmdbId}`)
        ]);
        
        let localMediaData = null;
        if (localRes.ok) {
          const localJson = await localRes.json();
          if (localJson.data) {
            localMediaData = localJson.data;
            setLocalMedia(localMediaData);
          }
        }
        
        if (tmdbRes.ok) {
          const tmdbJson = await tmdbRes.json();
          if (tmdbJson.data) {
            setTmdbData(tmdbJson.data);
            if (tmdbJson.data.poster_path) {
              const url = `https://image.tmdb.org/t/p/w154${tmdbJson.data.poster_path}`;
              getAverageColor(url).then(color => setDominantColor(color));
            }
            
            // OMDb
            if (tmdbJson.data.imdb_id) {
              fetch(`/api/external/omdb/details/${tmdbJson.data.imdb_id}`)
                .then(res => res.json())
                .then(omdbJson => {
                  if (omdbJson.data) setOmdbData(omdbJson.data);
                })
                .catch(e => console.error("Помилка OMDb:", e));
            }
          }
        }
        
        if (localMediaData) {
          await reloadLogsAndMedia(localMediaData.id);
        }
      } catch (err) {
        console.error('Помилка завантаження:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [type, tmdbId, externalId]);

  const ensureLocalMedia = async () => {
    if (localMedia) return localMedia;
    if (creatingRef.current) return await creatingRef.current;
    
    creatingRef.current = (async () => {
      try {
        const res = await api.createMedia({
          title: tmdbData.title,
          original_title: tmdbData.original_title,
          media_type: type,
          external_id: externalId,
          poster_path: tmdbData.poster_path,
          backdrop_path: tmdbData.backdrop_path,
          release_date: tmdbData.release_date,
          genres: tmdbData.genres || [],
          total_seasons: tmdbData.total_seasons || 0,
          total_episodes: tmdbData.total_episodes || 0,
          tmdb_id: tmdbData.tmdb_id,
          imdb_id: tmdbData.imdb_id
        });
        setLocalMedia(res.data);
        return res.data;
      } catch (err) {
        console.error('Помилка створення медіа:', err);
      } finally {
        creatingRef.current = null;
      }
      return null;
    })();
    return await creatingRef.current;
  };

  // === Нові функції взаємодії з API ===
  const handleUpdate = async (mediaId, updates) => {
    try {
      await api.updateMedia(mediaId, updates);
      await reloadLogsAndMedia(mediaId);
    } catch (err) { console.error(err); }
  };

  const handleAddToHistory = async (mediaId, data) => {
    try {
      await api.addToHistory(mediaId, data);
      await reloadLogsAndMedia(mediaId);
    } catch (err) { console.error(err); }
  };

  const handleRemoveFromHistory = async (mediaId) => {
    try {
      await api.removeFromHistory(mediaId);
      await reloadLogsAndMedia(mediaId);
    } catch (err) { console.error(err); }
  };

  const handleToggleWatchlist = async (mediaId) => {
    try {
      await api.toggleWatchlist(mediaId);
      await reloadLogsAndMedia(mediaId);
    } catch (err) { console.error(err); }
  };

  const rotatingPosters = useMemo(() => {
    if (!tmdbData?.images?.posters || tmdbData.images.posters.length === 0) {
      return tmdbData?.poster_path ? [{ url: tmdbData.poster_path, label: 'Офіційний' }] : [];
    }
    const posters = tmdbData.images.posters;
    const originalLang = tmdbData.original_language;
    const postersData = [];
    const addPosters = (list, label) => {
      list.forEach(p => postersData.push({ url: p.file_path, label }));
    };
    addPosters(posters.filter(p => p.iso_639_1 === 'uk'), 'Український');
    addPosters(posters.filter(p => p.iso_639_1 === 'en'), 'Англійський');
    addPosters(posters.filter(p => p.iso_639_1 === originalLang && p.iso_639_1 !== 'uk' && p.iso_639_1 !== 'en'), 'Оригінальний');
    addPosters(posters.filter(p => !p.iso_639_1 || p.iso_639_1 === 'none' || p.iso_639_1 === 'null'), 'Без тексту');
    
    const uniquePaths = [];
    const seen = new Set();
    for (let p of postersData) {
      if (!seen.has(p.url)) {
        seen.add(p.url);
        uniquePaths.push(p);
      }
    }
    if (uniquePaths.length === 0 && tmdbData.poster_path) {
      return [{ url: tmdbData.poster_path, label: 'Офіційний' }];
    }
    return uniquePaths;
  }, [tmdbData]);

  useEffect(() => { setCurrentPosterIndex(0); }, [rotatingPosters]);

  useEffect(() => {
    if (rotatingPosters.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPosterIndex(prev => (prev + 1) % rotatingPosters.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [rotatingPosters, currentPosterIndex]);

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!tmdbData) return <div style={styles.loadingWrapper}>Помилка завантаження TMDB</div>;

  const displayMedia = localMedia ? {
    ...localMedia,
    genres: (localMedia.genres && localMedia.genres.length > 0) ? localMedia.genres : tmdbData.genres,
  } : {
    id: tmdbData.tmdb_id,
    title: tmdbData.title,
    original_title: tmdbData.original_title,
    media_type: type,
    poster_path: tmdbData.poster_path,
    backdrop_path: tmdbData.backdrop_path,
    release_date: tmdbData.release_date,
    genres: tmdbData.genres,
    runtime: tmdbData.runtime
  };

  const tabs = [
    { id: 'main', label: 'Деталі' }
  ];

  if (type === 'series') {
    tabs.push({ id: 'seasons', label: 'Сезони' });
  }

  tabs.push(
    { id: 'actors', label: 'Актори' },
    { id: 'shots', label: 'Кадри' },
    { id: 'premiere', label: "Прем'єра" },
    { id: 'history', label: 'Історія' },
    { id: 'sources', label: 'Джерела' }
  );

  return (
    <div style={styles.container}>
      <MediaGlobalStyles dominantColor={dominantColor} />
      <style>{`
        .poster-hover-container { position: relative; width: 100%; aspect-ratio: 2 / 3; border-radius: 12px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.9); background-color: #111; }
        .poster-animated-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity 0.6s ease-in-out; }
        .poster-lang-badge { position: absolute; top: 10px; left: 10px; background: rgba(10, 10, 10, 0.75); color: #38bdf8; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.3); backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.3s ease; z-index: 5; }
        .poster-hover-container:hover .poster-lang-badge { opacity: 1; }
        .poster-arrow-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0, 0, 0, 0.65); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity 0.25s ease, background-color 0.2s ease, transform 0.2s ease; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 5; }
        .poster-hover-container:hover .poster-arrow-btn { opacity: 1; }
        .poster-arrow-btn:hover { background: rgba(56, 189, 248, 0.85); border-color: #38bdf8; transform: translateY(-50%) scale(1.1); }
        .poster-arrow-btn.left { left: 10px; }
        .poster-arrow-btn.right { right: 10px; }
        .poster-counter { position: absolute; bottom: 10px; right: 10px; background: rgba(10, 10, 10, 0.8); color: #f3f4f6; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15); opacity: 0; transition: opacity 0.25s ease; pointer-events: none; backdrop-filter: blur(4px); z-index: 5; }
        .poster-hover-container:hover .poster-counter { opacity: 1; }
      `}</style>
      
      {tmdbData.backdrop_path && (
        <>
          <div style={{ ...styles.backdropImage, backgroundImage: `url(https://image.tmdb.org/t/p/original${tmdbData.backdrop_path})` }} />
          <div style={{ 
            ...styles.backdropGradient, 
            background: `linear-gradient(to bottom, rgba(${dominantColor}, 0.5) 0%, rgba(10,10,10,0.95) 55%, rgba(10,10,10,1) 100%)` 
          }} />
        </>
      )}

      <div style={styles.topNav}>
        <button onClick={() => navigate(-1)} style={styles.navButton}><ArrowLeft size={16} /> Назад</button>
        <button onClick={() => navigate('/')} style={styles.navButtonIcon}><X size={18} /></button>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.leftColumn}>
          <div className="poster-hover-container">
            {rotatingPosters.map((poster, idx) => (
              <img 
                key={poster.url}
                src={poster.url ? `https://image.tmdb.org/t/p/w500${poster.url}` : 'https://via.placeholder.com/300x450?text=No+Poster'} 
                alt={tmdbData.title} 
                className="poster-animated-img"
                style={{ opacity: idx === currentPosterIndex ? 1 : 0, zIndex: idx === currentPosterIndex ? 2 : 1 }}
              />
            ))}
            
            {rotatingPosters[currentPosterIndex]?.label && (
              <div className="poster-lang-badge">{rotatingPosters[currentPosterIndex].label}</div>
            )}
            {rotatingPosters.length > 1 && (
              <>
                <button className="poster-arrow-btn left" onClick={(e) => { e.stopPropagation(); setCurrentPosterIndex(prev => (prev - 1 + rotatingPosters.length) % rotatingPosters.length); }}><ChevronLeft size={22} /></button>
                <button className="poster-arrow-btn right" onClick={(e) => { e.stopPropagation(); setCurrentPosterIndex(prev => (prev + 1) % rotatingPosters.length); }}><ChevronRight size={22} /></button>
                <div className="poster-counter">{currentPosterIndex + 1} / {rotatingPosters.length}</div>
              </>
            )}
          </div>
          
          <ActionButtons 
            type={type} 
            localMedia={localMedia} 
            ensureLocalMedia={ensureLocalMedia}
            handleUpdate={handleUpdate}
            handleAddToHistory={handleAddToHistory}
            handleRemoveFromHistory={handleRemoveFromHistory}
            handleToggleWatchlist={handleToggleWatchlist}
          />

          {localMedia?.last_watched_at && (
            <div style={{ marginTop: '12px', textAlign: 'center', backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>
                <CalendarCheck size={14} /> Переглянуто
              </div>
              <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '15px' }}>
                {new Date(localMedia.last_watched_at).toLocaleDateString('uk-UA')}
              </span>
            </div>
          )}
        </div>

        <div style={styles.rightColumn}>
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

          {activeTab === 'main' && <TabMain media={displayMedia} tmdbData={tmdbData} omdbData={omdbData} />}
          {activeTab === 'seasons' && <TabSeasons tmdbData={tmdbData} media={displayMedia} />}
          {activeTab === 'actors' && <TabActors tmdbData={tmdbData} />}
          {activeTab === 'shots' && <TabShots tmdbData={tmdbData} />}
          {activeTab === 'premiere' && <TabPremiere tmdbData={tmdbData} media={displayMedia} />}
          {activeTab === 'sources' && <TabSources tmdbData={tmdbData} />}
          
          {activeTab === 'history' && (
            <TabHistory 
              localMedia={localMedia}
              logs={logs} 
              onHistoryChange={() => reloadLogsAndMedia(localMedia?.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}