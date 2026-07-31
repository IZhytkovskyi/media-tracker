import React, { useState } from 'react';
import { Star, Check, Plus, Eye, X } from 'lucide-react';
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
  const [modalState, setModalState] = useState({ isOpen: false, mode: '', actionType: '' });
  const [formData, setFormData] = useState({ start_date: '', finish_date: '', rating: '' });

  const today = getLocalDateString();
  const directLogs = logs.filter(l => l.media_id === localMedia?.id);
  const lastLog = directLogs.length > 0 ? directLogs[0] : null;

  const openModal = (mode, actionType) => {
    const isCompleted = localMedia?.status === 'completed';
    const watchingLog = directLogs.find(l => l.start_date && !l.finish_date);
    
    let defaultStart = '';
    let defaultFinish = '';
    let defaultRating = localMedia?.rating || '';
    let activeLogId = lastLog ? lastLog.id : null;

    if (mode === 'new' || (!isCompleted && actionType !== 'watching')) {
      if (type === 'season' || type === 'series') {
        if (actionType === 'watching') {
          defaultStart = watchingLog ? watchingLog.start_date : today;
          defaultFinish = '';
          if (watchingLog) { mode = 'edit_last'; activeLogId = watchingLog.id; }
        } else if (actionType === 'completed' || actionType === 'rating') {
          defaultStart = watchingLog ? watchingLog.start_date : today;
          defaultFinish = today;
          if (watchingLog) { mode = 'edit_last'; activeLogId = watchingLog.id; }
        }
      } else if (type === 'episode' || type === 'movie') {
        defaultStart = today;
        defaultFinish = today;
      }
    } else if (mode === 'edit_last' && lastLog) {
      defaultStart = lastLog.start_date || '';
      defaultFinish = lastLog.finish_date || '';
      defaultRating = lastLog.rating || localMedia?.rating || '';
      activeLogId = lastLog.id;
    }

    setFormData({ start_date: defaultStart, finish_date: defaultFinish, rating: defaultRating });
    setModalState({ isOpen: true, mode, actionType, logToEdit: activeLogId });
  };

  const submitModal = async (e) => {
    e.preventDefault();
    const mediaItem = await ensureLocalMedia();
    if (!mediaItem) return;

    const { start_date, finish_date, rating } = formData;
    const cleanRating = rating === '' ? null : parseFloat(rating.toString().replace(',', '.'));

    const logPayload = {
      start_date: start_date || null,
      finish_date: finish_date || null,
      rating: cleanRating
    };

    if (modalState.mode === 'new') {
      await handleLogCreate(mediaItem.id, logPayload);
    } else if (modalState.mode === 'edit_last' && modalState.logToEdit) {
      await handleLogUpdate(mediaItem.id, modalState.logToEdit, logPayload);
    }

    setModalState({ isOpen: false, mode: '', actionType: '' });
  };

  const deleteLastLog = async () => {
    if (!lastLog || !window.confirm('Точно видалити останній запис?')) return;
    try {
      await fetch(`/api/media/logs/${lastLog.id}`, { method: 'DELETE' });
      await handleUpdate(localMedia.id, {}); // Примусове оновлення локального стейту
      setModalState({ isOpen: false, mode: '', actionType: '' });
    } catch (e) {}
  };

  const onClickWatching = async () => {
    if (type === 'series') {
      const mediaItem = await ensureLocalMedia();
      if (mediaItem) await handleUpdate(mediaItem.id, { status: 'watching' });
    } else if (type === 'season') {
      openModal('new', 'watching');
    }
  };

  const onClickCompletedOrRating = async (isRatingClick) => {
    const isCompleted = localMedia?.status === 'completed';
    const hasLogs = directLogs.length > 0;
    const actionType = isRatingClick ? 'rating' : 'completed';

    // 1. Для сезону та серіалу ЗАВЖДИ відкриваємо модалку або меню
    if (type === 'season' || type === 'series') {
      if (isCompleted || hasLogs) {
        setModalState({ isOpen: true, mode: 'select_action', actionType });
      } else {
        openModal('new', actionType);
      }
      return;
    }

    // 2. Для фільму та серії (епізоду)
    if (isCompleted || hasLogs) {
      setModalState({ isOpen: true, mode: 'select_action', actionType });
      return;
    }

    // Перший раз - автоматично ставимо сьогоднішню дату
    const mediaItem = await ensureLocalMedia();
    if (mediaItem) {
      let ratingVal = null;
      if (isRatingClick) {
        ratingVal = parseFloat(window.prompt('Оцінка (0-5):', '')?.replace(',', '.'));
        if (isNaN(ratingVal) || ratingVal < 0 || ratingVal > 5) return;
      }

      await handleLogCreate(mediaItem.id, {
        start_date: today,
        finish_date: today,
        rating: ratingVal || null
      });
    }
  };

  const onClickPlanned = async () => {
    const mediaItem = await ensureLocalMedia();
    if (mediaItem) {
      const newStatus = localMedia?.status === 'planned' ? null : 'planned';
      await handleUpdate(mediaItem.id, { status: newStatus });
    }
  };

  const displayStatus = localMedia?.status || null;
  const displayRating = localMedia?.rating || null;

  const modalOverlayStyle = {
    position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex', justifyContent: 'center', alignItems: 'center'
  };
  const modalBoxStyle = {
    backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
    padding: '20px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '15px'
  };
  const inputStyle = {
    backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none'
  };
  const labelStyle = { color: '#94a3b8', fontSize: '13px', marginBottom: '4px' };

  return (
    <>
      <div style={styles.actionPanel}>
        {(type === 'series' || type === 'season') && (
          <button style={styles.actionItem} onClick={onClickWatching}>
            <div style={{ ...styles.actionIconCircle, borderColor: displayStatus === 'watching' ? '#38bdf8' : '#444' }}>
              <Eye size={20} color={displayStatus === 'watching' ? '#38bdf8' : '#a3a3a3'} />
            </div>
            <span style={{ ...styles.actionLabel, color: displayStatus === 'watching' ? '#38bdf8' : '#a3a3a3' }}>
              Дивлюсь
            </span>
          </button>
        )}
        <button style={styles.actionItem} onClick={() => onClickCompletedOrRating(true)}>
          <div style={{ ...styles.actionIconCircle, borderColor: displayRating !== null && displayRating !== undefined ? '#2ecc71' : '#444' }}>
            <Star size={20} color={displayRating !== null && displayRating !== undefined ? '#2ecc71' : '#a3a3a3'} fill={displayRating !== null && displayRating !== undefined ? '#2ecc71' : 'none'} />
          </div>
          <span style={{ ...styles.actionLabel, color: displayRating !== null && displayRating !== undefined ? '#2ecc71' : '#a3a3a3' }}>
            {displayRating !== null && displayRating !== undefined ? `${displayRating} / 5` : 'Оцінити'}
          </span>
        </button>
        <button style={styles.actionItem} onClick={() => onClickCompletedOrRating(false)}>
          <div style={{ ...styles.actionIconCircle, borderColor: displayStatus === 'completed' ? '#2ecc71' : '#444' }}>
            <Check size={20} color={displayStatus === 'completed' ? '#2ecc71' : '#a3a3a3'} />
          </div>
          <span style={{ ...styles.actionLabel, color: displayStatus === 'completed' ? '#2ecc71' : '#a3a3a3' }}>
            Переглянуто
          </span>
        </button>
        {type !== 'episode' && (
          <button style={styles.actionItem} onClick={onClickPlanned}>
            <div style={{ ...styles.actionIconCircle, borderColor: displayStatus === 'planned' ? '#facc15' : '#444' }}>
              <Plus size={20} color={displayStatus === 'planned' ? '#facc15' : '#a3a3a3'} />
            </div>
            <span style={{ ...styles.actionLabel, color: displayStatus === 'planned' ? '#facc15' : '#a3a3a3' }}>
              У планах
            </span>
          </button>
        )}
      </div>

      {modalState.isOpen && (
        <div style={modalOverlayStyle}>
          {modalState.mode === 'select_action' && (
            <div style={modalBoxStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff' }}>Дії з переглядом</h3>
                <button onClick={() => setModalState({ isOpen: false })} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18}/></button>
              </div>
              <button style={{...inputStyle, background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => openModal('new', modalState.actionType)}>
                Додати новий перегляд
              </button>
              <button style={{...inputStyle, background: '#334155', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => openModal('edit_last', modalState.actionType)}>
                Редагувати останній
              </button>
              <button style={{...inputStyle, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', border: '1px solid rgba(239, 68, 68, 0.3)'}} onClick={deleteLastLog}>
                Видалити останній
              </button>
            </div>
          )}

          {(modalState.mode === 'new' || modalState.mode === 'edit_last') && (
            <div style={modalBoxStyle}>
              <h3 style={{ marginTop: 0, color: '#fff', marginBottom: '5px' }}>
                {modalState.mode === 'new' ? 'Новий перегляд' : 'Редагувати перегляд'}
              </h3>
              <form onSubmit={submitModal} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Дата початку</label>
                  <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} style={inputStyle} />
                </div>
                
                {modalState.actionType !== 'watching' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Дата завершення</label>
                    <input type="date" value={formData.finish_date} onChange={e => setFormData({...formData, finish_date: e.target.value})} style={inputStyle} />
                  </div>
                )}

                {modalState.actionType !== 'watching' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Оцінка (0 - 5)</label>
                    <input type="number" step="0.5" min="0" max="5" value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value})} style={inputStyle} />
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