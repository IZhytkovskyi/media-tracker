import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import ActionButtons from '../components/ActionButtons';

export default function SeasonDetail() {
  const { id, seasonNumber } = useParams();
  const navigate = useNavigate();
  const [media, setMedia] = useState(null); 
  const [seasonData, setSeasonData] = useState(null);
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
            const tmdbRes = await fetch(`/api/external/tmdb/details/series/${tmdbId}/season/${seasonNumber}`);
            const tmdbJson = await tmdbRes.json();
            if (tmdbJson.data) setSeasonData(tmdbJson.data);
          }
        }
      } catch (err) {
        console.error('Помилка завантаження сезону:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id, seasonNumber]);

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!seasonData) return <div style={styles.loadingWrapper}>Дані не знайдено</div>;

  return (
    <div style={styles.container}>
      <MediaGlobalStyles />
      
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
          {/* Кнопки для сезону */}
          <ActionButtons type="season" media={media} />
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.headerBlock}>
            <h1 style={styles.mainTitle}>{seasonData.name}</h1>
            <h2 style={styles.originalTitle}>{media.title}</h2>
          </div>
          
          {seasonData.overview && (
            <div style={styles.sectionBlock}>
              <p style={styles.descriptionText}>{seasonData.overview}</p>
            </div>
          )}

          {/* Список Серій */}
          {seasonData.episodes && seasonData.episodes.length > 0 && (
            <div style={styles.sectionBlock}>
              <h3 style={styles.sectionTitle}>Серії:</h3>
              <div className="custom-scroll" style={styles.horizontalScroll}>
                {seasonData.episodes.map(ep => (
                  <div 
                    key={ep.episode_number} 
                    style={{...styles.personCard, width: '200px', cursor: 'pointer'}} 
                    onClick={() => navigate(`/media/${id}/season/${seasonNumber}/episode/${ep.episode_number}`)}
                  >
                    <img 
                      src={ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : 'https://via.placeholder.com/300x170?text=Немає+кадру'} 
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