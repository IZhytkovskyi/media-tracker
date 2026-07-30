import React from 'react';
import { Star, Check, Plus, Eye } from 'lucide-react';
import { styles } from '../styles/mediaDetailStyles';

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
  const today = getLocalDateString();
  const lastLog = logs.length > 0 ? logs[0] : null;

  const isTodayLog = lastLog && lastLog.watch_date === today;
  const isCompleted = localMedia?.status === 'completed';

  const processAction = async (actionType, ratingValue = null) => {
    const mediaItem = await ensureLocalMedia();
    if (!mediaItem) return;

    // Перемикач для статусу "Дивлюсь" або "У плани"
    if (actionType === 'watching' || actionType === 'planned') {
      const newStatus = localMedia?.status === actionType ? null : actionType;
      await handleUpdate(mediaItem.id, { status: newStatus });
      return;
    }

    // Дії через історію (Watch Logs)
    const logData = { watch_date: today };
    if (ratingValue !== null) logData.rating = ratingValue;

    if (isTodayLog) {
      await handleLogUpdate(mediaItem.id, lastLog.id, logData);
    } else if (isCompleted && lastLog) {
      const createNew = window.confirm(
        "Цей тайтл вже переглянуто.\n\nДодати НОВИЙ запис про повторний перегляд у журнал?"
      );
      if (createNew) {
        await handleLogCreate(mediaItem.id, logData);
      } else {
        await handleLogUpdate(mediaItem.id, lastLog.id, logData);
      }
    } else {
      await handleLogCreate(mediaItem.id, logData);
    }
  };

  const onRatingClick = () => {
    const currentRating = localMedia?.rating || '';
    const input = window.prompt(`Введіть вашу оцінку від 0 до 5 (Поточна: ${currentRating || 'немає'}):`, currentRating);
    if (input === null) return;
    
    const parsed = parseFloat(input);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) {
      processAction('rating', parsed);
    } else if (input.trim() === '') {
      processAction('rating', null);
    } else {
      alert("Будь ласка, введіть число від 0 до 5.");
    }
  };

  const onCompletedClick = () => {
    processAction('completed', localMedia?.rating || null);
  };

  const displayStatus = localMedia?.status || null;
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
        <button style={styles.actionItem} onClick={() => processAction('planned')}>
          <div style={{ ...styles.actionIconCircle, borderColor: displayStatus === 'planned' ? '#facc15' : '#444' }}>
            <Plus size={20} color={displayStatus === 'planned' ? '#facc15' : '#a3a3a3'} />
          </div>
          <span style={{ ...styles.actionLabel, color: displayStatus === 'planned' ? '#facc15' : '#a3a3a3' }}>
            У плани
          </span>
        </button>
      )}
    </div>
  );
}