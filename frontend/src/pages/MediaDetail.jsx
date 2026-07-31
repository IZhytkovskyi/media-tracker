import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, CalendarCheck } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import { TabMain, TabActors, TabShots, TabPremiere, TabSources, TabHistory } from '../components/MediaTabs';
import ActionButtons from '../components/ActionButtons';
import { getAverageColor } from '../utils'; // Імпорт нашої функції

export default function MediaDetail() {
  const { type, tmdbId } = useParams();
  const navigate = useNavigate();
  const [localMedia, setLocalMedia] = useState(null);
  const [tmdbData, setTmdbData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('main');
  const [dominantColor, setDominantColor] = useState('10, 10, 10'); // Стейт для кольору
  const creatingRef = useRef(null);

  const reloadLogsAndMedia = async (mediaId) => {
    if (!mediaId) return;
    try {
      const [logsRes, mediaRes] = await Promise.all([
        fetch(`/api/media/${mediaId}/logs`),
        fetch(`/api/media/${mediaId}`)
      ]);
      if (logsRes.ok) {
        const logsJson = await logsRes.json();
        setLogs(logsJson.data || []);
      }
      if (mediaRes.ok) {
        const mediaJson = await mediaRes.json();
        if (mediaJson.data) setLocalMedia(mediaJson.data);
      }
    } catch (err) {
      console.error('Помилка оновлення логів/медіа:', err);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [localRes, tmdbRes] = await Promise.all([
          fetch(`/api/media/tmdb/${tmdbId}`),
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
            
            // Витягуємо колір із зменшеної версії постера для оптимізації
            if (tmdbJson.data.poster_path) {
              const url = `https://image.tmdb.org/t/p/w154${tmdbJson.data.poster_path}`;
              getAverageColor(url).then(color => setDominantColor(color));
            }
          }
        }
        
        if (localMediaData) {
          await reloadLogsAndMedia(localMediaData.id);
        }
      } catch (err) {
        console.error('Помилка завантаження даних:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [type, tmdbId]);

  const ensureLocalMedia = async () => {
    if (localMedia) return localMedia;
    if (creatingRef.current) {
      return await creatingRef.current;
    }
    creatingRef.current = (async () => {
      try {
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: tmdbData.title,
            original_title: tmdbData.original_title,
            media_type: type,
            status: 'planned',
            poster_path: tmdbData.poster_path,
            backdrop_path: tmdbData.backdrop_path,
            release_date: tmdbData.release_date,
            genres: tmdbData.genres || [],
            total_seasons: tmdbData.total_seasons || 0,
            total_episodes: tmdbData.total_episodes || 0,
            tmdb_id: tmdbData.tmdb_id,
            imdb_id: tmdbData.imdb_id
          })
        });
        if (res.ok) {
          const json = await res.json();
          const createdItem = json.data;
          setLocalMedia(createdItem);
          return createdItem;
        }
      } catch (err) {
        console.error('Помилка створення медіа:', err);
      } finally {
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
      if (res.ok) {
        await reloadLogsAndMedia(mediaId);
      }
    } catch (err) {
      console.error('Помилка оновлення:', err);
    }
  };

  const handleLogCreate = async (mediaId, logData) => {
    try {
      const res = await fetch(`/api/media/${mediaId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      if (res.ok) {
        await reloadLogsAndMedia(mediaId);
      }
    } catch (err) {
      console.error('Помилка створення логу:', err);
    }
  };

  const handleLogUpdate = async (mediaId, logId, logData) => {
    try {
      const res = await fetch(`/api/media/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      if (res.ok) {
        await reloadLogsAndMedia(mediaId);
      }
    } catch (err) {
      console.error('Помилка оновлення логу:', err);
    }
  };

  const handleLogDelete = async (logId) => {
    if (!confirm('Ви впевнені, що хочете видалити цей запис?')) return;
    try {
      const res = await fetch(`/api/media/logs/${logId}`, { method: 'DELETE' });
      if (res.ok && localMedia) {
        await reloadLogsAndMedia(localMedia.id);
      }
    } catch (err) {
      console.error('Помилка видалення логу:', err);
    }
  };

  const onHistoryCreate = async (logData) => {
    const media = await ensureLocalMedia();
    if (media) await handleLogCreate(media.id, logData);
  };

  const onHistoryUpdate = async (logId, logData) => {
    if (localMedia) await handleLogUpdate(localMedia.id, logId, logData);
  };

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!tmdbData) return <div style={styles.loadingWrapper}>Не вдалося знайти дані в TMDB</div>;

  const displayMedia = localMedia || {
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

  const mainTabName = type === 'series' ? 'Про серіал' : 'Про фільм';

  const tabs = [
    { id: 'main', label: mainTabName },
    { id: 'actors', label: 'Актори' },
    { id: 'shots', label: 'Кадри' },
    { id: 'premiere', label: "Прем'єри" },
    { id: 'history', label: 'Історія переглядів' },
    { id: 'sources', label: 'Джерела' }
  ];

  const lastLog = logs && logs.length > 0 ? logs[0] : null;

  return (
    <div style={styles.container}>
      <MediaGlobalStyles dominantColor={dominantColor} />
      
      {tmdbData.backdrop_path && (
        <>
          <div style={{ ...styles.backdropImage, backgroundImage: `url(${tmdbData.backdrop_path})` }} />
          {/* Використовуємо адаптивний колір для градієнту фону */}
          <div style={{ 
            ...styles.backdropGradient, 
            background: `linear-gradient(to bottom, rgba(${dominantColor}, 0.5) 0%, rgba(10,10,10,0.95) 55%, rgba(10,10,10,1) 100%)` 
          }} />
        </>
      )}

      <div style={styles.topNav}>
        <button onClick={() => navigate(-1)} style={styles.navButton}>
          <ArrowLeft size={16} /> Назад
        </button>
        <button onClick={() => navigate('/')} style={styles.navButtonIcon}>
          <X size={18} />
        </button>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.leftColumn}>
          <div style={styles.posterWrapper}>
            <img
              src={tmdbData.poster_path || 'https://via.placeholder.com/300x450?text=No+Poster'}
              alt={tmdbData.title}
              style={styles.poster}
            />
          </div>
          <ActionButtons
            type={type}
            localMedia={localMedia}
            logs={logs}
            ensureLocalMedia={ensureLocalMedia}
            handleUpdate={handleUpdate}
            handleLogCreate={handleLogCreate}
            handleLogUpdate={handleLogUpdate}
          />
          {lastLog && (
            <div style={{
              marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', backgroundColor: 'rgba(30, 41, 59, 0.6)', padding: '10px',
              borderRadius: '8px', border: '1px solid #334155'
            }}>
              <CalendarCheck size={16} color="#94a3b8" />
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                Останній перегляд: <span style={{ color: '#f8fafc' }}>
                  {lastLog.watch_date ? new Date(lastLog.watch_date).toLocaleDateString('uk-UA') : 'Невідомо'}
                </span>
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

          {activeTab === 'main' && <TabMain media={displayMedia} tmdbData={tmdbData} />}
          {activeTab === 'actors' && <TabActors tmdbData={tmdbData} />}
          {activeTab === 'shots' && <TabShots tmdbData={tmdbData} />}
          {activeTab === 'premiere' && <TabPremiere tmdbData={tmdbData} media={displayMedia} />}
          {activeTab === 'sources' && <TabSources tmdbData={tmdbData} />}
          {activeTab === 'history' && (
            <TabHistory
              logs={logs}
              onDelete={handleLogDelete}
              onCreate={onHistoryCreate}
              onUpdate={onHistoryUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
}