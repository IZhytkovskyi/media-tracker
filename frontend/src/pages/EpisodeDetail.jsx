import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import ActionButtons from '../components/ActionButtons';
import { TabActors, TabShots, TabHistory } from '../components/MediaTabs';
import { getAverageColor } from '../utils';

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
        }
      }
    } catch (err) {}
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
        
        // 1. Перевіряємо/створюємо серіал
        let seriesMediaId = null;
        const seriesRes = await fetch(`/api/media/external/tv_${tmdbId}`);
        if (!seriesRes.ok) {
            const res = await fetch('/api/media', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: seriesData.title, media_type: 'series', 
                    external_id: `tv_${tmdbId}`, tmdb_id: seriesData.tmdb_id,
                    total_seasons: seriesData.total_seasons || seriesData.number_of_seasons || 1
                })
            });
            seriesMediaId = (await res.json()).data.id;
        } else {
            seriesMediaId = (await seriesRes.json()).data.id;
        }

        // 2. Отримуємо правильний TMDB ID сезону і перевіряємо/створюємо сезон
        let seasonMediaId = null;
        const sRes = await fetch(`/api/external/tmdb/details/series/${tmdbId}/season/${seasonNumber}`);
        let epCount = 1;
        let realSeasonId = 'temp';
        if (sRes.ok) {
            const sData = await sRes.json();
            epCount = sData.data?.episodes?.length || 1;
            realSeasonId = sData.data?.id || `tv_${tmdbId}_s${seasonNumber}`;
        }
        
        const seasonExtId = `season_${realSeasonId}`;
        const seasonRes = await fetch(`/api/media/external/${seasonExtId}`);
        if (!seasonRes.ok) {
            const res = await fetch('/api/media', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                      title: `${seriesData.title} - Сезон ${seasonNumber}`,
                      media_type: 'season', external_id: seasonExtId,
                      parent_id: seriesMediaId, season: parseInt(seasonNumber, 10),
                      total_episodes: epCount,
                      tmdb_id: realSeasonId
                  })
            });
            seasonMediaId = (await res.json()).data.id;
        } else {
            seasonMediaId = (await seasonRes.json()).data.id;
        }

        // 3. Створюємо серію (обов'язково парсимо номери в числа)
        const res = await fetch('/api/media', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
      const res = await fetch(`/api/media/${mediaId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      const json = await res.json().catch(() => null);
      if (json?.warning) {
        window.alert(`Перегляд збережено, але не все вдалось позначити автоматично:\n${json.warning}`);
      }
      await reloadLocalMedia();
    } catch (err) {}
  };

  const handleLogUpdate = async (mediaId, logId, logData) => {
    try {
      const res = await fetch(`/api/media/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      const json = await res.json().catch(() => null);
      if (json?.warning) {
        window.alert(`Перегляд оновлено, але не все вдалось позначити автоматично:\n${json.warning}`);
      }
      await reloadLocalMedia();
    } catch (err) {}
  };

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!episodeData) return <div style={styles.loadingWrapper}>Дані не знайдено</div>;

  const displaySeriesTitle = seriesData ? seriesData.title : 'Завантаження...';

  const tabs = [
    { id: 'main', label: 'Інфо' },
    { id: 'actors', label: 'Актори' },
    { id: 'shots', label: 'Кадри' },
    { id: 'history', label: 'Історія' }
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
            logs={logs}
            ensureLocalMedia={ensureLocalMedia}
            handleUpdate={handleUpdate}
            handleLogCreate={handleLogCreate}
            handleLogUpdate={handleLogUpdate}
          />
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.headerBlock}>
            <h1 style={styles.mainTitle}>Серія {episodeData.episode_number}: {episodeData.name}</h1>
            
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
          
          {activeTab === 'main' && (
            <>
              <div style={styles.detailsBox}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Прем'єра:</span>
                  <span style={styles.detailValue}>
                      {episodeData.air_date ? new Date(episodeData.air_date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Тривалість:</span>
                  <span style={styles.detailValue}>{episodeData.runtime ? `${episodeData.runtime} хв.` : '-'}</span>
                </div>
                {episodeData.vote_average > 0 && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Оцінка TMDB:</span>
                      <span style={styles.detailValue}>{episodeData.vote_average.toFixed(1)} / 10</span>
                    </div>
                )}
              </div>

              {episodeData.overview && (
                <div style={styles.sectionBlock}>
                  <p style={styles.descriptionText}>{episodeData.overview}</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'actors' && <TabActors tmdbData={episodeData} />}
          {activeTab === 'shots' && <TabShots tmdbData={episodeData} />}
          {activeTab === 'history' && (
            <TabHistory
              logs={logs}
              viewType="episode"
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