// frontend/src/components/MediaCard.jsx
import React, { useState } from 'react';
import { Film, Tv, Star, Trash2, CalendarCheck, MinusCircle, CalendarClock, PlayCircle, MoreVertical, CheckCircle } from 'lucide-react';

export default function MediaCard({ 
  item, 
  options = {}, 
  onCardClick, 
  onUpdateStatus, 
  onUpdateRating, 
  onDelete, 
  onRemoveFromList,
  onMarkNextEpisode
}) {
  const { isInsideList = false, isComingSoon = false, isWide = false } = options;
  const [showMenu, setShowMenu] = useState(false);

  const posterUrl = item.poster_path 
    ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`)
    : null;
    
  // Фолбек на постер, якщо бекдроп відсутній
  const backdropUrl = item.backdrop_path 
    ? (item.backdrop_path.startsWith('http') ? item.backdrop_path : `https://image.tmdb.org/t/p/w780${item.backdrop_path}`)
    : posterUrl;

  const getDaysLeftInfo = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { text: 'СЬОГОДНІ', color: '#ef4444' };
    if (diffDays === 1) return { text: 'ЗАВТРА', color: '#f97316' };
    if (diffDays === 2) return { text: 'ПІСЛЯЗАВТРА', color: '#eab308' };
    return { text: `ЧЕРЕЗ ${diffDays} ДН.`, color: '#3b82f6' };
  };

  const daysLeftInfo = (isComingSoon && item.release_date) ? getDaysLeftInfo(item.release_date) : null;
  const exactDate = item.release_date ? new Date(item.release_date).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const year = item.release_date ? item.release_date.split('-')[0] : null;

  let episodeBadge = null;
  let epShort = '';
  if (item.media_type === 'episode') {
    episodeBadge = `СЕЗОН ${item.season} • ЕПІЗОД ${item.episode}`;
    epShort = `С${item.season} • Е${item.episode}`;
  } else if (item.media_type === 'season') {
    episodeBadge = `СЕЗОН ${item.season}`;
    epShort = `Сезон ${item.season}`;
  }

  const isCompleted = item.status === 'completed' && item.finish_date && !isComingSoon;

  // --- ШИРОКИЙ ДИЗАЙН 16:9 (Для серій або "Триває перегляд") ---
  if (isWide) {
    let wideSubtitle = '';
    let pillLeft = null;
    let pillRight = null;
    let progressPercent = 0;
    let showProgressBar = false;

    // Логіка підписів
    if (item.media_type === 'series') {
      if (item.status === 'watching' && item.nextEpisode) {
        const epTitle = item.nextEpisode.original_title || item.nextEpisode.title;
        wideSubtitle = `С${item.nextEpisode.season} • Е${item.nextEpisode.episode}` + (epTitle ? ` - ${epTitle}` : '');
      } else if (item.status === 'watching' && item.progress && item.progress.total > 0 && item.progress.watched >= item.progress.total) {
        wideSubtitle = 'Очікування нових епізодів';
      } else if (item.status === 'watching') {
        wideSubtitle = 'Почати перегляд';
      } else {
        wideSubtitle = 'Серіал';
      }
    } else if (item.media_type === 'movie') {
      wideSubtitle = `${year || ''} • Фільм`;
    } else {
      wideSubtitle = epShort + (item.original_title ? ` - ${item.original_title}` : '');
    }

    // Логіка кнопок/інформації знизу (Pills)
    if (item.status === 'watching') {
      pillLeft = <><PlayCircle size={14} style={{marginRight: '4px'}}/> Продовжити</>;
      if (item.media_type === 'series' && item.progress) {
        pillRight = item.progress.left > 0 ? `${item.progress.left} еп. залишилось` : 'Всі переглянуто';
        if (item.progress.total > 0) {
          progressPercent = (item.progress.watched / item.progress.total) * 100;
          showProgressBar = true;
        }
      } else {
        pillRight = item.media_type === 'movie' ? 'Фільм' : 'Епізод';
      }
    } else if (isComingSoon) {
      pillLeft = <><CalendarClock size={14} style={{marginRight: '4px'}}/> {exactDate}</>;
      pillRight = 'Очікується';
    } else if (isCompleted) {
      pillLeft = <><CalendarCheck size={14} style={{marginRight: '4px'}}/> {new Date(item.finish_date).toLocaleDateString('uk-UA')}</>;
      pillRight = 'Переглянуто';
    } else {
       pillLeft = <><Tv size={14} style={{marginRight: '4px'}}/> {item.media_type}</>;
       pillRight = item.status === 'planned' ? 'У планах' : 'Немає статусу';
    }

    // Якщо є наступний епізод, беремо його кадр, інакше фолбек на бекдроп серіалу
    const photoUrl = (item.status === 'watching' && item.nextEpisode?.poster_path)
        ? (item.nextEpisode.poster_path.startsWith('http') ? item.nextEpisode.poster_path : `https://image.tmdb.org/t/p/w780${item.nextEpisode.poster_path}`)
        : backdropUrl;

    return (
      <div className="mc-watching-card wide-span" onClick={() => onCardClick(item)} onMouseLeave={() => setShowMenu(false)}>
        <div className="mc-backdrop-wrapper">
          {photoUrl ? (
            <img src={photoUrl} alt={item.title} className="mc-backdrop" loading="lazy" />
          ) : (
            <div className="mc-no-poster">Немає зображення</div>
          )}
          
          <div className="mc-backdrop-overlay"></div>
          
          {isComingSoon && daysLeftInfo && (
            <div className="mc-days-left-badge" style={{ backgroundColor: daysLeftInfo.color, top: '8px', left: '8px', right: 'auto' }}>
              {daysLeftInfo.text}
            </div>
          )}

          <button 
            className="mc-options-btn" 
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          >
            <MoreVertical size={20} color="#fff" />
          </button>

          <div className="mc-watching-pills">
            <div className="mc-pill mc-pill-accent">{pillLeft}</div>
            <div className="mc-pill">{pillRight}</div>
          </div>

          {showProgressBar && (
            <div className="mc-progress-bar-bg">
              <div className="mc-progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          )}

          {showMenu && (
            <div className="mc-watching-menu" onClick={(e) => e.stopPropagation()}>
              
              {item.status === 'watching' && item.media_type === 'series' && item.nextEpisode && (
                  <>
                    <button 
                        className="mc-menu-action-btn"
                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); onMarkNextEpisode(item.id); }}
                    >
                        <CheckCircle size={16} color="#38bdf8" /> 
                        <span>Відмітити С{item.nextEpisode.season} Е{item.nextEpisode.episode}</span>
                    </button>
                    <div className="mc-menu-divider"></div>
                  </>
              )}

              <select 
                value={item.status || ''} 
                onChange={(e) => { setShowMenu(false); onUpdateStatus(item.id, e.target.value || null); }}
                className="mc-status-select"
                style={{ marginBottom: '10px' }}
              >
                <option value="">Немає статусу</option>
                <option value="planned">У планах</option>
                <option value="watching">Дивлюсь</option>
                <option value="completed">Переглянуто</option>
                <option value="on_hold">На паузі</option>
                <option value="dropped">Покинуто</option>
              </select>
              <div className="mc-bottom-row" style={{ gap: '10px' }}>
                <div className="mc-rating">
                  <Star size={16} color={item.rating ? "#facc15" : "#475569"} fill={item.rating ? "#facc15" : "none"} />
                  <input 
                    type="number" min="0" max="5" step="0.5"
                    value={item.rating || ''} 
                    placeholder="-"
                    onChange={(e) => onUpdateRating(item.id, e.target.value)}
                    className="mc-rating-input"
                  />
                </div>
                <button className="mc-delete-btn" onClick={() => { setShowMenu(false); onDelete(item.id); }} title="Видалити">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mc-watching-info">
          <h3 className="mc-watching-title" title={item.title}>{item.title}</h3>
          <p className="mc-watching-subtitle" title={wideSubtitle}>{wideSubtitle}</p>
        </div>

        <style>{`
          .wide-span { grid-column: span 2; }
          .mc-watching-card { display: flex; flex-direction: column; gap: 8px; cursor: pointer; transition: transform 0.2s ease; width: 100%; min-width: 0; }
          .mc-watching-card:hover { transform: scale(1.02); }
          .mc-backdrop-wrapper { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 16px; overflow: hidden; background-color: #111; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
          .mc-backdrop { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
          .mc-watching-card:hover .mc-backdrop { transform: scale(1.05); }
          
          .mc-backdrop-overlay { position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); pointer-events: none; z-index: 1; }
          
          .mc-options-btn { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5; transition: background 0.2s; backdrop-filter: blur(4px); }
          .mc-options-btn:hover { background: rgba(0,0,0,0.8); }

          .mc-watching-pills { position: absolute; bottom: 12px; left: 12px; right: 12px; display: flex; justify-content: space-between; z-index: 2; align-items: center; pointer-events: none; }
          .mc-pill { background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); color: #f8fafc; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px; display: flex; align-items: center; letter-spacing: 0.2px; }
          .mc-pill-accent { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }

          .mc-progress-bar-bg { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: rgba(255,255,255,0.2); z-index: 2; }
          .mc-progress-bar-fill { height: 100%; background: #38bdf8; border-radius: 0 2px 2px 0; transition: width 0.3s ease; }

          .mc-watching-info { padding: 4px 2px; overflow: hidden; }
          .mc-watching-title { margin: 0; font-size: 17px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0.3px; }
          .mc-watching-subtitle { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
          
          .mc-watching-menu { position: absolute; top: 45px; right: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 12px; z-index: 10; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: flex; flex-direction: column; min-width: 200px; }
          .mc-menu-action-btn { background: transparent; border: none; color: #f8fafc; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; padding: 8px 10px; cursor: pointer; border-radius: 6px; transition: background 0.2s; width: 100%; text-align: left; }
          .mc-menu-action-btn:hover { background: rgba(56, 189, 248, 0.15); }
          .mc-menu-divider { height: 1px; background: #334155; margin: 8px 0; }

          @media (max-width: 600px) { .wide-span { grid-column: span 1; } }
        `}</style>
      </div>
    );
  }

  // --- СТАНДАРТНИЙ ДИЗАЙН (2:3 Вертикально для фільмів) ---
  return (
    <div className="mc-card" onClick={() => onCardClick(item)} onMouseLeave={() => setShowMenu(false)}>
      <div className="mc-poster-wrapper">
        {posterUrl ? (
          <img src={posterUrl} alt={item.title} className="mc-poster" loading="lazy" />
        ) : (
          <div className="mc-no-poster">Немає постера</div>
        )}
        
        {!isComingSoon && (
          <div className="mc-type-badge">
            {item.media_type === 'movie' ? <Film size={14} /> : <Tv size={14} />}
          </div>
        )}

        {isComingSoon && daysLeftInfo && (
          <div className="mc-days-left-badge" style={{ backgroundColor: daysLeftInfo.color }}>
            {daysLeftInfo.text}
          </div>
        )}

        {isComingSoon && episodeBadge && (
          <div className="mc-episode-badge">
            {episodeBadge}
          </div>
        )}
        
        {isInsideList && (
          <button 
            className="mc-remove-list-btn" 
            title="Видалити зі списку"
            onClick={(e) => { e.stopPropagation(); onRemoveFromList(item.id); }}
          >
            <MinusCircle size={18} />
          </button>
        )}

        <button className="mc-options-btn-sm" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
          <MoreVertical size={16} color="#fff" />
        </button>

        {showMenu && (
          <div className="mc-watching-menu" onClick={(e) => e.stopPropagation()}>
            <select 
              value={item.status || ''} 
              onChange={(e) => { setShowMenu(false); onUpdateStatus(item.id, e.target.value || null); }}
              className="mc-status-select"
              style={{ marginBottom: '10px' }}
            >
              <option value="">Немає статусу</option>
              <option value="planned">У планах</option>
              <option value="watching">Дивлюсь</option>
              <option value="completed">Переглянуто</option>
              <option value="on_hold">На паузі</option>
              <option value="dropped">Покинуто</option>
            </select>
            <div className="mc-bottom-row" style={{ gap: '10px' }}>
              <div className="mc-rating">
                <Star size={16} color={item.rating ? "#facc15" : "#475569"} fill={item.rating ? "#facc15" : "none"} />
                <input 
                  type="number" min="0" max="5" step="0.5"
                  value={item.rating || ''} 
                  placeholder="-"
                  onChange={(e) => onUpdateRating(item.id, e.target.value)}
                  className="mc-rating-input"
                />
              </div>
              <button className="mc-delete-btn" onClick={() => { setShowMenu(false); onDelete(item.id); }} title="Видалити">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="mc-content">
        <div className="mc-header">
          <h3 className="mc-title" title={item.title}>{item.title}</h3>
          
          {isComingSoon && item.media_type === 'episode' && item.original_title && (
            <p className="mc-episode-title" title={item.original_title}>{item.original_title}</p>
          )}

          {isCompleted ? (
            <p className="mc-subtitle mc-success">
              <CalendarCheck size={12} style={{marginRight: '4px'}}/>
              {new Date(item.finish_date).toLocaleDateString('uk-UA')}
            </p>
          ) : (
            <p className={isComingSoon ? "mc-subtitle mc-highlight" : "mc-subtitle"}>
              {isComingSoon && <CalendarClock size={12} style={{marginRight: '4px', verticalAlign: 'text-bottom'}}/>}
              {isComingSoon ? exactDate : [episodeBadge ? null : (item.media_type === 'series' && item.total_seasons ? `${item.total_seasons} сез.` : null), year].filter(Boolean).join(' • ') || 'Невідомо'}
            </p>
          )}
        </div>
      </div>

      <style>{`
        .mc-card { background-color: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.3); position: relative; width: 100%; min-width: 0; }
        .mc-card:hover { transform: translateY(-4px); border-color: #38bdf8; box-shadow: 0 10px 20px rgba(0,0,0,0.6); }
        
        .mc-poster-wrapper { position: relative; width: 100%; padding-top: 150%; background-color: #111; overflow: hidden; }
        .mc-poster { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
        .mc-card:hover .mc-poster { transform: scale(1.05); }
        .mc-no-poster { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #555; font-size: 14px; }
        
        .mc-type-badge { position: absolute; top: 8px; left: 8px; background: rgba(10, 10, 10, 0.8); backdrop-filter: blur(4px); padding: 6px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; border: 1px solid rgba(255,255,255,0.1); }
        
        .mc-options-btn-sm { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5; transition: background 0.2s; backdrop-filter: blur(4px); }
        .mc-options-btn-sm:hover { background: rgba(0,0,0,0.9); }

        .mc-days-left-badge { position: absolute; top: 8px; right: 8px; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.5); z-index: 2; letter-spacing: 0.5px; }
        .mc-episode-badge { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%); color: #fff; font-size: 12px; font-weight: 700; padding: 20px 10px 10px 10px; text-align: center; letter-spacing: 0.5px; z-index: 2; }
        
        .mc-remove-list-btn { position: absolute; top: 8px; left: 8px; background: rgba(0, 0, 0, 0.6); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(4px); z-index: 3; }
        .mc-remove-list-btn:hover { background: rgba(239, 68, 68, 0.8); color: #fff; border-color: #ef4444; }

        .mc-content { padding: 14px; display: flex; flex-direction: column; flex-grow: 1; justify-content: space-between; z-index: 2; background-color: #1a1a1a; overflow: hidden; }
        .mc-header { margin-bottom: 0; }
        .mc-title { margin: 0 0 4px 0; font-size: 15px; font-weight: 700; line-height: 1.3; color: #fff; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .mc-episode-title { margin: 0 0 6px 0; font-size: 13px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mc-subtitle { margin: 0; font-size: 12px; color: #64748b; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mc-success { color: #2ecc71; display: flex; align-items: center; }
        .mc-highlight { color: #38bdf8; }
        
        .mc-status-select { background: #0a0a0a; color: #e5e5e5; border: 1px solid #333; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; width: 100%; appearance: none; transition: border-color 0.2s; }
        .mc-status-select:focus { border-color: #38bdf8; outline: none; }
        
        .mc-bottom-row { display: flex; justify-content: space-between; align-items: center; }
        .mc-rating { display: flex; align-items: center; gap: 6px; background: #0a0a0a; padding: 4px 8px; border-radius: 6px; border: 1px solid #333; }
        .mc-rating-input { width: 35px; background: transparent; color: #fff; border: none; padding: 0; text-align: center; font-size: 13px; font-weight: bold; }
        .mc-rating-input:focus { outline: none; }
        
        .mc-delete-btn { background: transparent; border: none; color: #64748b; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; border-radius: 6px; }
        .mc-delete-btn:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
      `}</style>
    </div>
  );
}