import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import ActionButtons from '../components/ActionButtons';

export default function EpisodeDetail() {
  const { id, seasonNumber, episodeNumber } = useParams();
  const navigate = useNavigate();
  const [media, setMedia] = useState(null);
  const [episodeData, setEpisodeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const resMedia = await fetch(`/api/media/${id}`);
        const jsonMedia = await resMedia.json();
        
        if (jsonMedia.data) {
          setMedia(jsonMedia.data);
          const tmdbId = jsonMedia.data.tmdb_id;
          
          if (tmdbId) {
            const tmdbRes = await fetch(`/api/external/tmdb/details/series/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`);
            const tmdbJson = await tmdbRes.json();
            if (tmdbJson.data) setEpisodeData(tmdbJson.data);
          }
        }
      } catch (err) {
        console.error('Помилка завантаження:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id, seasonNumber, episodeNumber]);

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!episodeData) return <div style={styles.loadingWrapper}>Епізод не знайдено</div>;

  return (
    <div style={styles.container}>
      <MediaGlobalStyles />
      
      {episodeData.still_path && (
          <>
            <div style={{ ...styles.backdropImage, backgroundImage: `url(https://image.tmdb.org/t/p/original${episodeData.still_path})` }} />
            <div style={styles.backdropGradient} />
          </>
      )}

      <div style={styles.topNav}>
        <button onClick={() => navigate(-1)} style={styles.navButton}><ArrowLeft size={16} /> Назад</button>
        <button onClick={() => navigate('/')} style={styles.navButtonIcon}><X size={18} /></button>
      </div>

      <div style={styles.mainContent}>
        {/* Ліва колонка */}
        <div style={{...styles.leftColumn, width: '350px'}}>
          <div style={styles.posterWrapper}>
            <img 
              src={episodeData.still_path ? `https://image.tmdb.org/t/p/w500${episodeData.still_path}` : 'https://via.placeholder.com/500x281?text=Немає+кадру'} 
              alt={episodeData.name} 
              style={{...styles.poster, aspectRatio: '16/9', objectFit: 'cover'}} 
            />
          </div>
          {/* Панель дій */}
          <ActionButtons type="episode" media={media} />
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.headerBlock}>
            <h1 style={styles.mainTitle}>Епізод {episodeData.episode_number}: {episodeData.name}</h1>
            <h2 style={styles.originalTitle}>{media.title} - Сезон {seasonNumber}</h2>
          </div>
          
          <div style={styles.detailsBox}>
             <div style={styles.detailRow}>
               <span style={styles.detailLabel}>Дата виходу:</span>
               <span style={styles.detailValue}>{episodeData.air_date || '-'}</span>
             </div>
             <div style={styles.detailRow}>
               <span style={styles.detailLabel}>Тривалість:</span>
               <span style={styles.detailValue}>{episodeData.runtime ? `${episodeData.runtime} хв.` : '-'}</span>
             </div>
          </div>

          {episodeData.overview && (
            <div style={styles.sectionBlock}>
              <p style={styles.descriptionText}>{episodeData.overview}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}