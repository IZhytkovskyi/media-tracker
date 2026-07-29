import React from 'react';
import { Star, Check, Plus, Eye } from 'lucide-react';
import { styles } from '../styles/mediaDetailStyles';

// Допоміжна функція для безпечного отримання локальної дати у форматі YYYY-MM-DD
const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ActionButtons({ 
  type, 
  localMedia, 
  logs = [], 
  ensureLocalMedia,
  handleUpdate, 
  handleLogCreate,
  handleLogUpdate 
}) {
  
  // Аналіз логів із використанням локального часу
  const today = getLocalDateString();
  const lastLog = logs.length > 0 ? logs[0] : null; 
  const isTodayLog = lastLog && lastLog.watch_date === today;
  const isCompleted = localMedia?.status === 'completed';

  const processAction = async (actionType, ratingValue = null) => {
    // 1. ГАРАНТУЄМО наявність медіа в базі даних перед будь-якою дією
    const mediaItem = await ensureLocalMedia();
    if (!mediaItem) return;

    // Якщо це дія "Дивлюсь", лише оновлюємо статус (без логів)
    if (actionType === 'watching') {
      handleUpdate(mediaItem.id, { status: 'watching' });
      return;
    }

    // 2. Оновлюємо статус на "completed" та записуємо оцінку, якщо вона передана
    const updates = { status: 'completed' };
    if (ratingValue !== null) updates.rating = ratingValue;
    handleUpdate(mediaItem.id, updates);

    // 3. Інтелектуальна логіка логів
    const logData = { watch_date: today };
    if (ratingValue !== null) logData.rating = ratingValue;

    if (isTodayLog) {
      // Якщо сьогодні вже створено лог -> просто оновлюємо його (без зайвих питань)
      handleLogUpdate(mediaItem.id, lastLog.id, logData);
    } else if (isCompleted && lastLog) {
      // Якщо статус "Переглянуто", але останній лог був вчора або раніше
      const createNew = window.confirm(
        "Фільм вже має статус «Переглянуто».\n\nНатисніть «ОК», щоб створити НОВИЙ запис (передивлення).\nНатисніть «Скасувати», щоб змінити ОСТАННІЙ запис."
      );
      if (createNew) {
        handleLogCreate(mediaItem.id, logData);
      } else {
        handleLogUpdate(mediaItem.id, lastLog.id, logData);
      }
    } else {
      // Якщо це перший перегляд
      handleLogCreate(mediaItem.id, logData);
    }
  };

  const onRatingClick = () => {
    const currentRating = localMedia?.rating || '';
    const input = window.prompt(`Введіть оцінку від 0 до 5 (поточна: ${currentRating || 'немає'}):`, currentRating);
    if (input === null) return;
    const parsed = parseFloat(input);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) {
      processAction('rating', parsed);
    } else {
      alert("Некоректна оцінка. Введіть число від 0 до 5.");
    }
  };

  const onCompletedClick = () => {
    processAction('completed', null);
  };

  // Значення для відображення UI (fallback, якщо фільму ще немає в БД)
  const displayStatus = localMedia?.status || 'planned';
  const displayRating = localMedia?.rating || null;

  return (
    <div style={styles.actionPanel}>
      
      {(type === 'series' || type === 'season') && (
        <button style={styles.actionItem} onClick={() => processAction('watching')}>
          <div style={{ ...styles.actionIconCircle, borderColor: displayStatus === 'watching' ? '#38bdf8' : '#444' }}>
            <Eye size={20} color={displayStatus === 'watching' ? '#38bdf8' : '#a3a3a3'} />
          </div>
          <span style={{ ...styles.actionLabel, color: displayStatus === 'watching' ? '#38bdf8' : '#a3a3a3' }}>
            Дивлюсь
          </span>
        </button>
      )}

      <button style={styles.actionItem} onClick={onRatingClick}>
        <div style={{ ...styles.actionIconCircle, borderColor: displayRating ? '#2ecc71' : '#444' }}>
          <Star size={20} color={displayRating ? '#2ecc71' : '#a3a3a3'} fill={displayRating ? '#2ecc71' : 'none'} />
        </div>
        <span style={{ ...styles.actionLabel, color: displayRating ? '#2ecc71' : '#a3a3a3' }}>
          {displayRating || 'Оцінка'}
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
        <button style={styles.actionItem}>
          <div style={styles.actionIconCircle}>
            <Plus size={20} color="#a3a3a3" />
          </div>
          <span style={styles.actionLabel}>Списки</span>
        </button>
      )}

    </div>
  );
}