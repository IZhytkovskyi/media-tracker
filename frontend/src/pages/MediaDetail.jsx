import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, CalendarCheck } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import { TabMain, TabActors, TabShots, TabPremiere, TabSources, TabHistory } from '../components/MediaTabs';
import ActionButtons from '../components/ActionButtons';

export default function MediaDetail() {
  const { type, tmdbId } = useParams();
  const navigate = useNavigate();
  
  const [localMedia, setLocalMedia] = useState(null);
  const [tmdbData, setTmdbData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('main');

  // Ref для захисту від повторних викликів при авто-створенні (Race condition protection)
  const creatingRef = useRef(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [localRes, tmdbRes] = await Promise.all([
          fetch(`/api/media/tmdb/${tmdbId}`),
          fetch(`/api/external/tmdb/details/${type}/${tmdbId}`)
        ]);

        if (localRes.ok) {
          const localJson = await localRes.json();
          if (localJson.data) {
            setLocalMedia(localJson.data);
            const logsRes = await fetch(`/api/media/${localJson.data.id}/logs`);
            if (logsRes.ok) {
              const logsJson = await logsRes.json();
              setLogs(logsJson.data || []);
            }
          }
        }

        if (tmdbRes.ok) {
          const tmdbJson = await tmdbRes.json();
          if (tmdbJson.data) setTmdbData(tmdbJson.data);
        }
      } catch (err) {
        console.error('Помилка завантаження:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [type, tmdbId]);

  // ГАРАНТУВАННЯ ЛОКАЛЬНОГО ЗАПИСУ:
  // Якщо медіа ще немає в БД, ми його автоматично створюємо перед будь-якою дією.
  const ensureLocalMedia = async () => {
    if (localMedia) return localMedia; // Вже є в базі

    // Якщо процес створення вже йде, чекаємо його завершення (щоб не створити дубль)
    if (creatingRef.current) {
      return await creatingRef.current;
    }

    // Створюємо Promise процесу збереження
    creatingRef.current = (async () => {
      try {
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: tmdbData.title,
            original_title: tmdbData.original_title,
            media_type: type,
            status: 'planned', // Тимчасовий статус, який одразу перезапишеться
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
          const newLocalRes = await fetch(`/api/media/${json.id}`);
          const newLocalJson = await newLocalRes.json();
          if (newLocalJson.data) {
            setLocalMedia(newLocalJson.data);
            return newLocalJson.data; // Повертаємо щойно створений об'єкт
          }
        }
      } catch (err) {
        console.error('Помилка авто-додавання в колекцію:', err);
      } finally {
        creatingRef.current = null; // Звільняємо блокування
      }
      return null;
    })();

    return await creatingRef.current;
  };

  // --- CRUD ОПЕРАЦІЇ ---
  // Усі функції тепер приймають mediaId явно, щоб не покладатися на затримку React State
  
  const handleUpdate = async (mediaId, updates) => {
    setLocalMedia(prev => ({ ...prev, ...updates })); // Оптимістичне оновлення UI
    try {
      await fetch(`/api/media/${mediaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (err) { console.error('Помилка оновлення:', err); }
  };

  const reloadLogs = async (mediaId) => {
    const res = await fetch(`/api/media/${mediaId}/logs`);
    if (res.ok) {
      const json = await res.json();
      setLogs(json.data || []);
    }
  };

  const handleLogCreate = async (mediaId, logData) => {
    try {
      await fetch(`/api/media/${mediaId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      await reloadLogs(mediaId);
    } catch (err) { console.error('Помилка створення логу:', err); }
  };

  const handleLogUpdate = async (mediaId, logId, logData) => {
    try {
      await fetch(`/api/media/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      await reloadLogs(mediaId);
    } catch (err) { console.error('Помилка оновлення логу:', err); }
  };

  const handleLogDelete = async (logId) => {
    if (!confirm('Видалити цей лог перегляду?')) return;
    try {
      await fetch(`/api/media/logs/${logId}`, { method: 'DELETE' });
      await reloadLogs(localMedia.id);
    } catch (err) { console.error('Помилка видалення логу:', err); }
  };

  // Обгортки для ручного додавання історії з вкладки TabHistory
  const onHistoryCreate = async (logData) => {
    const media = await ensureLocalMedia();
    if (media) await handleLogCreate(media.id, logData);
  };
  const onHistoryUpdate = async (logId, logData) => {
    if (localMedia) await handleLogUpdate(localMedia.id, logId, logData);
  };

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!tmdbData) return <div style={styles.loadingWrapper}>Дані не знайдено на TMDB</div>;

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

  const mainTabName = type === 'series' ? 'Серіал' : 'Фільм';
  
  const tabs = [
    { id: 'main', label: mainTabName },
    { id: 'actors', label: 'Актори' },
    { id: 'shots', label: 'Кадри' },
    { id: 'premiere', label: "Прем'єри" },
    { id: 'history', label: 'Історія', hidden: !localMedia }, // Історія з'явиться, щойно додасться медіа
    { id: 'sources', label: 'Джерела' }
  ].filter(tab => !tab.hidden);

  const lastLog = logs && logs.length > 0 ? logs[0] : null;

  return (
    <div style={styles.container}>
      <MediaGlobalStyles /> 
      
      {tmdbData.backdrop_path && (
        <>
          <div style={{ ...styles.backdropImage, backgroundImage: `url(${tmdbData.backdrop_path})` }} />
          <div style={styles.backdropGradient} />
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
              src={tmdbData.poster_path || 'https://via.placeholder.com/300x450?text=Немає+постера'} 
              alt={tmdbData.title} 
              style={styles.poster} 
            />
          </div>
          
          <ActionButtons 
            type={type} 
            localMedia={localMedia} 
            logs={logs}
            ensureLocalMedia={ensureLocalMedia} // Передаємо функцію авто-додавання
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
                Останнє переглянуто: <span style={{ color: '#f8fafc' }}>
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