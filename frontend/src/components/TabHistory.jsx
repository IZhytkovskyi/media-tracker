// frontend/src/components/TabHistory.jsx
import React, { useState } from 'react';
import { Plus, X, Trash2, Clock, Calendar, Tv, Film, Pen } from 'lucide-react';
import { styles } from '../styles/mediaDetailStyles';
import { api } from '../utils/api';
import { getLocalDateString } from '../utils';

export default function TabHistory({ localMedia, logs, onHistoryChange }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [customDate, setCustomDate] = useState(getLocalDateString());
  const [customTime, setCustomTime] = useState('12:00');

  const groupedLogs = (logs || []).reduce((acc, log) => {
    const dateObj = new Date(log.watched_at || new Date());
    const dateStr = dateObj.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(log);
    return acc;
  }, {});

  const handleOpenAddModal = () => {
    setEditingLogId(null);
    setCustomDate(getLocalDateString());
    setCustomTime(new Date().toTimeString().slice(0, 5));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (log) => {
    setEditingLogId(log.id);
    const d = new Date(log.watched_at);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    setCustomDate(`${yyyy}-${mm}-${dd}`);
    setCustomTime(d.toTimeString().slice(0, 5));
    setIsModalOpen(true);
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!localMedia && !editingLogId) return;
    
    const isoString = new Date(`${customDate}T${customTime}:00`).toISOString();
    
    try {
      if (editingLogId) {
        await api.updateHistoryRecord(editingLogId, { watched_at: isoString });
      } else {
        await api.addToHistory(localMedia.id, { watched_at: isoString });
      }
      setIsModalOpen(false);
      setEditingLogId(null);
      if (onHistoryChange) onHistoryChange();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRecord = async (historyId) => {
    if (!window.confirm('Видалити цей перегляд з історії?')) return;
    try {
      await api.removeHistoryRecord(historyId);
      if (onHistoryChange) onHistoryChange();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={styles.sectionTitle} className="mb-0">Історія переглядів</h3>
        <button onClick={handleOpenAddModal} style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s' }}>
          <Plus size={16} /> Додати перегляд
        </button>
      </div>

      {(!logs || logs.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <Clock size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: '15px' }}>Ви ще не дивилися це.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {Object.entries(groupedLogs).map(([dateStr, dayLogs]) => (
            <div key={dateStr}>
              <h4 style={{ color: '#94a3b8', fontSize: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={14} /> {dateStr}
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dayLogs.map((log) => {
                  const watchDate = new Date(log.watched_at);
                  const timeStr = watchDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
                  const isEpisode = log.media_type === 'episode';
                  
                  return (
                    <div key={log.id} style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      backgroundColor: '#1a1a1a', padding: '12px 16px', borderRadius: '10px', 
                      border: '1px solid #2a2a2a', transition: 'border-color 0.2s' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold', minWidth: '45px' }}>
                          {timeStr}
                        </div>
                        <div style={{ backgroundColor: '#2a2a2a', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isEpisode ? <Tv size={16} color="#38bdf8" /> : <Film size={16} color="#a3a3a3" />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>
                            {isEpisode ? `${log.media_title}` : (localMedia?.title || 'Фільм')}
                          </span>
                          {isEpisode && (
                            <span style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}>
                              Сезон {log.season} Епізод {log.episode}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          onClick={() => handleOpenEditModal(log)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#64748b', transition: 'color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
                          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                          title="Редагувати перегляд"
                        >
                          <Pen size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRecord(log.id)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#64748b', transition: 'color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                          title="Видалити перегляд"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '350px', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#38bdf8" /> 
                {editingLogId ? 'Редагувати перегляд' : 'Додати перегляд'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18}/></button>
            </div>
            
            <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: '#94a3b8', fontSize: '13px' }}>Дата перегляду</label>
                <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: '#94a3b8', fontSize: '13px' }}>Час перегляду</label>
                <input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }} required />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: '1px solid #444', color: '#ccc', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Скасувати</button>
                <button type="submit" style={{ background: '#38bdf8', border: 'none', color: '#000', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}