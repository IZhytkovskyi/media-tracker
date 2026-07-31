import React, { useState } from 'react';
import { Star, Check, Plus, Eye } from 'lucide-react';
import { styles } from '../styles/mediaDetailStyles';
import { getLocalDateString } from '../utils';

export default function ActionButtons({ 
  type, 
  localMedia, 
  logs = [], 
  ensureLocalMedia, 
  handleUpdate, 
  handleLogCreate, 
  handleLogUpdate 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuAction, setMenuAction] = useState({ type: null, value: null });

  const today = getLocalDateString();
  const lastLog = logs.length > 0 ? logs[0] : null;

  // -------------------------------------------------------------
  // Виконання дії з логами (з меню або напряму)
  // -------------------------------------------------------------
  const executeLogAction = async (actionType, ratingValue, mode) => {
    setIsMenuOpen(false);
    
    const mediaItem = await ensureLocalMedia();
    if (!mediaItem) return;

    if (mode === 'new') {
      // "Додати новий лог" (або якщо фільм ще не completed)
      const logData = { watch_date: today };
      if (actionType === 'rating') logData.rating = ratingValue;
      
      await handleLogCreate(mediaItem.id, logData);
    } 
    else if (mode === 'edit_last') {
      // "Змінити останній лог"
      if (!lastLog) return;
      const logData = {};
      
      if (actionType === 'rating') {
        logData.rating = ratingValue; // Оновлюємо лише оцінку в останньому лозі
      } else if (actionType === 'completed') {
        logData.watch_date = today; // Оновлюємо дату перегляду на сьогодні
      }
      
      await handleLogUpdate(mediaItem.id, lastLog.id, logData);
    } 
    else if (mode === 'delete_last') {
      // "Видалити останній лог"
      if (!lastLog) return;
      if (window.confirm('Ви впевнені, що хочете видалити останній лог?')) {
        const res = await fetch(`/api/media/logs/${lastLog.id}`, { method: 'DELETE' });
        if (res.ok) {
          // Відправляємо пустий апдейт, щоб змусити React оновити дані без перезавантаження сторінки
          await handleUpdate(mediaItem.id, {});
        }
      }
    }
  };

  // -------------------------------------------------------------
  // Обробники кліків
  // -------------------------------------------------------------
  const onRatingClick = () => {
    const currentRating = localMedia?.rating || '';
    const input = window.prompt(`Оцінка від 0 до 5 (поточна: ${currentRating || 'немає'}):`, currentRating);
    
    if (input === null) return; // Скасовано
    
    const parsed = parseFloat(input.replace(',', '.'));
    let val = null;
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) {
      val = parsed;
    } else if (input.trim() !== '') {
      return alert("Будь ласка, введіть число від 0 до 5.");
    }

    // Якщо фільм ВЖЕ переглянуто — відкриваємо меню
    if (localMedia?.status === 'completed') {
      setMenuAction({ type: 'rating', value: val });
      setIsMenuOpen(true);
    } else {
      // Якщо ще не переглянуто — просто створюємо лог (статус completed поставиться сам на бекенді)
      executeLogAction('rating', val, 'new');
    }
  };

  const onCompletedClick = () => {
    if (localMedia?.status === 'completed') {
      setMenuAction({ type: 'completed', value: null });
      setIsMenuOpen(true);
    } else {
      executeLogAction('completed', null, 'new');
    }
  };

  const toggleStatus = async (targetStatus) => {
    const mediaItem = await ensureLocalMedia();
    if (!mediaItem) return;
    
    const newStatus = localMedia?.status === targetStatus ? null : targetStatus;
    await handleUpdate(mediaItem.id, { status: newStatus });
  };

  const displayStatus = localMedia?.status || null;
  const displayRating = localMedia?.rating || null;

  // Стилі для модального меню
  const modalOverlayStyle = {
    position: 'fixed', inset: 0, zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex', justifyContent: 'center', alignItems: 'center'
  };
  const modalBoxStyle = {
    backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
    padding: '20px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '10px'
  };
  const modalBtnStyle = {
    padding: '12px', borderRadius: '8px', cursor: 'pointer',
    border: 'none', background: '#334155', color: '#f8fafc',
    fontSize: '14px', fontWeight: '500', transition: 'background 0.2s'
  };

  return (
    <>
      <div style={styles.actionPanel}>
        {(type === 'series' || type === 'season') && (
          <button style={styles.actionItem} onClick={() => toggleStatus('watching')}>
            <div style={{ ...styles.actionIconCircle, borderColor: displayStatus === 'watching' ? '#38bdf8' : '#444' }}>
              <Eye size={20} color={displayStatus === 'watching' ? '#38bdf8' : '#a3a3a3'} />
            </div>
            <span style={{ ...styles.actionLabel, color: displayStatus === 'watching' ? '#38bdf8' : '#a3a3a3' }}>
              Дивлюсь
            </span>
          </button>
        )}

        <button style={styles.actionItem} onClick={onRatingClick}>
          <div style={{ ...styles.actionIconCircle, borderColor: displayRating !== null && displayRating !== undefined ? '#2ecc71' : '#444' }}>
            <Star size={20} color={displayRating !== null && displayRating !== undefined ? '#2ecc71' : '#a3a3a3'} fill={displayRating !== null && displayRating !== undefined ? '#2ecc71' : 'none'} />
          </div>
          <span style={{ ...styles.actionLabel, color: displayRating !== null && displayRating !== undefined ? '#2ecc71' : '#a3a3a3' }}>
            {displayRating !== null && displayRating !== undefined ? `${displayRating} / 5` : 'Оцінити'}
          </span>
        </button>

        <button style={styles.actionItem} onClick={onCompletedClick}>
          <div style={{ ...styles.actionIconCircle, borderColor: displayStatus === 'completed' ? '#2ecc71' : '#444' }}>
            <Check size={20} color={displayStatus === 'completed' ? '#2ecc71' : '#a3a3a3'} />
          </div>
          <span style={{ ...styles.actionLabel, color: displayStatus === 'completed' ? '#2ecc71' : '#a3a3a3' }}>
            Переглянуто
          </span>
        </button>

        {type !== 'episode' && (
          <button style={styles.actionItem} onClick={() => toggleStatus('planned')}>
            <div style={{ ...styles.actionIconCircle, borderColor: displayStatus === 'planned' ? '#facc15' : '#444' }}>
              <Plus size={20} color={displayStatus === 'planned' ? '#facc15' : '#a3a3a3'} />
            </div>
            <span style={{ ...styles.actionLabel, color: displayStatus === 'planned' ? '#facc15' : '#a3a3a3' }}>
              У плани
            </span>
          </button>
        )}
      </div>

      {/* Модальне меню дій над логом */}
      {isMenuOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ marginTop: 0, color: '#fff', marginBottom: '5px' }}>Фільм вже переглянуто</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '15px' }}>Оберіть дію для історії переглядів:</p>
            
            <button 
              style={{...modalBtnStyle, background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8'}} 
              onClick={() => executeLogAction(menuAction.type, menuAction.value, 'new')}
            >
              Додати новий лог
            </button>
            <button 
              style={modalBtnStyle} 
              onClick={() => executeLogAction(menuAction.type, menuAction.value, 'edit_last')}
            >
              Змінити останній лог
            </button>
            <button 
              style={{...modalBtnStyle, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}} 
              onClick={() => executeLogAction(menuAction.type, menuAction.value, 'delete_last')}
            >
              Видалити останній лог
            </button>
            <button 
              style={{...modalBtnStyle, background: 'transparent', border: '1px solid #444', marginTop: '10px'}} 
              onClick={() => setIsMenuOpen(false)}
            >
              Скасувати
            </button>
          </div>
        </div>
      )}
    </>
  );
}