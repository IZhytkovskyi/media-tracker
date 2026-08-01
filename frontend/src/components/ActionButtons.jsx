// frontend/src/components/ActionButtons.jsx
import React, { useState } from 'react';
import { Star, Check, Eye, X, List as ListIcon } from 'lucide-react';
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
  
  const [allLists, setAllLists] = useState([]);
  const [mediaLists, setMediaLists] = useState([]);

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
    if (!lastLog || !window.confirm('Дійсно видалити останній запис?')) return;
    try {
      await fetch(`/api/media/logs/${lastLog.id}`, { method: 'DELETE' });
      await handleUpdate(localMedia.id, {}); 
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

    if (type === 'season' || type === 'series') {
      if (isCompleted || hasLogs) {
        setModalState({ isOpen: true, mode: 'select_action', actionType });
      } else {
        openModal('new', actionType);
      }
      return;
    }

    if (isCompleted || hasLogs) {
      setModalState({ isOpen: true, mode: 'select_action', actionType });
      return;
    }

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

  const openListsModal = async () => {
    try {
      const res = await fetch('/api/lists');
      const lists = (await res.json()).data;
      setAllLists(lists);

      if (localMedia) {
        const memRes = await fetch(`/api/media/${localMedia.id}/lists`);
        setMediaLists((await memRes.json()).data);
      } else {
        setMediaLists([]);
      }
      setModalState({ isOpen: true, mode: 'lists' });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleList = async (listId) => {
    const mediaItem = await ensureLocalMedia();
    if (!mediaItem) return;

    if (listId === 'planned') {
      const newStatus = localMedia?.status === 'planned' ? null : 'planned';
      await handleUpdate(mediaItem.id, { status: newStatus });
      return;
    }

    const isInList = mediaLists.includes(listId);
    try {
      if (isInList) {
        await fetch(`/api/lists/${listId}/items/${mediaItem.id}`, { method: 'DELETE' });
        setMediaLists(prev => prev.filter(id => id !== listId));
      } else {
        await fetch(`/api/lists/${listId}/items`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media_id: mediaItem.id })
        });
        setMediaLists(prev => [...prev, listId]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const displayStatus = localMedia?.status || null;
  const displayRating = localMedia?.rating || null;
  const isInAnyCustomList = mediaLists.length > 0;

  const modalOverlayStyle = {
    position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)'
  };

  const modalBoxStyle = {
    backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
    padding: '20px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '15px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
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
              Переглядаю
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
          <button style={styles.actionItem} onClick={openListsModal}>
            <div style={{ ...styles.actionIconCircle, borderColor: (displayStatus === 'planned' || isInAnyCustomList) ? '#facc15' : '#444' }}>
              <ListIcon size={20} color={(displayStatus === 'planned' || isInAnyCustomList) ? '#facc15' : '#a3a3a3'} />
            </div>
            <span style={{ ...styles.actionLabel, color: (displayStatus === 'planned' || isInAnyCustomList) ? '#facc15' : '#a3a3a3' }}>
              Списки
            </span>
          </button>
        )}
      </div>

      {modalState.isOpen && (
        <div style={modalOverlayStyle} onClick={() => setModalState({ isOpen: false })}>
          
          {modalState.mode === 'lists' && (
            <div style={{...modalBoxStyle, minWidth: '280px'}} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Додати до списку</h3>
                <button onClick={() => setModalState({ isOpen: false })} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20}/></button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc', cursor: 'pointer', padding: '8px', background: 'rgba(250, 204, 21, 0.05)', borderRadius: '8px', border: '1px solid rgba(250, 204, 21, 0.2)' }}>
                  <input 
                    type="checkbox" 
                    checked={displayStatus === 'planned'} 
                    onChange={() => toggleList('planned')} 
                    style={{ width: '18px', height: '18px', accentColor: '#facc15' }}
                  />
                  <span style={{ fontWeight: '600', color: '#facc15' }}>У планах</span>
                </label>

                <div style={{ height: '1px', background: '#334155', margin: '4px 0' }} />

                {allLists.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', margin: '10px 0' }}>У вас ще немає кастомних списків. Створіть їх на Головній сторінці.</p>
                ) : (
                  allLists.map(list => (
                    <label key={list.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc', cursor: 'pointer', padding: '4px 8px' }}>
                      <input 
                        type="checkbox" 
                        checked={mediaLists.includes(list.id)} 
                        onChange={() => toggleList(list.id)}
                        style={{ width: '18px', height: '18px', accentColor: '#38bdf8' }}
                      />
                      <span>{list.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {modalState.mode === 'select_action' && (
            <div style={modalBoxStyle} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff' }}>Дія з записом</h3>
                <button onClick={() => setModalState({ isOpen: false })} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18}/></button>
              </div>
              <button style={{...inputStyle, background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => openModal('new', modalState.actionType)}>
                Створити новий запис
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
            <div style={modalBoxStyle} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <h3 style={{ margin: 0, color: '#fff' }}>
                  {modalState.mode === 'new' ? 'Новий запис' : 'Редагувати запис'}
                </h3>
                <button onClick={() => setModalState({ isOpen: false })} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18}/></button>
              </div>
              <form onSubmit={submitModal} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Початок</label>
                  <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} style={inputStyle} />
                </div>
                
                {modalState.actionType !== 'watching' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Кінець</label>
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