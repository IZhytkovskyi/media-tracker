// frontend/src/components/ActionButtons.jsx
import React, { useState, useEffect } from 'react';
import { Star, Check, Bookmark, X, CalendarPlus, Trash2, RotateCcw } from 'lucide-react';
import { styles } from '../styles/mediaDetailStyles';
import { getLocalDateString } from '../utils';

export default function ActionButtons({ 
    type, 
    localMedia, 
    ensureLocalMedia, 
    handleUpdate, 
    handleAddToHistory, 
    handleRemoveFromHistory,
    handleToggleWatchlist
}) {
  const [modalState, setModalState] = useState({ isOpen: false, mode: '' });
  const [formData, setFormData] = useState({ watched_at: '', rating: '' });
  
  // Optimistic UI states
  const [isWatched, setIsWatched] = useState(localMedia?.play_count > 0);
  const [inWatchlist, setInWatchlist] = useState(localMedia?.in_watchlist === 1);
  const [rating, setRating] = useState(localMedia?.user_rating || null);

  const today = getLocalDateString();

  useEffect(() => {
    setIsWatched(localMedia?.play_count > 0);
    setInWatchlist(localMedia?.in_watchlist === 1);
    setRating(localMedia?.user_rating || null);
  }, [localMedia]);

  // === ЛОГІКА ІСТОРІЇ (HISTORY) ===
  const toggleHistory = async () => {
    if (isWatched) {
      // Якщо вже переглянуто, відкриваємо меню (Видалити або Подивитися ще раз)
      setModalState({ isOpen: true, mode: 'history_options' });
      return;
    }
    
    // Оптимістичне додавання
    setIsWatched(true);
    setInWatchlist(false); // Trakt автоматично видаляє з Watchlist
    
    try {
      const mediaItem = await ensureLocalMedia();
      if (!mediaItem) throw new Error("Помилка створення медіа");
      await handleAddToHistory(mediaItem.id, { watched_at: new Date().toISOString() });
    } catch (err) {
      console.error(err);
      setIsWatched(false);
      setInWatchlist(localMedia?.in_watchlist === 1);
    }
  };

  const removeHistory = async () => {
    setModalState({ isOpen: false });
    setIsWatched(false);
    try {
      const mediaItem = await ensureLocalMedia();
      if (mediaItem) await handleRemoveFromHistory(mediaItem.id);
    } catch (err) {
      setIsWatched(true);
    }
  };

  const addAnotherPlay = () => {
    setFormData({ ...formData, watched_at: today });
    setModalState({ isOpen: true, mode: 'history_custom' });
  };

  // === ЛОГІКА WATCHLIST ===
  const toggleWatchlistClick = async () => {
    const newState = !inWatchlist;
    setInWatchlist(newState);
    try {
      const mediaItem = await ensureLocalMedia();
      if (!mediaItem) throw new Error("Помилка створення медіа");
      await handleToggleWatchlist(mediaItem.id);
    } catch (err) {
      console.error(err);
      setInWatchlist(!newState);
    }
  };

  // === ЛОГІКА ОЦІНКИ ===
  const openRatingModal = () => {
    setFormData({ ...formData, rating: rating || '' });
    setModalState({ isOpen: true, mode: 'rating' });
  };

  const submitModal = async (e) => {
    e.preventDefault();
    setModalState({ isOpen: false });

    try {
      const mediaItem = await ensureLocalMedia();
      if (!mediaItem) return;

      if (modalState.mode === 'rating') {
        const cleanRating = formData.rating === '' ? null : parseFloat(formData.rating.toString().replace(',', '.'));
        setRating(cleanRating);
        await handleUpdate(mediaItem.id, { user_rating: cleanRating });
      } else if (modalState.mode === 'history_custom') {
        setIsWatched(true);
        await handleAddToHistory(mediaItem.id, { watched_at: formData.watched_at || new Date().toISOString() });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const hasRating = rating !== null && rating !== undefined;

  // Стилі модалок
  const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' };
  const modalBoxStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' };
  const inputStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' };

  return (
    <>
      <div style={styles.actionPanel}>
        {/* Кнопка Watchlist */}
        {type !== 'episode' && (
          <button style={styles.actionItem} onClick={toggleWatchlistClick}>
            <div style={{ ...styles.actionIconCircle, borderColor: inWatchlist ? '#38bdf8' : '#444', backgroundColor: inWatchlist ? 'rgba(56, 189, 248, 0.1)' : '#222' }}>
              <Bookmark size={20} color={inWatchlist ? '#38bdf8' : '#a3a3a3'} fill={inWatchlist ? '#38bdf8' : 'none'} />
            </div>
            <span style={{ ...styles.actionLabel, color: inWatchlist ? '#38bdf8' : '#a3a3a3' }}>
              {inWatchlist ? 'У планах' : 'В плани'}
            </span>
          </button>
        )}

        {/* Кнопка History */}
        <button style={styles.actionItem} onClick={toggleHistory}>
          <div style={{ ...styles.actionIconCircle, borderColor: isWatched ? '#2ecc71' : '#444', backgroundColor: isWatched ? 'rgba(46, 204, 113, 0.1)' : '#222' }}>
            <Check size={20} color={isWatched ? '#2ecc71' : '#a3a3a3'} strokeWidth={isWatched ? 3 : 2} />
          </div>
          <span style={{ ...styles.actionLabel, color: isWatched ? '#2ecc71' : '#a3a3a3' }}>
            {isWatched ? 'Переглянуто' : 'Відмітити'}
          </span>
        </button>

        {/* Кнопка Rating */}
        <button style={styles.actionItem} onClick={openRatingModal}>
          <div style={{ ...styles.actionIconCircle, borderColor: hasRating ? '#facc15' : '#444', backgroundColor: hasRating ? 'rgba(250, 204, 21, 0.1)' : '#222' }}>
            <Star size={20} color={hasRating ? '#facc15' : '#a3a3a3'} fill={hasRating ? '#facc15' : 'none'} />
          </div>
          <span style={{ ...styles.actionLabel, color: hasRating ? '#facc15' : '#a3a3a3' }}>
            {hasRating ? `${rating} / 5` : 'Оцінити'}
          </span>
        </button>
      </div>

      {modalState.isOpen && (
        <div style={modalOverlayStyle} onClick={() => setModalState({ isOpen: false })}>
          
          {/* Меню History (Якщо вже переглянуто) */}
          {modalState.mode === 'history_options' && (
            <div style={modalBoxStyle} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff' }}>Управління переглядом</h3>
                <button onClick={() => setModalState({ isOpen: false })} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18}/></button>
              </div>
              <button style={{...inputStyle, background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} onClick={addAnotherPlay}>
                <RotateCcw size={18} /> Додати ще один перегляд (Rewatch)
              </button>
              <button style={{...inputStyle, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} onClick={removeHistory}>
                <Trash2 size={18} /> Видалити з історії
              </button>
            </div>
          )}

          {/* Форма Рейтингу або Кастомної дати перегляду */}
          {(modalState.mode === 'rating' || modalState.mode === 'history_custom') && (
            <div style={modalBoxStyle} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {modalState.mode === 'history_custom' ? <><CalendarPlus size={20} color="#2ecc71"/> Додати перегляд</> : <><Star size={20} color="#facc15"/> Оцінити</>}
                </h3>
                <button onClick={() => setModalState({ isOpen: false })} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18}/></button>
              </div>

              <form onSubmit={submitModal} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                {modalState.mode === 'history_custom' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>Дата перегляду</label>
                    <input type="date" value={formData.watched_at} onChange={e => setFormData({...formData, watched_at: e.target.value})} style={inputStyle} required />
                  </div>
                )}
                
                {modalState.mode === 'rating' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>Ваша оцінка (0 - 5)</label>
                    <input type="number" step="0.5" min="0" max="5" placeholder="Без оцінки" value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value})} style={inputStyle} />
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalState({ isOpen: false })} style={{ background: 'transparent', border: '1px solid #444', color: '#ccc', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Скасувати</button>
                  <button type="submit" style={{ background: '#38bdf8', border: 'none', color: '#000', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Зберегти</button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}
    </>
  );
}