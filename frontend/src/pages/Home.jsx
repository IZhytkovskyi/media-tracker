// frontend/src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, LayoutGrid, Clock, Calendar, Play, 
  Film, Tv, List, ArrowLeft, Activity, Home as HomeIcon, 
  CalendarCheck, Pen, Trash2 
} from 'lucide-react';
import { MediaGlobalStyles } from '../styles/mediaDetailStyles';
import MediaCard from '../components/MediaCard';
import TmdbSearchModal from '../components/TmdbSearchModal';
import ListFormModal from '../components/ListFormModal';
import { api } from '../utils/api';
import { useToast } from '../components/ToastContext';
import '../styles/Home.css';

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
  
  // Стани модальних вікон
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isListSearchOpen, setIsListSearchOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [editingListData, setEditingListData] = useState(null);

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

  // Обробка додавання медіа до списку з результатів пошуку
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
      success('Оцінку збережено');
    } catch (err) { error(err.message); }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Видалити з бібліотеки?')) return;
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

  // Робота зі списками
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
    if (!window.confirm('Видалити список?')) return;
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

  // Розподіл даних
  const upNextSeries = mediaList.filter(m => m.progress?.isWatching && m.media_type === 'series');
  const recentlyCompleted = mediaList
    .filter(m => m.play_count > 0 && !m.progress?.isWatching)
    .sort((a, b) => new Date(b.last_watched_at || 0) - new Date(a.last_watched_at || 0))
    .slice(0, 14);
  const plannedItems = mediaList.filter(m => m.in_watchlist === 1).slice(0, 14);

  // Рендери
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
            <Search size={18} /> Знайти фільм чи серіал
          </button>
        </div>
      </header>

      <div className="main-tabs-wrapper" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '40px' }}>
        <div className="main-tabs-container custom-scroll">
          <button className={`main-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><HomeIcon size={16} /> Дашборд</span></button>
          <button className={`main-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Уся медіатека</button>
          <button className={`main-tab ${activeTab === 'movie' ? 'active' : ''}`} onClick={() => setActiveTab('movie')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Film size={16} /> Фільми</span></button>
          <button className={`main-tab ${activeTab === 'series' ? 'active' : ''}`} onClick={() => setActiveTab('series')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Tv size={16} /> Серіали</span></button>
          <button className={`main-tab ${activeTab === 'lists' ? 'active' : ''}`} onClick={() => setActiveTab('lists')}><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><List size={16} /> Списки</span></button>
        </div>
      </div>

      <main className="home-main">
        {loading ? (
          <div className="home-loading-state"><div className="home-spinner"></div><p>Завантаження...</p></div>
        ) : activeTab === 'lists' ? (
           activeListView ? (
             <div className="home-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <button className="home-search-btn" style={{ width: 'auto', marginBottom: '16px', padding: '6px 12px' }} onClick={() => setActiveListView(null)}>
                      <ArrowLeft size={16} /> Назад
                    </button>
                    <h2 className="section-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                      {activeListView === 'planned' ? 'У планах (Watchlist)' : customLists.find(l => l.id === activeListView)?.name}
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

                {activeListView === 'planned' ? (
                  plannedItems.length > 0 ? renderGrid(plannedItems, { isInsideList: true }) : <p className="home-empty-text">Список порожній.</p>
                ) : (
                  listMedia.length > 0 ? renderGrid(listMedia, { isInsideList: true }) : <p className="home-empty-text">Список порожній!</p>
                )}
             </div>
          ) : (
            <div className="home-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <List size={24} color="#38bdf8" /> Ваші списки
                </h2>
                <button className="home-search-btn" style={{ width: 'auto', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }} onClick={() => openListModal()}>
                  <Plus size={18} /> Створити
                </button>
              </div>
              
              <div className="lists-grid">
                <div className="list-card system-list" onClick={() => setActiveListView('planned')}>
                  <div className="list-icon"><CalendarCheck size={28} color="#c084fc" /></div>
                  <div className="list-info">
                    <h3 className="list-name">У планах (Watchlist)</h3>
                    <p className="list-desc">Системний список для контенту, який ви плануєте подивитися.</p>
                    <span className="list-count" style={{ color: '#c084fc', background: 'rgba(192, 132, 252, 0.1)' }}>{plannedItems.length} поз.</span>
                  </div>
                </div>

                {customLists.map(list => (
                  <div key={list.id} className="list-card" onClick={() => setActiveListView(list.id)}>
                    <div className="list-icon"><List size={28} color="#38bdf8" /></div>
                    <div className="list-info">
                      <h3 className="list-name">{list.name}</h3>
                      {list.description && <p className="list-desc">{list.description}</p>}
                      <span className="list-count">{list.item_count} поз.</span>
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
            <h2 style={{ color: '#fff', marginBottom: '10px' }}>Бібліотека порожня</h2>
            <button className="home-search-btn" style={{ background: '#38bdf8', color: '#000', width: 'auto', justifyContent: 'center' }} onClick={() => setIsSearchOpen(true)}>
              <Search size={18} /> Знайти медіа
            </button>
          </div>
        ) : activeTab === 'dashboard' ? (
          <div className="dashboard-layout">
            {upNextSeries.length > 0 && (
              <div className="home-section">
                <div className="section-header">
                  <Play size={20} color="#38bdf8" fill="#38bdf8" />
                  <h2 className="section-title">Up Next (Продовжити)</h2>
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
                  <h2 className="section-title">Нещодавно переглянуто</h2>
                </div>
                {renderPosterScroll(recentlyCompleted)}
              </div>
            )}

            {plannedItems.length > 0 && (
              <div className="home-section">
                <div className="section-header">
                  <Plus size={20} color="#c084fc" />
                  <h2 className="section-title">У планах (Watchlist)</h2>
                </div>
                {renderPosterScroll(plannedItems)}
              </div>
            )}
          </div>
        ) : (
          renderGrid(mediaList)
        )}
      </main>

      {/* Модальні вікна, винесені в окремі компоненти */}
      <TmdbSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onResultClick={handleSearchResultClick} 
      />

      <TmdbSearchModal 
        isOpen={isListSearchOpen} 
        onClose={() => setIsListSearchOpen(false)} 
        onResultClick={handleAddToListFromSearch} 
        title="Додати медіа до списку"
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