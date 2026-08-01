// frontend/src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Film, Tv, Star, Plus, Trash2, X, CalendarCheck, LayoutGrid, Home as HomeIcon, Clock, Activity, List, Pen, ArrowLeft, MinusCircle } from 'lucide-react';
import { MediaGlobalStyles } from '../styles/mediaDetailStyles';

export default function Home() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mediaList, setMediaList] = useState([]);
  const [customLists, setCustomLists] = useState([]);
  
  const [activeListView, setActiveListView] = useState(null);
  const [listMedia, setListMedia] = useState([]);

  const [loading, setLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [isListSearchOpen, setIsListSearchOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [editingListId, setEditingListId] = useState(null);
  const [listFormData, setListFormData] = useState({ name: '', description: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '/api/media';
      if (activeTab !== 'all' && activeTab !== 'dashboard' && activeTab !== 'lists') {
        url += `?type=${activeTab}`;
      }
      
      const [mediaRes, listsRes] = await Promise.all([
        fetch(url),
        fetch('/api/lists')
      ]);

      const mediaJson = await mediaRes.json();
      const listsJson = await listsRes.json();

      if (mediaJson.data) setMediaList(mediaJson.data);
      if (listsJson.data) setCustomLists(listsJson.data);
    } catch (err) {
      console.error('Помилка завантаження даних:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchListItems = async (listId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lists/${listId}/items`);
      const json = await res.json();
      if (json.data) setListMedia(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setActiveListView(null);
  }, [activeTab]);

  useEffect(() => {
    if (activeListView && activeListView !== 'planned') {
      fetchListItems(activeListView);
    }
  }, [activeListView]);

  const handleSearchTMDB = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/external/tmdb/search?query=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      if (json.data) setSearchResults(json.data);
    } catch (err) {
      console.error('Помилка пошуку TMDB:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchResultClick = (result) => {
    setIsSearchOpen(false);
    navigate(`/media/${result.media_type}/${result.tmdb_id}`);
  };

  const handleAddToListFromSearch = async (result) => {
    if (!activeListView) return;

    try {
      const extId = `${result.media_type === 'series' ? 'tv' : 'movie'}_${result.tmdb_id}`;
      let mediaId = null;

      const checkRes = await fetch(`/api/media/external/${extId}`);
      if (checkRes.ok) {
        const checkJson = await checkRes.json();
        if (checkJson.data) mediaId = checkJson.data.id;
      }

      if (!mediaId) {
        const createRes = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: result.title,
            media_type: result.media_type,
            external_id: extId,
            tmdb_id: result.tmdb_id,
            poster_path: result.poster_path ? result.poster_path.replace('https://image.tmdb.org/t/p/w500', '') : null,
            release_date: result.release_date
          })
        });
        const createJson = await createRes.json();
        if (createJson.data) mediaId = createJson.data.id;
      }

      if (mediaId) {
        await fetch(`/api/lists/${activeListView}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media_id: mediaId })
        });
        fetchListItems(activeListView);
        setIsListSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (e) {
      console.error("Помилка додавання до списку:", e);
    }
  };

  const handleUpdateItem = async (e, id, updates) => {
    e.stopPropagation(); 
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) fetchData();
    } catch (err) {}
  };

  const handleDeleteItem = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Дійсно видалити цей запис повністю з бази даних?')) return;
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        if (activeListView && activeListView !== 'planned') fetchListItems(activeListView);
      }
    } catch (err) {}
  };

  const handleRemoveFromList = async (e, mediaId) => {
    e.stopPropagation();
    if (!activeListView || activeListView === 'planned') return;
    
    try {
      await fetch(`/api/lists/${activeListView}/items/${mediaId}`, { method: 'DELETE' });
      fetchListItems(activeListView);
    } catch (err) {}
  };

  const openListModal = (list = null) => {
    if (list) {
      setEditingListId(list.id);
      setListFormData({ name: list.name, description: list.description || '' });
    } else {
      setEditingListId(null);
      setListFormData({ name: '', description: '' });
    }
    setIsListModalOpen(true);
  };

  const submitListForm = async (e) => {
    e.preventDefault();
    if (!listFormData.name.trim()) return;

    try {
      const method = editingListId ? 'PATCH' : 'POST';
      const url = editingListId ? `/api/lists/${editingListId}` : '/api/lists';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listFormData)
      });
      
      if (res.ok) {
        setIsListModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error('Помилка збереження списку:', err);
    }
  };

  const handleDeleteList = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Дійсно видалити цей список? (Усі медіа всередині залишаться у вашій базі)')) return;
    try {
      const res = await fetch(`/api/lists/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {}
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('uk-UA');
  };

  const currentlyWatching = mediaList.filter(m => m.status === 'watching');
  const recentlyCompleted = mediaList
    .filter(m => m.status === 'completed')
    .sort((a, b) => new Date(b.finish_date || 0) - new Date(a.finish_date || 0))
    .slice(0, 8);
  const plannedItems = mediaList.filter(m => m.status === 'planned');

  const renderMediaGrid = (items, isInsideList = false) => (
    <div className="home-grid">
      {items.map(item => {
        const posterUrl = item.poster_path 
          ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`)
          : null;

        const year = item.release_date ? item.release_date.split('-')[0] : null;
        const seasons = item.media_type === 'series' && item.total_seasons ? `${item.total_seasons} сезонів` : null;
        const subtitleText = [year, seasons].filter(Boolean).join(' • ') || 'Невідомо';

        return (
          <div 
            key={item.id} 
            className="home-media-card"
            onClick={() => navigate(`/media/${item.media_type}/${item.tmdb_id}`)}
          >
            <div className="home-poster-wrapper">
              {posterUrl ? (
                <img src={posterUrl} alt={item.title} className="home-poster" loading="lazy" />
              ) : (
                <div className="home-no-poster">Немає постера</div>
              )}
              <div className="home-type-badge">
                {item.media_type === 'movie' ? <Film size={14} /> : <Tv size={14} />}
              </div>
              
              {isInsideList && activeListView !== 'planned' && (
                <button 
                  className="remove-from-list-btn" 
                  title="Прибрати зі списку"
                  onClick={(e) => handleRemoveFromList(e, item.id)}
                >
                  <MinusCircle size={18} />
                </button>
              )}
            </div>
            
            <div className="home-card-content">
              <div className="home-card-header">
                <h3 className="home-title" title={item.title}>{item.title}</h3>
                {item.status === 'completed' && item.finish_date ? (
                  <p className="home-date-text"><CalendarCheck size={12} style={{marginRight: '4px'}}/>{formatDate(item.finish_date)}</p>
                ) : (
                  <p className="home-subtitle">{subtitleText}</p>
                )}
              </div>
              
              <div className="home-card-actions">
                <select 
                  value={item.status || ''} 
                  onChange={(e) => handleUpdateItem(e, item.id, { status: e.target.value || null })}
                  onClick={(e) => e.stopPropagation()}
                  className="home-status-select"
                >
                  <option value="">Не вибрано</option>
                  <option value="planned">У планах</option>
                  <option value="watching">Переглядаю</option>
                  <option value="completed">Переглянуто</option>
                  <option value="on_hold">Відкладено</option>
                  <option value="dropped">Покинуто</option>
                </select>

                <div className="home-bottom-actions">
                  <div className="home-rating-row" onClick={(e) => e.stopPropagation()}>
                    <Star size={16} color={item.rating ? "#facc15" : "#475569"} fill={item.rating ? "#facc15" : "none"} />
                    <input 
                      type="number" min="0" max="5" step="0.5"
                      value={item.rating || ''} 
                      placeholder="-"
                      onChange={(e) => handleUpdateItem(e, item.id, { rating: parseFloat(e.target.value) || null })}
                      className="home-rating-input"
                    />
                  </div>
                  <button 
                    className="home-delete-btn"
                    onClick={(e) => handleDeleteItem(e, item.id)} 
                    title="Видалити повністю з БД"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="home-container">
      <MediaGlobalStyles dominantColor="56, 189, 248" />

      <header className="home-header">
        <h1 className="home-logo">
          <LayoutGrid size={28} color="#38bdf8" />
          Media Tracker
        </h1>
        {activeTab !== 'lists' || activeListView === null ? (
            <button className="home-add-btn" onClick={() => setIsSearchOpen(true)}>
              <Plus size={18} /> Пошук
            </button>
        ) : null}
      </header>

      <div className="main-tabs-wrapper" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '40px' }}>
        <div className="main-tabs-container custom-scroll">
          <button className={`main-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><HomeIcon size={16} /> Головна</span>
          </button>
          <button className={`main-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Усе медіа</button>
          <button className={`main-tab ${activeTab === 'movie' ? 'active' : ''}`} onClick={() => setActiveTab('movie')}>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Film size={16} /> Фільми</span>
          </button>
          <button className={`main-tab ${activeTab === 'series' ? 'active' : ''}`} onClick={() => setActiveTab('series')}>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Tv size={16} /> Серіали</span>
          </button>
          <button className={`main-tab ${activeTab === 'lists' ? 'active' : ''}`} onClick={() => setActiveTab('lists')}>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><List size={16} /> Списки</span>
          </button>
        </div>
      </div>

      <main>
        {loading ? (
          <div className="home-loading-state">
            <div className="home-spinner"></div>
            <p>Завантаження...</p>
          </div>
        ) : activeTab === 'lists' ? (
          
          activeListView ? (
             <div className="home-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <button 
                      className="home-add-btn" 
                      style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', marginBottom: '16px', padding: '6px 12px' }} 
                      onClick={() => setActiveListView(null)}
                    >
                      <ArrowLeft size={16} /> Назад до списків
                    </button>
                    <h2 className="home-section-title" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                      {activeListView === 'planned' ? 'У планах' : customLists.find(l => l.id === activeListView)?.name}
                    </h2>
                    {activeListView !== 'planned' && customLists.find(l => l.id === activeListView)?.description && (
                      <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '14px' }}>
                        {customLists.find(l => l.id === activeListView)?.description}
                      </p>
                    )}
                  </div>
                  
                  {activeListView !== 'planned' && (
                    <button className="home-add-btn" style={{ background: '#38bdf8', color: '#000', border: 'none' }} onClick={() => setIsListSearchOpen(true)}>
                      <Plus size={18} /> Додати до списку
                    </button>
                  )}
                </div>

                {activeListView === 'planned' ? (
                  plannedItems.length > 0 ? renderMediaGrid(plannedItems, true) : <p className="home-empty-text">Список порожній.</p>
                ) : (
                  listMedia.length > 0 ? renderMediaGrid(listMedia, true) : <p className="home-empty-text">Цей список поки що порожній. Додайте щось, щоб не забути!</p>
                )}
             </div>
          ) : (
            <div className="home-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 className="home-section-title" style={{ marginBottom: 0, borderBottom: 'none' }}>
                  <List size={24} color="#38bdf8" /> Ваші списки
                </h2>
                <button 
                  className="home-add-btn" 
                  style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }} 
                  onClick={() => openListModal()}
                >
                  <Plus size={18} /> Створити список
                </button>
              </div>

              <div className="lists-grid">
                <div className="list-card system-list" onClick={() => setActiveListView('planned')}>
                  <div className="list-icon"><CalendarCheck size={28} color="#facc15" /></div>
                  <div className="list-info">
                    <h3 className="list-name">У планах</h3>
                    <p className="list-desc">Віртуальний список медіа, які ви маєте статус "planned".</p>
                    <span className="list-count" style={{ color: '#facc15', background: 'rgba(250, 204, 21, 0.1)' }}>
                      {plannedItems.length} елементів
                    </span>
                  </div>
                </div>

                {customLists.map(list => (
                  <div key={list.id} className="list-card" onClick={() => setActiveListView(list.id)}>
                    <div className="list-icon"><List size={28} color="#38bdf8" /></div>
                    <div className="list-info">
                      <h3 className="list-name">{list.name}</h3>
                      {list.description && <p className="list-desc">{list.description}</p>}
                      <span className="list-count">{list.item_count} елементів</span>
                    </div>
                    <div className="list-actions" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openListModal(list)} title="Редагувати"><Pen size={16}/></button>
                      <button onClick={(e) => handleDeleteList(e, list.id)} className="delete" title="Видалити"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )

        ) : mediaList.length === 0 ? (
          <div className="home-empty-state">
            <Film size={48} color="#334155" style={{ marginBottom: '16px' }} />
            <h2 style={{ color: '#fff', marginBottom: '10px' }}>Ваш список порожній</h2>
            <p style={{ marginBottom: '20px' }}>Натисніть «Додати медіа», щоб знайти нові фільми чи серіали.</p>
            <button className="home-add-btn" style={{ background: '#38bdf8', color: '#000' }} onClick={() => setIsSearchOpen(true)}>
              <Search size={18} /> Знайти медіа
            </button>
          </div>
        ) : activeTab === 'dashboard' ? (
          <div>
            <div className="home-section">
              <h2 className="home-section-title"><Activity size={20} color="#38bdf8" /> Зараз у процесі</h2>
              {currentlyWatching.length > 0 ? renderMediaGrid(currentlyWatching) : <p className="home-empty-text">Ви зараз нічого не переглядаєте.</p>}
            </div>

            <div className="home-section">
              <h2 className="home-section-title"><Clock size={20} color="#2ecc71" /> Нещодавно завершено</h2>
              {recentlyCompleted.length > 0 ? renderMediaGrid(recentlyCompleted) : <p className="home-empty-text">Тут будуть відображатись ваші останні переглянуті медіа.</p>}
            </div>
          </div>
        ) : (
          renderMediaGrid(mediaList)
        )}
      </main>

      {/* Модальне вікно редагування списку */}
      {isListModalOpen && (
        <div className="home-modal-overlay" onClick={() => setIsListModalOpen(false)}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="home-modal-header">
              <h2 className="home-modal-title">{editingListId ? 'Редагувати список' : 'Новий список'}</h2>
              <button className="home-close-btn" onClick={() => setIsListModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={submitListForm} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Назва списку *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Наприклад: Топ фільмів на вечір" 
                  value={listFormData.name} 
                  onChange={(e) => setListFormData({...listFormData, name: e.target.value})} 
                  className="home-search-input"
                  autoFocus 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Опис (необов'язково)</label>
                <textarea 
                  placeholder="Короткий опис цього списку..." 
                  value={listFormData.description} 
                  onChange={(e) => setListFormData({...listFormData, description: e.target.value})} 
                  className="home-search-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="home-search-submit-btn" style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8' }} onClick={() => setIsListModalOpen(false)}>
                  Скасувати
                </button>
                <button type="submit" className="home-search-submit-btn" style={{ background: '#38bdf8', color: '#000' }}>
                  Зберегти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальне вікно загального пошуку TMDB */}
      {isSearchOpen && (
        <div className="home-modal-overlay" onClick={() => setIsSearchOpen(false)}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <div className="home-modal-header">
              <h2 className="home-modal-title">Пошук у базі TMDB</h2>
              <button className="home-close-btn" onClick={() => setIsSearchOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSearchTMDB} className="home-search-form">
              <div className="home-search-input-wrapper">
                <Search size={20} color="#64748b" className="home-search-icon" />
                <input 
                  type="text" 
                  placeholder="Введіть назву фільму чи серіалу..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="home-search-input"
                  autoFocus 
                />
              </div>
              <button type="submit" className="home-search-submit-btn" disabled={searching}>
                {searching ? 'Шукаю...' : 'Знайти'}
              </button>
            </form>

            <div className="home-search-results custom-scroll">
              {searchResults.length === 0 && !searching && searchQuery && (
                <p style={{ textAlign: 'center', color: '#64748b', marginTop: '20px' }}>Нічого не знайдено.</p>
              )}
              {searchResults.map(result => (
                <div 
                  key={result.tmdb_id} 
                  className="home-search-item"
                  onClick={() => handleSearchResultClick(result)}
                >
                  <img src={result.poster_path || 'https://via.placeholder.com/50x75?text=Немає'} alt={result.title} className="home-search-poster" loading="lazy" />
                  <div className="home-search-info">
                    <h4 className="home-search-title">{result.title}</h4>
                    <div className="home-search-meta">
                      <span className="home-search-year">{result.release_date?.split('-')[0] || 'Рік невідомий'}</span>
                      <span className="home-search-type-badge">
                        {result.media_type === 'movie' ? 'Фільм' : 'Серіал'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Модальне вікно пошуку TMDB (ДЛЯ СПИСКІВ) */}
      {isListSearchOpen && (
        <div className="home-modal-overlay" onClick={() => setIsListSearchOpen(false)}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <div className="home-modal-header">
              <h2 className="home-modal-title">Знайти та додати до списку</h2>
              <button className="home-close-btn" onClick={() => setIsListSearchOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSearchTMDB} className="home-search-form">
              <div className="home-search-input-wrapper">
                <Search size={20} color="#64748b" className="home-search-icon" />
                <input 
                  type="text" 
                  placeholder="Що шукаємо?" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="home-search-input"
                  autoFocus 
                />
              </div>
              <button type="submit" className="home-search-submit-btn" disabled={searching}>
                {searching ? 'Шукаю...' : 'Шукати'}
              </button>
            </form>

            <div className="home-search-results custom-scroll">
              {searchResults.length === 0 && !searching && searchQuery && (
                <p style={{ textAlign: 'center', color: '#64748b', marginTop: '20px' }}>Нічого не знайдено.</p>
              )}
              {searchResults.map(result => (
                <div 
                  key={result.tmdb_id} 
                  className="home-search-item"
                  onClick={() => handleAddToListFromSearch(result)}
                >
                  <img src={result.poster_path || 'https://via.placeholder.com/50x75?text=Немає'} alt={result.title} className="home-search-poster" loading="lazy" />
                  <div className="home-search-info">
                    <h4 className="home-search-title">{result.title}</h4>
                    <div className="home-search-meta">
                      <span className="home-search-year">{result.release_date?.split('-')[0] || 'Рік невідомий'}</span>
                      <span className="home-search-type-badge">
                        {result.media_type === 'movie' ? 'Фільм' : 'Серіал'}
                      </span>
                    </div>
                  </div>
                  <div style={{ color: '#38bdf8', padding: '0 10px' }}>
                     <Plus size={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .home-container { background-color: #0a0a0a; color: #f3f4f6; min-height: 100vh; padding: 20px 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .home-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; max-width: 1200px; margin-left: auto; margin-right: auto; }
        .home-logo { font-size: 24px; margin: 0; color: #fff; display: flex; align-items: center; gap: 10px; font-weight: bold; }
        .home-add-btn { background: rgba(20, 20, 20, 0.85); border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 20px; font-size: 14px; font-weight: bold; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 4px 6px rgba(0,0,0,0.3); transition: all 0.2s ease; }
        .home-add-btn:hover { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border-color: #38bdf8; transform: translateY(-2px); }
        main { max-width: 1200px; margin: 0 auto; }
        .home-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
        .home-media-card { background-color: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .home-media-card:hover { transform: translateY(-4px); border-color: var(--dominant-color-strong, #38bdf8); box-shadow: 0 10px 20px rgba(0,0,0,0.6); }
        .home-poster-wrapper { position: relative; width: 100%; padding-top: 150%; background-color: #111; }
        .home-poster { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
        .home-no-poster { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #555; font-size: 14px; }
        .home-type-badge { position: absolute; top: 10px; right: 10px; background: rgba(10, 10, 10, 0.8); backdrop-filter: blur(4px); padding: 6px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; border: 1px solid rgba(255,255,255,0.1); }
        .remove-from-list-btn { position: absolute; top: 10px; left: 10px; background: rgba(0, 0, 0, 0.6); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(4px); }
        .remove-from-list-btn:hover { background: rgba(239, 68, 68, 0.8); color: #fff; border-color: #ef4444; }
        .home-card-content { padding: 16px; display: flex; flex-direction: column; flex-grow: 1; justify-content: space-between; }
        .home-card-header { margin-bottom: 16px; }
        .home-title { margin: 0 0 6px 0; font-size: 16px; font-weight: bold; line-height: 1.3; color: #fff; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .home-subtitle { margin: 0; font-size: 13px; color: #94a3b8; }
        .home-date-text { margin: 0; font-size: 13px; color: #2ecc71; display: flex; align-items: center; font-weight: bold; }
        .home-card-actions { display: flex; flex-direction: column; gap: 12px; }
        .home-status-select { background: #0a0a0a; color: #e5e5e5; border: 1px solid #333; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; width: 100%; appearance: none; transition: border-color 0.2s; }
        .home-status-select:focus { border-color: #38bdf8; outline: none; }
        .home-bottom-actions { display: flex; justify-content: space-between; align-items: center; }
        .home-rating-row { display: flex; align-items: center; gap: 8px; background: #0a0a0a; padding: 4px 8px; border-radius: 8px; border: 1px solid #333; }
        .home-rating-input { width: 40px; background: transparent; color: #fff; border: none; padding: 4px 0; text-align: center; font-size: 14px; font-weight: bold; }
        .home-rating-input:focus { outline: none; }
        .home-delete-btn { background: transparent; border: none; color: #64748b; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .home-delete-btn:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); border-radius: 6px; }
        .home-loading-state, .home-empty-state { text-align: center; padding: 80px 0; color: #94a3b8; display: flex; flex-direction: column; align-items: center; }
        .home-empty-text { color: #64748b; font-style: italic; font-size: 15px; }
        .home-spinner { width: 40px; height: 40px; border: 3px solid rgba(56, 189, 248, 0.2); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .home-section { margin-bottom: 40px; }
        .home-section-title { font-size: 22px; font-weight: bold; color: #fff; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid #2a2a2a; }
        .lists-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .list-card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px; padding: 20px; display: flex; gap: 16px; cursor: pointer; position: relative; transition: all 0.2s ease; }
        .list-card:hover { transform: translateY(-4px); border-color: #38bdf8; box-shadow: 0 10px 20px rgba(0,0,0,0.4); }
        .system-list:hover { border-color: #facc15; }
        .list-icon { background: rgba(255,255,255,0.05); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .list-info { display: flex; flex-direction: column; gap: 6px; flex-grow: 1; }
        .list-name { margin: 0; color: #fff; font-size: 16px; font-weight: 600; }
        .list-desc { margin: 0; color: #64748b; font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .list-count { color: #38bdf8; font-size: 12px; font-weight: bold; background: rgba(56, 189, 248, 0.1); padding: 2px 8px; border-radius: 6px; align-self: flex-start; margin-top: 4px; }
        .list-actions { position: absolute; top: 12px; right: 12px; display: flex; gap: 8px; opacity: 0; transition: opacity 0.2s; }
        .list-card:hover .list-actions { opacity: 1; }
        .list-actions button { background: rgba(0,0,0,0.5); border: none; color: #94a3b8; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .list-actions button:hover { color: #fff; background: #38bdf8; }
        .list-actions button.delete:hover { background: #ef4444; }
        .home-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: flex-start; padding-top: 80px; z-index: 1000; }
        .home-modal { background: #1a1a1a; width: 100%; max-width: 640px; border-radius: 16px; padding: 24px; max-height: 80vh; display: flex; flex-direction: column; border: 1px solid #2a2a2a; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .home-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .home-modal-title { margin: 0; font-size: 20px; font-weight: bold; color: #fff; }
        .home-close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; transition: color 0.2s; }
        .home-close-btn:hover { color: #fff; }
        .home-search-form { display: flex; gap: 12px; margin-bottom: 24px; }
        .home-search-input-wrapper { flex-grow: 1; position: relative; display: flex; align-items: center; }
        .home-search-icon { position: absolute; left: 12px; }
        .home-search-input { width: 100%; background: #0a0a0a; border: 1px solid #333; color: #fff; padding: 12px 12px 12px 40px; border-radius: 10px; font-size: 15px; transition: border-color 0.2s; }
        .home-search-input:focus { border-color: #38bdf8; outline: none; }
        textarea.home-search-input { padding-left: 12px; }
        .home-search-submit-btn { background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid #38bdf8; padding: 10px 24px; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 15px; transition: all 0.2s; }
        .home-search-submit-btn:hover:not(:disabled) { background: #38bdf8; color: #000; }
        .home-search-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .home-search-results { overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 8px; }
        .home-search-item { display: flex; align-items: center; gap: 16px; background: #0a0a0a; border: 1px solid #2a2a2a; padding: 12px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; }
        .home-search-item:hover { background: #1e293b; border-color: #38bdf8; }
        .home-search-poster { width: 56px; height: 84px; object-fit: cover; border-radius: 6px; }
        .home-search-info { flex-grow: 1; display: flex; flex-direction: column; gap: 6px; }
        .home-search-title { margin: 0; font-size: 16px; font-weight: bold; color: #fff; }
        .home-search-meta { display: flex; align-items: center; gap: 10px; }
        .home-search-year { color: #94a3b8; font-size: 14px; }
        .home-search-type-badge { background: #2a2a2a; color: #e2e8f0; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
      `}</style>
    </div>
  );
}