// frontend/src/components/TmdbSearchModal.jsx
import React, { useState } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { api } from '../utils/api';

export default function TmdbSearchModal({ isOpen, onClose, onResultClick, title = "Пошук у базі TMDB", showAddIcon = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSearchTMDB = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setErrorMsg('');
    try {
      const res = await api.searchTMDB(searchQuery);
      setSearchResults(res.data || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleItemClick = (result) => {
    onResultClick(result);
    // Очищаємо стан при закритті
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="home-modal-overlay" onClick={onClose}>
      <div className="home-modal" onClick={(e) => e.stopPropagation()}>
        <div className="home-modal-header">
          <h2 className="home-modal-title">{title}</h2>
          <button className="home-close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSearchTMDB} className="home-search-form">
          <div className="home-search-input-wrapper">
            <Search size={20} color="#64748b" className="home-search-icon" />
            <input 
              type="text" 
              placeholder="Назва фільму або серіалу..." 
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

        {errorMsg && <p style={{ color: '#ef4444', textAlign: 'center' }}>{errorMsg}</p>}

        <div className="home-search-results custom-scroll">
          {searchResults.length === 0 && !searching && searchQuery && !errorMsg && (
            <p style={{ textAlign: 'center', color: '#64748b', marginTop: '20px' }}>Нічого не знайдено.</p>
          )}
          
          {searchResults.map(result => (
            <div key={result.tmdb_id} className="home-search-item" onClick={() => handleItemClick(result)}>
              <img src={result.poster_path || 'https://via.placeholder.com/50x75?text=No+Img'} alt={result.title} className="home-search-poster" loading="lazy" />
              <div className="home-search-info">
                <h4 className="home-search-title">{result.title}</h4>
                <div className="home-search-meta">
                  <span className="home-search-year">{result.release_date?.split('-')[0] || 'ТБА'}</span>
                  <span className="home-search-type-badge">{result.media_type === 'movie' ? 'Фільм' : 'Серіал'}</span>
                </div>
              </div>
              {showAddIcon && (
                <div style={{ color: '#38bdf8', padding: '0 10px' }}><Plus size={20} /></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}