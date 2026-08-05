// frontend/src/pages/Home.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, LayoutGrid, Clock, Calendar, Play, 
  Film, Tv, List, ArrowLeft, Activity, Home as HomeIcon, 
  CalendarCheck, Pen, Trash2, Settings, RefreshCw, Download, Upload 
} from 'lucide-react';
import { MediaGlobalStyles } from '../styles/mediaDetailStyles';
import MediaCard from '../components/MediaCard';
import TmdbSearchModal from '../components/TmdbSearchModal';
import ListFormModal from '../components/ListFormModal';
import AdvancedFilter from '../components/AdvancedFilter';
import { api } from '../utils/api';
import { useToast } from '../components/ToastContext';
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [mediaList, setMediaList] = useState([]);
  const [filteredMediaList, setFilteredMediaList] = useState([]);
  const [upcomingMedia, setUpcomingMedia] = useState([]);
  
  const [customLists, setCustomLists] = useState([]);
  const [activeListView, setActiveListView] = useState(null);
  const [listMedia, setListMedia] = useState([]);
  const [filteredListMedia, setFilteredListMedia] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isListSearchOpen, setIsListSearchOpen] = useState(false);
  
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [editingListData, setEditingListData] = useState(null);

  const fileInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      let params = '';
      if (activeTab !== 'all' && activeTab !== 'dashboard' && activeTab !== 'lists' && activeTab !== 'settings') {
          params = `?type=${activeTab}`;
      }
      
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
    if (activeTab !== 'settings') {
        fetchData();
        setActiveListView(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeListView && activeListView !== 'planned') {
      fetchListItems(activeListView);
    }
  }, [activeListView]);

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
    } catch (err) {
      error(err.message);
    }
  };

  const handleUpdateRating = async (id, ratingVal) => {
    const rating = parseFloat(ratingVal) || null;
    try {
      await api.updateMedia(id, { user_rating: rating });
      fetchData();
      success('Рейтинг оновлено');
    } catch (err) { error(err.message); }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Видалити цей елемент?')) return;
    try {
      await api.deleteMedia(id);
      success('Видалено успішно');
      fetchData();
      if (activeListView && activeListView !== 'planned') fetchListItems(activeListView);
    } catch (err) { error(err.message); }
  };

  const handleRemoveFromList = async (mediaId) => {
    if (!activeListView || activeListView === 'planned') return;
    try {
      await api.removeFromList(activeListView, mediaId);
      success('Видалено зі списку');
      fetchListItems(activeListView);
    } catch (err) { error(err.message); }
  };

  const handleMarkNextEpisode = async (seriesId) => {
    try {
        await api.watchNextEpisode(seriesId);
        success('Епізод відмічено!');
        fetchData();
    } catch (err) { error(err.message); }
  };

  const openListModal = (list = null) => {
    setEditingListData(list);
    setIsListModalOpen(true);
  };

  const handleListSubmit = async (formData, id) => {
    try {
      if (id) {
        await api.updateList(id, formData);
        success('Список оновлено');
      } else {
        await api.createList(formData);
        success('Список створено');
      }
      setIsListModalOpen(false);
      fetchData();
    } catch (err) { error(err.message); }
  };

  const handleDeleteList = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Видалити цей список?')) return;
    try {
      await api.deleteList(id);
      success('Список видалено');
      fetchData();
    } catch (err) { error(err.message); }
  };

  const handleCardClick = (item) => {
    if (item.media_type === 'episode' || item.media_type === 'season') {
      const sId = item.series_tmdb_id || item.parent_id || item.tmdb_id;
      navigate(`/media/series/${sId}`);
    } else {
      navigate(`/media/${item.media_type}/${item.tmdb_id}`);
    }
  };

  const handleSearchResultClick = (result) => {
    setIsSearchOpen(false);
    navigate(`/media/${result.media_type}/${result.tmdb_id}`);
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
        const res = await api.syncMetadata();
        success(res.message || 'Синхронізація завершена');
    } catch (err) {
        error('Помилка: ' + err.message);
    } finally {
        setIsSyncing(false);
    }
  };

  const handleExportDB = async () => {
    setIsExporting(true);
    try {
        await api.exportDatabase();
        success('БД успішно експортовано');
    } catch (err) {
        error('Помилка: ' + err.message);
    } finally {
        setIsExporting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        setIsImporting(true);
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());

        const parsedItems = lines.slice(1).map(line => {
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/(^"|"$)/g, ''));
            const obj = {};
            headers.forEach((h, i) => obj[h] = values[i]);
            return obj;
        });

        const mappedItems = parsedItems.map(item => {
            if (headers.includes('letterboxd uri')) {
                return {
                    title: item.name,
                    year: item.year,
                    rating: item.rating ? parseFloat(item.rating) : null,
                    watched_at: item['watched date'] || item.date || new Date().toISOString(),
                    type: 'movie'
                };
            }
            if (headers.includes('tmdb_id') || headers.includes('tmdb_show_id') || headers.includes('tmdb_movie_id')) {
                const traktType = item.type || (headers.includes('tmdb_show_id') ? 'series' : 'movie');
                return {
                    title: item.title,
                    year: item.year,
                    rating: item.rating ? parseFloat(item.rating) : null,
                    watched_at: item.watched_at || new Date().toISOString(),
                    tmdb_id: item.tmdb_id || item.tmdb_show_id || item.tmdb_movie_id,
                    type: traktType === 'show' ? 'series' : 'movie'
                };
            }
            return null;
        }).filter(Boolean);

        if (mappedItems.length === 0) {
            throw new Error('Не вдалося розпізнати формат файлу. Підтримуються формати Trakt та Letterboxd.');
        }

        const source = headers.includes('letterboxd uri') ? 'letterboxd' : 'trakt';
        const res = await api.importData({ items: mappedItems, source });
        
        success(res.message);
        if (res.errors && res.errors.length > 0) {
            console.warn("Помилки імпорту:", res.errors);
        }
        
    } catch(err) {
        error(err.message);
    } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const upNextSeries = useMemo(() => 
    mediaList.filter(m => m.progress?.isWatching && m.media_type === 'series'), 
  [mediaList]);

  const recentlyCompleted = useMemo(() => 
    [...mediaList]
      .filter(m => m.play_count > 0 && !m.progress?.isWatching)
      .sort((a, b) => new Date(b.last_watched_at || 0) - new Date(a.last_watched_at || 0))
      .slice(0, 14), 
  [mediaList]);

  const plannedItemsTotal = useMemo(() => 
    mediaList.filter(m => m.in_watchlist === 1), 
  [mediaList]);

  const plannedItems = useMemo(() => plannedItemsTotal.slice(0, 14), [plannedItemsTotal]);

  const renderGrid = (items, options = {}) => (
    <div className="home-grid">
      {items.map(item => {
        const isSeriesType = ['series', 'season', 'episode'].includes(item.media_type);
        return <MediaCard key={item.id} item={item} options={{ ...options, isWide: isSeriesType }} onCardClick={handleCardClick} onUpdateRating={handleUpdateRating} onDelete={handleDeleteItem} onRemoveFromList={handleRemoveFromList} onMarkNextEpisode={handleMarkNextEpisode} />
      })}
    </div>
  );

  const renderBackdropScroll = (items) => (
    <div className="horizontal-scroll custom-scroll">
      {items.map(item => (
        <div key={item.id} className="scroll-item-wide">
          <MediaCard item={item} variant="backdrop" onCardClick={handleCardClick} onMarkNextEpisode={handleMarkNextEpisode} />
        </div>
      ))}
    </div>
  );

  const renderPosterScroll = (items) => (
    <div className="horizontal-scroll custom-scroll">
      {items.map(item => (
        <div key={item.id} className="scroll-item-narrow">
          <MediaCard item={item} variant="poster" onCardClick={handleCardClick} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="home-container">
      <MediaGlobalStyles dominantColor="56, 189, 248" />
      
      <header className="home-header">
        <h1 className="home-logo"><LayoutGrid size={28} color="#38bdf8" /> Media Tracker</h1>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="home-search-btn" onClick={() => navigate('/stats')} style={{ width: 'auto', padding: '10px 15px' }}>
            <Activity size={18} /> Статистика
          </button>
          <button className="home-search-btn" onClick={() => setIsSearchOpen(true)}>
            <Search size={18} /> Шукати...
          </button>
        </div>
      </header>

      <div className="main-tabs-wrapper" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '40px' }}>
        <div className="main-tabs-container custom-scroll">
          <button className={`main-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><HomeIcon size={16} /> Дашборд</span></button>
          <button className={`main-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Все</button>
          <button className={`main-tab ${activeTab === 'movie' ? 'active' : ''}`} onClick={() => setActiveTab('movie')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Film size={16} /> Фільми</span></button>
          <button className={`main-tab ${activeTab === 'series' ? 'active' : ''}`} onClick={() => setActiveTab('series')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Tv size={16} /> Серіали</span></button>
          <button className={`main-tab ${activeTab === 'lists' ? 'active' : ''}`} onClick={() => setActiveTab('lists')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><List size={16} /> Списки</span></button>
          <button className={`main-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Settings size={16} /> Налаштування</span></button>
        </div>
      </div>

      <main className="home-main">
        {loading ? (
          <div className="home-loading-state"><div className="home-spinner"></div><p>Завантаження...</p></div>
        ) : activeTab === 'settings' ? (
            <div className="home-section" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h2 className="section-title" style={{ marginBottom: '20px' }}>Налаштування</h2>
                
                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                        <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '10px', color: '#38bdf8' }}>
                            <RefreshCw size={24} className={isSyncing ? "spin-animation" : ""} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#f8fafc', fontSize: '16px' }}>Синхронізація метаданих</h3>
                            <p style={{ margin: '0 0 15px 0', color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
                                Оновлює інформацію про всі фільми та серіали з TMDB. Виконується у фоновому режимі.
                            </p>
                            <button 
                                onClick={handleForceSync} 
                                disabled={isSyncing}
                                className="home-search-btn" 
                                style={{
                                    background: isSyncing ? '#1e293b' : '#38bdf8',
                                    color: isSyncing ? '#94a3b8' : '#000',
                                    borderColor: 'transparent',
                                    justifyContent: 'center',
                                    width: 'auto'
                                }}
                            >
                                {isSyncing ? 'Синхронізація...' : 'Запустити примусово'}
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                        <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '12px', borderRadius: '10px', color: '#2ecc71' }}>
                            <Upload size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#f8fafc', fontSize: '16px' }}>Імпорт історії переглядів</h3>
                            <p style={{ margin: '0 0 15px 0', color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
                                Завантажте CSV файл з Trakt або Letterboxd для автоматичного перенесення вашої історії.
                            </p>
                            
                            <input 
                                type="file" 
                                accept=".csv" 
                                ref={fileInputRef} 
                                style={{ display: 'none' }} 
                                onChange={handleFileUpload}
                            />

                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                disabled={isImporting}
                                className="home-search-btn" 
                                style={{
                                    background: isImporting ? '#1e293b' : '#2ecc71',
                                    color: isImporting ? '#94a3b8' : '#000',
                                    borderColor: 'transparent',
                                    justifyContent: 'center',
                                    width: 'auto'
                                }}
                            >
                                {isImporting ? 'Імпорт даних...' : 'Вибрати CSV файл'}
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                        <div style={{ backgroundColor: 'rgba(192, 132, 252, 0.1)', padding: '12px', borderRadius: '10px', color: '#c084fc' }}>
                            <Download size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#f8fafc', fontSize: '16px' }}>Резервна копія БД</h3>
                            <p style={{ margin: '0 0 15px 0', color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
                                Завантажити локальний файл SQLite (tracker.db). Рекомендується робити це регулярно.
                            </p>
                            <button 
                                onClick={handleExportDB} 
                                disabled={isExporting}
                                className="home-search-btn" 
                                style={{
                                    background: isExporting ? '#1e293b' : '#c084fc',
                                    color: isExporting ? '#94a3b8' : '#000',
                                    borderColor: 'transparent',
                                    justifyContent: 'center',
                                    width: 'auto'
                                }}
                            >
                                {isExporting ? 'Підготовка...' : 'Завантажити копію'}
                            </button>
                        </div>
                    </div>
                </div>
                
                <style>{`
                    .spin-animation { animation: spin 1.5s linear infinite; }
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        ) : activeTab === 'lists' ? (
           activeListView ? (
             <div className="home-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <button className="home-search-btn" style={{ width: 'auto', marginBottom: '16px', padding: '6px 12px' }} onClick={() => setActiveListView(null)}>
                      <ArrowLeft size={16} /> Назад
                    </button>
                    <h2 className="section-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                      {activeListView === 'planned' ? 'В планах (Watchlist)' : customLists.find(l => l.id === activeListView)?.name}
                    </h2>
                    {activeListView !== 'planned' && customLists.find(l => l.id === activeListView)?.description && (
                      <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '14px' }}>{customLists.find(l => l.id === activeListView)?.description}</p>
                    )}
                  </div>
                  {activeListView !== 'planned' && (
                    <button className="home-search-submit-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsListSearchOpen(true)}>
                      <Plus size={18} /> Додати
                    </button>
                  )}
                </div>
                
                <AdvancedFilter items={activeListView === 'planned' ? plannedItemsTotal : listMedia} onFilterChange={setFilteredListMedia} />
                
                {filteredListMedia.length > 0 ? renderGrid(filteredListMedia, { isInsideList: true }) : <p className="home-empty-text">Список порожній.</p>}
             </div>
          ) : (
            <div className="home-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <List size={24} color="#38bdf8" /> Мої списки
                </h2>
                <button className="home-search-btn" style={{ width: 'auto', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }} onClick={() => openListModal()}>
                  <Plus size={18} /> Створити список
                </button>
              </div>
              
              <div className="lists-grid">
                <div className="list-card system-list" onClick={() => setActiveListView('planned')}>
                  <div className="list-icon"><CalendarCheck size={28} color="#c084fc" /></div>
                  <div className="list-info">
                    <h3 className="list-name">У планах (Watchlist)</h3>
                    <p className="list-desc">Автоматичний список.</p>
                    <span className="list-count" style={{ color: '#c084fc', background: 'rgba(192, 132, 252, 0.1)' }}>{plannedItemsTotal.length} шт.</span>
                  </div>
                </div>

                {customLists.map(list => (
                  <div key={list.id} className="list-card" onClick={() => setActiveListView(list.id)}>
                    <div className="list-icon"><List size={28} color="#38bdf8" /></div>
                    <div className="list-info">
                      <h3 className="list-name">{list.name}</h3>
                      {list.description && <p className="list-desc">{list.description}</p>}
                      <span className="list-count">{list.item_count} шт.</span>
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
          <div className="home-loading-state">
            <Film size={48} color="#334155" style={{ marginBottom: '16px' }} />
            <h2 style={{ color: '#fff', marginBottom: '10px' }}>Ваша медіатека порожня</h2>
            <button className="home-search-btn" style={{ background: '#38bdf8', color: '#000', width: 'auto', justifyContent: 'center' }} onClick={() => setIsSearchOpen(true)}>
              <Search size={18} /> Знайти фільм чи серіал
            </button>
          </div>
        ) : activeTab === 'dashboard' ? (
          <div className="dashboard-layout">
            {upNextSeries.length > 0 && (
              <div className="home-section">
                <div className="section-header">
                  <Play size={20} color="#38bdf8" fill="#38bdf8" />
                  <h2 className="section-title">Up Next (Продовжити перегляд)</h2>
                </div>
                {renderBackdropScroll(upNextSeries)}
              </div>
            )}

            {upcomingMedia.length > 0 && (
              <div className="home-section">
                <div className="section-header">
                  <Calendar size={20} color="#f97316" />
                  <h2 className="section-title">Календар релізів</h2>
                </div>
                {renderPosterScroll(upcomingMedia)}
              </div>
            )}

            {recentlyCompleted.length > 0 && (
              <div className="home-section">
                <div className="section-header">
                  <Clock size={20} color="#2ecc71" />
                  <h2 className="section-title">Останні перегляди</h2>
                </div>
                {renderPosterScroll(recentlyCompleted)}
              </div>
            )}

            {plannedItems.length > 0 && (
              <div className="home-section">
                <div className="section-header">
                  <Plus size={20} color="#c084fc" />
                  <h2 className="section-title">В планах (Watchlist)</h2>
                </div>
                {renderPosterScroll(plannedItems)}
              </div>
            )}
          </div>
        ) : (
          <>
            <AdvancedFilter items={mediaList} onFilterChange={setFilteredMediaList} />
            {renderGrid(filteredMediaList)}
          </>
        )}
      </main>

      {/* Модалки */}
      <TmdbSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onResultClick={handleSearchResultClick} 
      />
      <TmdbSearchModal 
        isOpen={isListSearchOpen} 
        onClose={() => setIsListSearchOpen(false)} 
        onResultClick={handleAddToListFromSearch} 
        title="Пошук у TMDB"
        showAddIcon={true}
      />
      <ListFormModal 
        isOpen={isListModalOpen} 
        onClose={() => setIsListModalOpen(false)} 
        onSubmit={handleListSubmit}
        initialData={editingListData}
      />
    </div>
  );
}