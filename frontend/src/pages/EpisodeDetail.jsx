// frontend/src/pages/EpisodeDetail.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import ActionButtons from '../components/ActionButtons';
import { TabMainEpisode, TabActors, TabShots, TabHistory, TabSources } from '../components/MediaTabs';
import { getAverageColor } from '../utils';
import { api } from '../utils/api';

export default function EpisodeDetail() {
  const { type, tmdbId, seasonNumber, episodeNumber } = useParams();
  const navigate = useNavigate();
  const [localMedia, setLocalMedia] = useState(null);
  const [episodeData, setEpisodeData] = useState(null);
  const [seriesData, setSeriesData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState('10, 10, 10');
  const [activeTab, setActiveTab] = useState('main');

  const externalId = `episode_${episodeData?.id || 'temp'}`;
  const creatingRef = useRef(null);

  const reloadLocalMedia = async () => {
    if (!episodeData) return;
    try {
      const res = await api.getMediaByExternalId(externalId);
      if (res.data) {
        setLocalMedia(res.data);
        const historyRes = await api.getHistory(res.data.id);
        setLogs(historyRes.data || []);
      }
    } catch (err) {
      setLogs([]);
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [episodeRes, seriesRes] = await Promise.all([
            fetch(`/api/external/tmdb/details/series/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`),
            fetch(`/api/external/tmdb/details/series/${tmdbId}`)
        ]);
        
        const episodeJson = await episodeRes.json();
        const seriesJson = await seriesRes.json();
        
        if (episodeJson.data) {
            setEpisodeData(episodeJson.data);
            if (episodeJson.data.still_path) {
                const url = `https://image.tmdb.org/t/p/w300${episodeJson.data.still_path}`;
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
  }, [type, tmdbId, seasonNumber, episodeNumber]);

  useEffect(() => {
      if (episodeData) reloadLocalMedia();
  }, [episodeData]);

  const ensureLocalMedia = async () => {
    if (localMedia) return localMedia;
    if (creatingRef.current) return await creatingRef.current;
    
    creatingRef.current = (async () => {
      try {
        if (!seriesData || !episodeData) return null;
        
        // 1. Спочатку перевіряємо/створюємо серіал
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
                release_date: seriesData.first_air_date || seriesData.release_date,
                genres: seriesData.genres || []
            });
            seriesMediaId = createSeriesRes.data.id;
        }

        if (!seriesMediaId) return null;

        // 2. Потім сезон
        let seasonMediaId = null;
        const sRes = await fetch(`/api/external/tmdb/details/series/${tmdbId}/season/${seasonNumber}`);
        let epCount = 1;
        let realSeasonId = `tv_${tmdbId}_s${seasonNumber}`;
        let sDataObj = null;
        
        if (sRes.ok) {
            const sData = await sRes.json();
            sDataObj = sData.data;
            epCount = sDataObj?.episodes?.length || 1;
            realSeasonId = sDataObj?.id || realSeasonId;
        }
        
        const seasonExtId = `season_${realSeasonId}`;
        try {
            const seasonRes = await api.getMediaByExternalId(seasonExtId);
            seasonMediaId = seasonRes.data.id;
        } catch(e) {
            const createSeasonRes = await api.createMedia({
                title: `${seriesData.title} - Сезон ${seasonNumber}`,
                original_title: sDataObj?.name || `Season ${seasonNumber}`,
                media_type: 'season',
                external_id: seasonExtId,
                parent_id: seriesMediaId,
                season: parseInt(seasonNumber, 10),
                total_episodes: epCount,
                tmdb_id: realSeasonId,
                poster_path: sDataObj?.poster_path || seriesData.poster_path,
                release_date: sDataObj?.air_date || null
            });
            seasonMediaId = createSeasonRes.data.id;
        }

        // 3. І нарешті сам епізод
        try {
            const res = await api.createMedia({
                title: `${seriesData.title} - S${seasonNumber}E${episodeNumber}`,
                original_title: episodeData.name,
                media_type: 'episode',
                external_id: externalId,
                parent_id: seasonMediaId,
                poster_path: episodeData.still_path,
                backdrop_path: episodeData.still_path,
                release_date: episodeData.air_date,
                season: parseInt(seasonNumber, 10),
                episode: parseInt(episodeNumber, 10),
                tmdb_id: episodeData.id
            });
            setLocalMedia(res.data);
            return res.data;
        } catch(e) {
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

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!episodeData) return <div style={styles.loadingWrapper}>Епізод не знайдено</div>;

  const displaySeriesTitle = seriesData ? seriesData.title : 'Завантаження...';

  const tabs = [
    { id: 'main', label: 'Огляд' },
    { id: 'actors', label: 'Актори' },
    { id: 'shots', label: 'Кадри' },
    { id: 'history', label: 'Історія' },
    { id: 'sources', label: 'Джерела' }
  ];

  return (
    <div style={styles.container}>
      <MediaGlobalStyles dominantColor={dominantColor} />
      
      {episodeData.still_path && (
          <>
            <div style={{ ...styles.backdropImage, backgroundImage: `url(https://image.tmdb.org/t/p/original${episodeData.still_path})` }} />
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
        <div style={{...styles.leftColumn, width: '350px'}}>
          <div style={styles.posterWrapper}>
            <img 
              src={episodeData.still_path ? `https://image.tmdb.org/t/p/w500${episodeData.still_path}` : 'https://via.placeholder.com/500x281?text=No+Image'} 
              alt={episodeData.name} 
              style={{...styles.poster, aspectRatio: '16/9', objectFit: 'cover'}} 
            />
          </div>
          
          <ActionButtons 
               type="episode"
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
            <h1 style={styles.mainTitle}>Епізод {episodeData.episode_number}: {episodeData.name}</h1>
            
            <h2 style={styles.originalTitle}>
                <span onClick={() => navigate(`/media/series/${tmdbId}`)} className="series-link">
                    {displaySeriesTitle}
                </span>
                {' '}-{' '}
                <span onClick={() => navigate(`/media/series/${tmdbId}/season/${seasonNumber}`)} className="series-link">
                    Сезон {seasonNumber}
                </span>
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

          {activeTab === 'main' && <TabMainEpisode tmdbData={episodeData} />}
          {activeTab === 'actors' && <TabActors tmdbData={episodeData} />}
          {activeTab === 'shots' && <TabShots tmdbData={episodeData} />}
          {activeTab === 'sources' && <TabSources tmdbData={episodeData} />}
          
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