// frontend/src/pages/SeasonDetail.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import ActionButtons from '../components/ActionButtons';
import { getAverageColor } from '../utils';

export default function SeasonDetail() {
  const { type, tmdbId, seasonNumber } = useParams();
  const navigate = useNavigate();
  const [localMedia, setLocalMedia] = useState(null);
  const [seasonData, setSeasonData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState('10, 10, 10');
  const creatingRef = useRef(null);

  const reloadLocalMedia = async () => {
    try {
      const res = await fetch(`/api/media/tmdb/${tmdbId}`);
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
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        await reloadLocalMedia();
        const tmdbRes = await fetch(`/api/external/tmdb/details/series/${tmdbId}/season/${seasonNumber}`);
        const tmdbJson = await tmdbRes.json();
        if (tmdbJson.data) {
            setSeasonData(tmdbJson.data);
            if (tmdbJson.data.poster_path) {
                const url = `https://image.tmdb.org/t/p/w154${tmdbJson.data.poster_path}`;
                getAverageColor(url).then(color => setDominantColor(color));
            }
        }
      } catch (err) {
        console.error('Помилка завантаження сезону:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [type, tmdbId, seasonNumber]);

  const ensureLocalMedia = async () => {
    if (localMedia) return localMedia;
    if (creatingRef.current) return await creatingRef.current;
    creatingRef.current = (async () => {
      try {
        const seriesRes = await fetch(`/api/external/tmdb/details/series/${tmdbId}`);
        const seriesJson = await seriesRes.json();
        if (!seriesJson.data) return null;
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: seriesJson.data.title,
            original_title: seriesJson.data.original_title,
            media_type: 'series',
            status: 'planned',
            poster_path: seriesJson.data.poster_path,
            backdrop_path: seriesJson.data.backdrop_path,
            release_date: seriesJson.data.release_date,
            genres: seriesJson.data.genres || [],
            total_seasons: seriesJson.data.total_seasons || 0,
            total_episodes: seriesJson.data.total_episodes || 0,
            tmdb_id: seriesJson.data.tmdb_id,
            imdb_id: seriesJson.data.imdb_id
          })
        });
        
        if (res.ok) {
          const json = await res.json();
          setLocalMedia(json.data);
          return json.data;
        }
      } catch (err) {
        console.error(err);
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

  return (
    <div style={styles.container}>
      <MediaGlobalStyles dominantColor={dominantColor} />
      
      {/* Ефект світіння зверху (оскільки бакдропа немає) */}
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
              src={seasonData.poster_path ? `https://image.tmdb.org/t/p/w500${seasonData.poster_path}` : 'https://via.placeholder.com/300x450?text=Немає+постера'}
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
            <h2 style={styles.originalTitle}>{localMedia ? localMedia.title : 'Невідомий серіал'}</h2>
          </div>

          {seasonData.overview && (
            <div style={styles.sectionBlock}>
              <p style={styles.descriptionText}>{seasonData.overview}</p>
            </div>
          )}

          {seasonData.episodes && seasonData.episodes.length > 0 && (
            <div style={styles.sectionBlock}>
              <h3 style={styles.sectionTitle}>Епізоди:</h3>
              <div className="custom-scroll" style={styles.horizontalScroll}>
                {seasonData.episodes.map(ep => (
                  <div
                    key={ep.episode_number}
                    style={{...styles.personCard, width: '200px', cursor: 'pointer'}}
                    onClick={() => navigate(`/media/${type}/${tmdbId}/season/${seasonNumber}/episode/${ep.episode_number}`)}
                  >
                    <img
                      src={ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : 'https://via.placeholder.com/300x170?text=Без+кадру'}
                      style={{...styles.personPhoto, height: '112px'}}
                      alt={ep.name}
                    />
                    <div style={styles.personName}>{ep.episode_number}. {ep.name}</div>
                    <div style={styles.personRole}>{ep.air_date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}