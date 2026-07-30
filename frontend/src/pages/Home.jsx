import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Film, Tv, Star, Plus, Trash2, X, CalendarCheck } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      let url = '/api/media';
      if (activeTab !== 'all') url += `?type=${activeTab}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.data) setMediaList(json.data);
    } catch (err) {
      console.error('Помилка завантаження медіа:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [activeTab]);

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

  const handleUpdateItem = async (e, id, updates) => {
    e.stopPropagation(); 
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) fetchMedia();
    } catch (err) {
      console.error('Помилка оновлення:', err);
    }
  };

  const handleDeleteItem = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Видалити цей елемент з бібліотеки?')) return;
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) fetchMedia();
    } catch (err) {
      console.error('Помилка видалення:', err);
    }
  };

  const handleSearchResultClick = (result) => {
    setIsSearchOpen(false);
    navigate(`/media/${result.media_type}/${result.tmdb_id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('uk-UA');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Media Tracker</h1>
        <div style={styles.tabs}>
          <button style={activeTab === 'all' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('all')}>Усі</button>
          <button style={activeTab === 'movie' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('movie')}><Film size={16} /> Фільми</button>
          <button style={activeTab === 'series' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('series')}><Tv size={16} /> Серіали</button>
        </div>
        <button style={styles.addButton} onClick={() => setIsSearchOpen(true)}><Plus size={18} /> Додати</button>
      </header>

      <main style={styles.main}>
        {loading ? <p>Завантаження...</p> : mediaList.length === 0 ? (
          <div style={styles.emptyState}>
            <p>Ваша бібліотека порожня. Натисніть "Додати", щоб знайти фільм чи серіал.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {mediaList.map(item => (
              <div 
                key={item.id} 
                style={styles.card}
                onClick={() => navigate(`/media/${item.media_type}/${item.tmdb_id}`)}
              >
                <div style={styles.posterWrapper}>
                  {item.poster_path ? <img src={item.poster_path} alt={item.title} style={styles.poster} /> : <div style={styles.noPoster}>Немає постера</div>}
                  <div style={styles.typeBadge}>{item.media_type === 'movie' ? <Film size={12} /> : <Tv size={12} />}</div>
                </div>
                
                <div style={styles.cardContent}>
                  <h3 style={styles.title} title={item.title}>{item.title}</h3>
                  
                  {item.status === 'completed' && item.finish_date ? (
                    <p style={styles.dateText}><CalendarCheck size={12} style={{marginRight: '4px'}}/>{formatDate(item.finish_date)}</p>
                  ) : (
                    <p style={styles.subtitle}>{item.release_date?.split('-')[0] || 'Без року'}</p>
                  )}
                  
                  <select 
                    value={item.status || ''} 
                    onChange={(e) => handleUpdateItem(e, item.id, { status: e.target.value || null })}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.select}
                  >
                    <option value="">Без статусу</option>
                    <option value="planned">У планах</option>
                    <option value="watching">Дивлюсь</option>
                    <option value="completed">Переглянуто</option>
                    <option value="on_hold">На паузі</option>
                    <option value="dropped">Кинуто</option>
                  </select>

                  <div style={styles.ratingRow} onClick={(e) => e.stopPropagation()}>
                    <Star size={16} color={item.rating ? "#eab308" : "#475569"} fill={item.rating ? "#eab308" : "none"} />
                    <input 
                      type="number" min="0" max="5" step="0.5"
                      value={item.rating || ''} 
                      placeholder="-"
                      onChange={(e) => handleUpdateItem(e, item.id, { rating: parseFloat(e.target.value) || null })}
                      style={styles.ratingInput}
                    />
                  </div>
                  
                  <button onClick={(e) => handleDeleteItem(e, item.id)} style={styles.deleteButton}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Модалка Пошуку */}
      {isSearchOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>Пошук у TMDB</h2>
              <button style={styles.closeButton} onClick={() => setIsSearchOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSearchTMDB} style={styles.searchForm}>
              <input type="text" placeholder="Назва фільму чи серіалу..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchInput} autoFocus />
              <button type="submit" style={styles.searchButton} disabled={searching}><Search size={18} /></button>
            </form>

            <div style={styles.searchResults}>
              {searchResults.map(result => (
                <div 
                  key={result.tmdb_id} 
                  style={styles.searchItem}
                  onClick={() => handleSearchResultClick(result)}
                  className="search-item-hover"
                >
                  <img src={result.poster_path || 'https://via.placeholder.com/50x75'} alt={result.title} style={styles.searchPoster} />
                  <div style={styles.searchInfo}>
                    <h4>{result.title}</h4>
                    <p>{result.release_date?.split('-')[0]} • {result.media_type === 'movie' ? 'Фільм' : 'Серіал'}</p>
                  </div>
                </div>
              ))}
              
              <style>{`
                .search-item-hover { cursor: pointer; transition: background 0.2s; }
                .search-item-hover:hover { background-color: #2a3a55 !important; }
              `}</style>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { fontFamily: 'system-ui, sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #1e293b', paddingBottom: '15px' },
  logo: { fontSize: '24px', margin: 0, color: '#38bdf8' },
  tabs: { display: 'flex', gap: '10px' },
  tab: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' },
  activeTab: { background: '#1e293b', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' },
  addButton: { background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' },
  main: { maxWidth: '1200px', margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' },
  card: { background: '#1e293b', borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.02)' } },
  posterWrapper: { position: 'relative', width: '100%', paddingTop: '150%', backgroundColor: '#334155' },
  poster: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
  noPoster: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#94a3b8' },
  typeBadge: { position: 'absolute', top: '10px', right: '10px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px 8px', borderRadius: '4px' },
  cardContent: { padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 },
  title: { margin: 0, fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  subtitle: { margin: 0, fontSize: '12px', color: '#94a3b8' },
  dateText: { margin: 0, fontSize: '12px', color: '#2ecc71', display: 'flex', alignItems: 'center', fontWeight: '500' },
  select: { background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '6px', borderRadius: '6px', cursor: 'pointer' },
  ratingRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  ratingInput: { width: '50px', background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '4px', borderRadius: '4px', textAlign: 'center' },
  deleteButton: { marginTop: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', alignSelf: 'flex-end', padding: '4px' },
  emptyState: { textAlign: 'center', padding: '60px 0', color: '#94a3b8' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: '#1e293b', width: '100%', maxWidth: '600px', borderRadius: '12px', padding: '20px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  closeButton: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer' },
  searchForm: { display: 'flex', gap: '10px', marginBottom: '20px' },
  searchInput: { flexGrow: 1, background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px' },
  searchButton: { background: '#0284c7', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' },
  searchResults: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  searchItem: { display: 'flex', alignItems: 'center', gap: '15px', background: '#0f172a', padding: '10px', borderRadius: '8px' },
  searchPoster: { width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' },
  searchInfo: { flexGrow: 1 }
};