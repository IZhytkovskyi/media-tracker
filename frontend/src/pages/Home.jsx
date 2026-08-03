// frontend/src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Film, Tv, Plus, X, CalendarCheck, LayoutGrid, Home as HomeIcon, Clock, Activity, List, Pen, ArrowLeft, Calendar } from 'lucide-react';
import { MediaGlobalStyles } from '../styles/mediaDetailStyles';
import MediaCard from '../components/MediaCard';
import { api } from '../utils/api';
import { useToast } from '../components/ToastContext';

export default function Home() {
  const navigate = useNavigate();
  const { success, error } = useToast();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mediaList, setMediaList] = useState([]);
  const [upcomingMedia, setUpcomingMedia] = useState([]);
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
      let params = '';
      if (activeTab !== 'all' && activeTab !== 'dashboard' && activeTab !== 'lists') params = `?type=${activeTab}`;
      
      const [mediaRes, listsRes, upcomingRes] = await Promise.all([
        api.getMedia(params),
        api.getLists(),
        api.getUpcoming()
      ]);

      setMediaList(mediaRes.data || []);
      setCustomLists(listsRes.data || []);
      setUpcomingMedia(upcomingRes.data || []);
    } catch (err) {
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchListItems = async (listId) => {
    setLoading(true);
    try {
      const res = await api.getListItems(listId);
      setListMedia(res.data || []);
    } catch (err) {
      error(err.message);
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
      const res = await api.searchTMDB(searchQuery);
      setSearchResults(res.data || []);
    } catch (err) {
      error(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAddToListFromSearch = async (result) => {
    if (!activeListView) return;
    try {
      const extId = `${result.media_type === 'series' ? 'tv' : 'movie'}_${result.tmdb_id}`;
      let mediaId = null;

      try {
        const checkRes = await api.getMediaByExternalId(extId);
        mediaId = checkRes.data.id;
      } catch (e) {
        const createRes = await api.createMedia({
          title: result.title,
          media_type: result.media_type,
          external_id: extId,
          tmdb_id: result.tmdb_id,
          poster_path: result.poster_path ? result.poster_path.replace('https://image.tmdb.org/t/p/w500', '') : null,
          release_date: result.release_date
        });
        mediaId = createRes.data.id;
      }

      await api.addToList(activeListView, mediaId);
      success('Додано до списку');
      fetchListItems(activeListView);
      setIsListSearchOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      error(err.message);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updateMedia(id, { status });
      fetchData();
      success('Статус оновлено');
    } catch (err) { error(err.message); }
  };

  const handleUpdateRating = async (id, ratingVal) => {
    const rating = parseFloat(ratingVal) || null;
    try {
      await api.updateMedia(id, { rating });
      fetchData();
      success('Оцінку збережено');
    } catch (err) { error(err.message); }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Видалити цей елемент?')) return;
    try {
      await api.deleteMedia(id);
      success('Видалено');
      fetchData();
      if (activeListView && activeListView !== 'planned') fetchListItems(activeListView);
    } catch (err) { error(err.message); }
  };

  const handleRemoveFromList = async (mediaId) => {
    if (!activeListView || activeListView === 'planned') return;
    try {
      await api.removeFromList(activeListView, mediaId);
      success('Вилучено зі списку');
      fetchListItems(activeListView);
    } catch (err) { error(err.message); }
  };

  const handleMarkNextEpisode = async (seriesId) => {
    try {
        await api.watchNextEpisode(seriesId);
        success('Серію відмічено як переглянуту!');
        fetchData();
    } catch (err) { error(err.message); }
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
      if (editingListId) {
        await api.updateList(editingListId, listFormData);
        success('Список оновлено');
      } else {
        await api.createList(listFormData);
        success('Список створено');
      }
      setIsListModalOpen(false);
      fetchData();
    } catch (err) { error(err.message); }
  };

  const handleDeleteList = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Видалити цей список?')) return;
    try {
      await api.deleteList(id);
      success('Список видалено');
      fetchData();
    } catch (err) { error(err.message); }
  };

  const handleCardClick = (item) => {
    if (item.media_type === 'episode') {
      const sId = item.series_tmdb_id || item.tmdb_id;
      navigate(`/media/series/${sId}/season/${item.season}/episode/${item.episode}`);
    } else if (item.media_type === 'season') {
      const sId = item.series_tmdb_id || item.tmdb_id;
      navigate(`/media/series/${sId}/season/${item.season}`);
    } else {
      navigate(`/media/${item.media_type}/${item.tmdb_id}`);
    }
  };

  const currentlyWatching = mediaList.filter(m => m.status === 'watching' && !['season', 'episode'].includes(m.media_type));
  const recentlyCompleted = mediaList.filter(m => m.status === 'completed').sort((a, b) => new Date(b.finish_date || 0) - new Date(a.finish_date || 0)).slice(0, 10);
  const plannedItems = mediaList.filter(m => m.status === 'planned');

  const renderGrid = (items, options = {}) => (
    <div className="home-grid">
      {items.map(item => {
        const isSeriesType = ['series', 'season', 'episode'].includes(item.media_type);
        return <MediaCard key={item.id} item={item} options={{ ...options, isWide: isSeriesType }} onCardClick={handleCardClick} onUpdateStatus={handleUpdateStatus} onUpdateRating={handleUpdateRating} onDelete={handleDeleteItem} onRemoveFromList={handleRemoveFromList} onMarkNextEpisode={handleMarkNextEpisode} />
      })}
    </div>
  );

  const renderWatchingGrid = (items, options = {}) => (
    <div className="home-grid">
      {items.map(item => <MediaCard key={item.id} item={item} options={{ ...options, isWatching: true, isWide: true }} onCardClick={handleCardClick} onUpdateStatus={handleUpdateStatus} onUpdateRating={handleUpdateRating} onDelete={handleDeleteItem} onRemoveFromList={handleRemoveFromList} onMarkNextEpisode={handleMarkNextEpisode} />)}
    </div>
  );

  const renderHorizontalScroll = (items, options = {}) => (
    <div className="home-horizontal-scroll custom-scroll">
      {items.map(item => {
        const isSeriesType = ['series', 'season', 'episode'].includes(item.media_type);
        return (
          <div key={item.id} className={isSeriesType ? 'scroll-item-wide' : 'scroll-item-narrow'}>
            <MediaCard item={item} options={{ ...options, isWide: isSeriesType }} onCardClick={handleCardClick} onUpdateStatus={handleUpdateStatus} onUpdateRating={handleUpdateRating} onDelete={handleDeleteItem} onRemoveFromList={handleRemoveFromList} onMarkNextEpisode={handleMarkNextEpisode} />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="home-container">
      <MediaGlobalStyles dominantColor="56, 189, 248" />
      <header className="home-header">
        <h1 className="home-logo"><LayoutGrid size={28} color="#38bdf8" /> Media Tracker</h1>
        {activeTab !== 'lists' || activeListView === null ? (
            <button className="home-add-btn" onClick={() => setIsSearchOpen(true)}><Plus size={18} /> Додати</button>
        ) : null}
      </header>

      <div className="main-tabs-wrapper" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '40px' }}>
        <div className="main-tabs-container custom-scroll">
          <button className={`main-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><HomeIcon size={16} /> Дашборд</span></button>
          <button className={`main-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Усе</button>
          <button className={`main-tab ${activeTab === 'movie' ? 'active' : ''}`} onClick={() => setActiveTab('movie')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Film size={16} /> Фільми</span></button>
          <button className={`main-tab ${activeTab === 'series' ? 'active' : ''}`} onClick={() => setActiveTab('series')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Tv size={16} /> Серіали</span></button>
          <button className={`main-tab ${activeTab === 'lists' ? 'active' : ''}`} onClick={() => setActiveTab('lists')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><List size={16} /> Списки</span></button>
        </div>
      </div>

      <main>
        {loading ? (
          <div className="home-loading-state"><div className="home-spinner"></div><p>Завантаження...</p></div>
        ) : activeTab === 'lists' ? (
           activeListView ? (
             <div className="home-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <button className="home-add-btn" style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', marginBottom: '16px', padding: '6px 12px' }} onClick={() => setActiveListView(null)}>
                      <ArrowLeft size={16} /> Назад
                    </button>
                    <h2 className="home-section-title" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                      {activeListView === 'planned' ? 'У планах' : customLists.find(l => l.id === activeListView)?.name}
                    </h2>
                    {activeListView !== 'planned' && customLists.find(l => l.id === activeListView)?.description && (
                      <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '14px' }}>{customLists.find(l => l.id === activeListView)?.description}</p>
                    )}
                  </div>
                  {activeListView !== 'planned' && (
                    <button className="home-add-btn" style={{ background: '#38bdf8', color: '#000', border: 'none' }} onClick={() => setIsListSearchOpen(true)}><Plus size={18} /> Додати</button>
                  )}
                </div>
                {activeListView === 'planned' ? (
                  plannedItems.length > 0 ? renderGrid(plannedItems, { isInsideList: true }) : <p className="home-empty-text">Список порожній.</p>
                ) : (
                  listMedia.length > 0 ? renderGrid(listMedia, { isInsideList: true }) : <p className="home-empty-text">Список порожній!</p>
                )}
             </div>
          ) : (
            <div className="home-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 className="home-section-title" style={{ marginBottom: 0, borderBottom: 'none' }}><List size={24} color="#38bdf8" /> Мої списки</h2>
                <button className="home-add-btn" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }} onClick={() => openListModal()}><Plus size={18} /> Створити</button>
              </div>

              <div className="lists-grid">
                <div className="list-card system-list" onClick={() => setActiveListView('planned')}>
                  <div className="list-icon"><CalendarCheck size={28} color="#facc15" /></div>
                  <div className="list-info">
                    <h3 className="list-name">У планах</h3>
                    <p className="list-desc">Системний список для елементів зі статусом "planned".</p>
                    <span className="list-count" style={{ color: '#facc15', background: 'rgba(250, 204, 21, 0.1)' }}>{plannedItems.length} ел.</span>
                  </div>
                </div>

                {customLists.map(list => (
                  <div key={list.id} className="list-card" onClick={() => setActiveListView(list.id)}>
                    <div className="list-icon"><List size={28} color="#38bdf8" /></div>
                    <div className="list-info">
                      <h3 className="list-name">{list.name}</h3>
                      {list.description && <p className="list-desc">{list.description}</p>}
                      <span className="list-count">{list.item_count} ел.</span>
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
            <h2 style={{ color: '#fff', marginBottom: '10px' }}>Немає доданих медіа</h2>
            <button className="home-add-btn" style={{ background: '#38bdf8', color: '#000' }} onClick={() => setIsSearchOpen(true)}><Search size={18} /> Знайти</button>
          </div>
        ) : activeTab === 'dashboard' ? (
          <div className="dashboard-layout">
            <div className="home-section dashboard-block watching-block">
              <div className="section-header">
                <div className="icon-wrap bg-blue"><Activity size={20} color="#38bdf8" /></div>
                <h2 className="home-section-title mb-0 border-0">Триває перегляд</h2>
              </div>
              {currentlyWatching.length > 0 ? renderWatchingGrid(currentlyWatching) : <p className="home-empty-text pl-14">Немає елементів у процесі перегляду.</p>}
            </div>

            <div className="home-section dashboard-block upcoming-block">
              <div className="section-header">
                <div className="icon-wrap bg-orange"><Calendar size={20} color="#f97316" /></div>
                <h2 className="home-section-title mb-0 border-0">Очікується незабаром</h2>
              </div>
              {upcomingMedia.length > 0 ? renderHorizontalScroll(upcomingMedia, { isComingSoon: true }) : <p className="home-empty-text pl-14">Немає майбутніх релізів.</p>}
            </div>

            <div className="home-section dashboard-block completed-block">
              <div className="section-header">
                <div className="icon-wrap bg-green"><Clock size={20} color="#2ecc71" /></div>
                <h2 className="home-section-title mb-0 border-0">Нещодавно завершено</h2>
              </div>
              {recentlyCompleted.length > 0 ? renderHorizontalScroll(recentlyCompleted) : <p className="home-empty-text pl-14">Немає нещодавно завершених елементів.</p>}
            </div>
          </div>
        ) : (
          renderGrid(mediaList)
        )}
      </main>

      {/* Модалки (Списки, Пошук) залишені без змін для UI */}
      {isListModalOpen && (
        <div className="home-modal-overlay" onClick={() => setIsListModalOpen(false)}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="home-modal-header">
              <h2 className="home-modal-title">{editingListId ? 'Редагувати список' : 'Новий список'}</h2>
              <button className="home-close-btn" onClick={() => setIsListModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={submitListForm} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Назва *</label>
                <input type="text" required placeholder="Мій топ фільмів" value={listFormData.name} onChange={(e) => setListFormData({...listFormData, name: e.target.value})} className="home-search-input" autoFocus />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Опис (опціонально)</label>
                <textarea placeholder="Коротко про список..." value={listFormData.description} onChange={(e) => setListFormData({...listFormData, description: e.target.value})} className="home-search-input" style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="home-search-submit-btn" style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8' }} onClick={() => setIsListModalOpen(false)}>Скасувати</button>
                <button type="submit" className="home-search-submit-btn" style={{ background: '#38bdf8', color: '#000' }}>Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSearchOpen && (
        <div className="home-modal-overlay" onClick={() => setIsSearchOpen(false)}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <div className="home-modal-header">
              <h2 className="home-modal-title">Пошук TMDB</h2>
              <button className="home-close-btn" onClick={() => setIsSearchOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSearchTMDB} className="home-search-form">
              <div className="home-search-input-wrapper">
                <Search size={20} color="#64748b" className="home-search-icon" />
                <input type="text" placeholder="Назва..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="home-search-input" autoFocus />
              </div>
              <button type="submit" className="home-search-submit-btn" disabled={searching}>{searching ? 'Пошук...' : 'Знайти'}</button>
            </form>
            <div className="home-search-results custom-scroll">
              {searchResults.length === 0 && !searching && searchQuery && <p style={{ textAlign: 'center', color: '#64748b', marginTop: '20px' }}>Нічого не знайдено.</p>}
              {searchResults.map(result => (
                <div key={result.tmdb_id} className="home-search-item" onClick={() => { setIsSearchOpen(false); navigate(`/media/${result.media_type}/${result.tmdb_id}`); }}>
                  <img src={result.poster_path || 'https://via.placeholder.com/50x75?text=No+Img'} alt={result.title} className="home-search-poster" loading="lazy" />
                  <div className="home-search-info">
                    <h4 className="home-search-title">{result.title}</h4>
                    <div className="home-search-meta">
                      <span className="home-search-year">{result.release_date?.split('-')[0] || 'Невідомо'}</span>
                      <span className="home-search-type-badge">{result.media_type === 'movie' ? 'Фільм' : 'Серіал'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isListSearchOpen && (
        <div className="home-modal-overlay" onClick={() => setIsListSearchOpen(false)}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <div className="home-modal-header">
              <h2 className="home-modal-title">Додати до списку</h2>
              <button className="home-close-btn" onClick={() => setIsListSearchOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSearchTMDB} className="home-search-form">
              <div className="home-search-input-wrapper">
                <Search size={20} color="#64748b" className="home-search-icon" />
                <input type="text" placeholder="Назва..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="home-search-input" autoFocus />
              </div>
              <button type="submit" className="home-search-submit-btn" disabled={searching}>{searching ? 'Пошук...' : 'Знайти'}</button>
            </form>
            <div className="home-search-results custom-scroll">
              {searchResults.length === 0 && !searching && searchQuery && <p style={{ textAlign: 'center', color: '#64748b', marginTop: '20px' }}>Нічого не знайдено.</p>}
              {searchResults.map(result => (
                <div key={result.tmdb_id} className="home-search-item" onClick={() => handleAddToListFromSearch(result)}>
                  <img src={result.poster_path || 'https://via.placeholder.com/50x75?text=No+Img'} alt={result.title} className="home-search-poster" loading="lazy" />
                  <div className="home-search-info">
                    <h4 className="home-search-title">{result.title}</h4>
                    <div className="home-search-meta">
                      <span className="home-search-year">{result.release_date?.split('-')[0] || 'Невідомо'}</span>
                      <span className="home-search-type-badge">{result.media_type === 'movie' ? 'Фільм' : 'Серіал'}</span>
                    </div>
                  </div>
                  <div style={{ color: '#38bdf8', padding: '0 10px' }}><Plus size={20} /></div>
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
        
        /* Layout Grids */
        .home-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 20px; grid-auto-flow: dense; }
        
        .home-horizontal-scroll { display: flex; gap: 20px; overflow-x: auto; padding-bottom: 15px; scroll-behavior: smooth; align-items: stretch; }
        .scroll-item-narrow { flex: 0 0 auto; width: 170px; }
        .scroll-item-wide { flex: 0 0 auto; width: 320px; }
        
        .home-horizontal-scroll::-webkit-scrollbar { height: 8px; }
        .home-horizontal-scroll::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 10px; }
        .home-horizontal-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .home-horizontal-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
        
        /* Dashboard Enhancements */
        .dashboard-layout { display: flex; flex-direction: column; gap: 40px; }
        .dashboard-block { padding: 25px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); }
        .watching-block { background: linear-gradient(145deg, rgba(15,23,42,0.6) 0%, rgba(10,10,10,1) 100%); }
        .upcoming-block { background: linear-gradient(145deg, rgba(67,20,7,0.3) 0%, rgba(10,10,10,1) 100%); border-color: rgba(249,115,22,0.1); }
        .completed-block { background: linear-gradient(145deg, rgba(6,78,59,0.2) 0%, rgba(10,10,10,1) 100%); }
        
        .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 25px; }
        .icon-wrap { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .bg-blue { background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); }
        .bg-orange { background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.3); }
        .bg-green { background: rgba(46, 204, 113, 0.15); border: 1px solid rgba(46, 204, 113, 0.3); }
        
        .mb-0 { margin-bottom: 0 !important; }
        .border-0 { border-bottom: none !important; padding-bottom: 0 !important; }
        .pl-14 { padding-left: 54px; }
        
        /* Others */
        .home-loading-state, .home-empty-state { text-align: center; padding: 80px 0; color: #94a3b8; display: flex; flex-direction: column; align-items: center; }
        .home-empty-text { color: #64748b; font-style: italic; font-size: 15px; }
        .home-spinner { width: 40px; height: 40px; border: 3px solid rgba(56, 189, 248, 0.2); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px auto; }
        @keyframes spin { to { transform: rotate(360deg); } }

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