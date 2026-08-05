// frontend/src/components/MediaCard.jsx
import React from 'react';
import { Film, Tv, CalendarClock, CheckCircle, Play } from 'lucide-react';

export default function MediaCard({ 
  item, 
  variant = 'poster', // 'poster' | 'backdrop'
  onCardClick, 
  onMarkNextEpisode 
}) {
  const isBackdrop = variant === 'backdrop';

  // Форматування дат
  const exactDate = item.release_date ? new Date(item.release_date).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const year = item.release_date ? item.release_date.split('-')[0] : '';

  // Зображення
  const posterUrl = item.poster_path ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`) : null;
  const backdropUrl = item.backdrop_path ? (item.backdrop_path.startsWith('http') ? item.backdrop_path : `https://image.tmdb.org/t/p/w780${item.backdrop_path}`) : posterUrl;
  
  // Вибір зображення залежно від варіанту
  const imageUrl = isBackdrop ? backdropUrl : posterUrl;

  // Логіка для "Up Next" (наступний епізод)
  let upNextSubtitle = '';
  let progressPercent = 0;
  
  if (isBackdrop && item.media_type === 'series') {
    // Якщо бекенд передає дані про прогрес
    if (item.nextEpisode) {
      upNextSubtitle = `S${item.nextEpisode.season.toString().padStart(2, '0')}E${item.nextEpisode.episode.toString().padStart(2, '0')} - ${item.nextEpisode.title || 'Епізод'}`;
    } else {
      upNextSubtitle = 'Продовжити перегляд';
    }

    if (item.progress && item.progress.total > 0) {
      progressPercent = Math.min(100, Math.max(0, (item.progress.watched / item.progress.total) * 100));
    }
  }

  // Обробник швидкого кліку "Переглянуто"
  const handleQuickMark = (e) => {
    e.stopPropagation();
    if (onMarkNextEpisode) {
      onMarkNextEpisode(item.id);
    }
  };

  if (isBackdrop) {
    return (
      <div className="mc-backdrop-card" onClick={() => onCardClick(item)}>
        <div className="mc-image-wrapper">
          {imageUrl ? (
            <img src={imageUrl} alt={item.title} className="mc-image" loading="lazy" />
          ) : (
            <div className="mc-no-image"><Tv size={32} color="#334155" /></div>
          )}
          
          <div className="mc-overlay-gradient"></div>
          
          {/* Кнопка швидкого чекіну */}
          <button className="mc-quick-action-btn" onClick={handleQuickMark} title="Відмітити як переглянуто">
            <CheckCircle size={24} />
          </button>

          {/* Смуга прогресу у стилі Trakt */}
          {progressPercent > 0 && (
            <div className="mc-progress-bg">
              <div className="mc-progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          )}
        </div>
        <div className="mc-info">
          <h3 className="mc-title" title={item.title}>{item.title}</h3>
          <p className="mc-subtitle" title={upNextSubtitle}>{upNextSubtitle}</p>
        </div>

        <style>{`
          .mc-backdrop-card { display: flex; flex-direction: column; gap: 8px; cursor: pointer; transition: transform 0.2s ease; width: 100%; min-width: 0; }
          .mc-backdrop-card:hover { transform: scale(1.03); }
          .mc-image-wrapper { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; background-color: #111; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
          .mc-image { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
          .mc-backdrop-card:hover .mc-image { transform: scale(1.05); }
          .mc-overlay-gradient { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%); pointer-events: none; }
          
          .mc-quick-action-btn { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8); opacity: 0; background: rgba(0,0,0,0.6); color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; backdrop-filter: blur(4px); z-index: 5; }
          .mc-backdrop-card:hover .mc-quick-action-btn { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          .mc-quick-action-btn:hover { background: rgba(56, 189, 248, 0.8); border-color: #38bdf8; color: #000; }

          .mc-progress-bg { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: rgba(255,255,255,0.2); z-index: 2; }
          .mc-progress-fill { height: 100%; background: #38bdf8; border-radius: 0 2px 2px 0; transition: width 0.3s ease; }
          
          .mc-info { padding: 4px 2px; }
          .mc-title { margin: 0; font-size: 15px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .mc-subtitle { margin: 2px 0 0 0; font-size: 13px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        `}</style>
      </div>
    );
  }

  // Стандартна картка (Poster - 2:3)
  return (
    <div className="mc-poster-card" onClick={() => onCardClick(item)}>
      <div className="mc-poster-wrapper">
        {imageUrl ? (
          <img src={imageUrl} alt={item.title} className="mc-poster" loading="lazy" />
        ) : (
          <div className="mc-no-poster">{item.media_type === 'movie' ? <Film size={32} /> : <Tv size={32} />}</div>
        )}
        
        {/* Бейджик типу */}
        <div className="mc-type-badge">
          {item.media_type === 'movie' ? <Film size={12} /> : <Tv size={12} />}
        </div>
      </div>
      
      <div className="mc-info">
        <h3 className="mc-title" title={item.title}>{item.title}</h3>
        <p className="mc-subtitle">{year || exactDate || 'ТВА'}</p>
      </div>

      <style>{`
        .mc-poster-card { display: flex; flex-direction: column; gap: 8px; cursor: pointer; transition: transform 0.2s ease; width: 100%; min-width: 0; }
        .mc-poster-card:hover { transform: translateY(-4px); }
        .mc-poster-wrapper { position: relative; width: 100%; aspect-ratio: 2/3; border-radius: 12px; overflow: hidden; background-color: #1a1a1a; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 1px solid #2a2a2a; transition: border-color 0.2s ease; }
        .mc-poster-card:hover .mc-poster-wrapper { border-color: #38bdf8; box-shadow: 0 8px 20px rgba(0,0,0,0.5); }
        .mc-poster { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
        .mc-poster-card:hover .mc-poster { transform: scale(1.05); }
        .mc-no-poster { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #334155; }
        
        .mc-type-badge { position: absolute; top: 8px; left: 8px; background: rgba(0, 0, 0, 0.7); padding: 4px 6px; border-radius: 6px; color: #fff; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(4px); }
        
        .mc-info { padding: 0 4px; }
        .mc-title { margin: 0; font-size: 14px; font-weight: 700; color: #fff; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; }
        .mc-subtitle { margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500; }
      `}</style>
    </div>
  );
}