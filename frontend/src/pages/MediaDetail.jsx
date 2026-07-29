// frontend/src/pages/MediaDetail.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Star, Check, Plus } from 'lucide-react';
import { MediaGlobalStyles, styles } from '../styles/mediaDetailStyles';
import { TabMain, TabActors, TabShots, TabPremiere, TabSources } from '../components/MediaTabs';

export default function MediaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [media, setMedia] = useState(null);
  const [tmdbData, setTmdbData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Активна головна вкладка
  const [activeTab, setActiveTab] = useState('main');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/media/${id}`);
        const json = await res.json();
        
        if (json.data) {
          setMedia(json.data);
          
          // Завантаження розширених даних з TMDB
          if (json.data.tmdb_id) {
            const tmdbRes = await fetch(`/api/external/tmdb/details/${json.data.media_type}/${json.data.tmdb_id}`);
            const tmdbJson = await tmdbRes.json();
            if (tmdbJson.data) {
              setTmdbData(tmdbJson.data);
            }
          }
        }
      } catch (err) {
        console.error('Помилка завантаження деталей:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const handleUpdate = async (updates) => {
    // Оновлюємо UI миттєво (Optimistic Update)
    setMedia(prev => ({ ...prev, ...updates }));
    try {
      await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error('Помилка оновлення:', err);
    }
  };

  if (loading) return <div style={styles.loadingWrapper}>Завантаження...</div>;
  if (!media) return <div style={styles.loadingWrapper}>Фільм не знайдено</div>;

  const mainTabName = media.media_type === 'series' ? 'Серіал' : 'Фільм';
  
  const tabs = [
    { id: 'main', label: mainTabName },
    { id: 'actors', label: 'Актори та Автори' },
    { id: 'shots', label: 'Кадри' },
    { id: 'premiere', label: "Прем'єра" },
    { id: 'history', label: 'Історія переглядів' },
    { id: 'sources', label: 'Джерела' }
  ];

  return (
    <div style={styles.container}>
      <MediaGlobalStyles /> {/* Глобальні CSS класи сторінки */}

      {/* Фонове зображення (Backdrop) */}
      {media.backdrop_path && (
        <>
          <div style={{ ...styles.backdropImage, backgroundImage: `url(${media.backdrop_path})` }} />
          <div style={styles.backdropGradient} />
        </>
      )}

      {/* Верхня панель навігації */}
      <div style={styles.topNav}>
        <button onClick={() => navigate(-1)} style={styles.navButton}>
          <ArrowLeft size={16} /> НАЗАД
        </button>
        <button onClick={() => navigate(-1)} style={styles.navButtonIcon}>
          <X size={18} />
        </button>
      </div>

      <div style={styles.mainContent}>
        
        {/* ЛІВА КОЛОНКА (Постер + Дії) */}
        <div style={styles.leftColumn}>
          <div style={styles.posterWrapper}>
            <img 
              src={media.poster_path || 'https://via.placeholder.com/300x450?text=Немає+постера'} 
              alt={media.title} 
              style={styles.poster} 
            />
          </div>

          <div style={styles.actionPanel}>
            <button style={styles.actionItem} onClick={() => {}}>
              <div style={{ ...styles.actionIconCircle, borderColor: media.rating ? '#2ecc71' : '#444' }}>
                <Star size={20} color={media.rating ? '#2ecc71' : '#a3a3a3'} fill={media.rating ? '#2ecc71' : 'none'} />
              </div>
              <span style={{ ...styles.actionLabel, color: media.rating ? '#2ecc71' : '#a3a3a3' }}>
                {media.rating || 'Оцінити'}
              </span>
            </button>
            <button 
              style={styles.actionItem} 
              onClick={() => handleUpdate({ status: media.status === 'completed' ? 'planned' : 'completed' })}
            >
              <div style={{ ...styles.actionIconCircle, borderColor: media.status === 'completed' ? '#2ecc71' : '#444' }}>
                <Check size={20} color={media.status === 'completed' ? '#2ecc71' : '#a3a3a3'} />
              </div>
              <span style={{ ...styles.actionLabel, color: media.status === 'completed' ? '#2ecc71' : '#a3a3a3' }}>
                Переглянуто
              </span>
            </button>
            <button style={styles.actionItem}>
              <div style={styles.actionIconCircle}>
                <Plus size={20} color="#a3a3a3" />
              </div>
              <span style={styles.actionLabel}>Списки</span>
            </button>
          </div>
        </div>

        {/* ПРАВА КОЛОНКА (Інформація та вкладки) */}
        <div style={styles.rightColumn}>
          
          {/* Головні Вкладки */}
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

          {/* Вміст обраної вкладки */}
          {activeTab === 'main' && <TabMain media={media} tmdbData={tmdbData} />}
          {activeTab === 'actors' && <TabActors tmdbData={tmdbData} />}
          {activeTab === 'shots' && <TabShots tmdbData={tmdbData} />}
          {activeTab === 'premiere' && <TabPremiere tmdbData={tmdbData} media={media} />}
          {activeTab === 'sources' && <TabSources tmdbData={tmdbData} />}
          {activeTab === 'history' && <p style={styles.emptyText}>Історія переглядів у розробці.</p>}
          
        </div>
      </div>
    </div>
  );
}