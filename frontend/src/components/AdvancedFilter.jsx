// frontend/src/components/AdvancedFilter.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Filter, Search, ChevronDown, Calendar, Clock, UserCheck } from 'lucide-react';

// Допоміжна функція для отримання назви країни
const getCountryName = (isoCode) => {
  if (isoCode === 'US') return 'США';
  try {
    const displayNames = new Intl.DisplayNames(['uk'], { type: 'region' });
    return displayNames.of(isoCode);
  } catch (e) {
    return isoCode;
  }
};

export default function AdvancedFilter({ items = [], onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    role: 'all',
    genre: 'all',
    country: 'all',
    yearMin: '',
    yearMax: '',
    runtimeMin: '',
    runtimeMax: '',
    sort: 'newest'
  });

  // Автоматично аналізуємо доступні дані в переданому списку (кешуємо результат)
  const { availableGenres, availableCountries, availableRoles, hasRuntime } = useMemo(() => {
    const genres = new Set();
    const countries = new Set();
    const rolesMap = new Map();
    let runtimeFound = false;

    items.forEach(item => {
      // Жанри
      if (Array.isArray(item.genres)) {
        item.genres.forEach(g => genres.add(g));
      } else if (typeof item.genres === 'string') {
        try { JSON.parse(item.genres).forEach(g => genres.add(g)); } catch(e){}
      }
      
      // Країни
      if (Array.isArray(item.production_countries)) {
        item.production_countries.forEach(c => countries.add(c));
      } else if (typeof item.production_countries === 'string') {
        try { JSON.parse(item.production_countries).forEach(c => countries.add(c)); } catch(e){}
      }

      // Перевірка тривалості
      if (item.runtime && item.runtime > 0) {
        runtimeFound = true;
      }

      // Ролі та посади (для сторінки акторів/творців)
      if (item.castRoles && item.castRoles.length > 0) {
        rolesMap.set('actor', (rolesMap.get('actor') || 0) + 1);
      }
      if (item.crewJobs && item.crewJobs.length > 0) {
        item.crewJobs.forEach(job => {
          rolesMap.set(job, (rolesMap.get(job) || 0) + 1);
        });
      }
    });

    const rolesList = Array.from(rolesMap.entries()).map(([key, count]) => ({
      key,
      label: key === 'actor' ? 'Акторські роботи' : key,
      count
    })).sort((a, b) => b.count - a.count);

    return {
      availableGenres: Array.from(genres).sort(),
      availableCountries: Array.from(countries).sort(),
      availableRoles: rolesList,
      hasRuntime: runtimeFound
    };
  }, [items]);

  // Застосування фільтрації (оптимізовано через useMemo)
  const filteredResult = useMemo(() => {
    let result = [...items];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(item => 
        item.title?.toLowerCase().includes(q) || 
        item.original_title?.toLowerCase().includes(q)
      );
    }

    if (filters.type !== 'all') {
      const targetType = filters.type === 'series' ? ['series', 'tv'] : ['movie'];
      result = result.filter(item => targetType.includes(item.media_type));
    }

    if (filters.role !== 'all') {
      if (filters.role === 'actor') {
        result = result.filter(item => item.castRoles && item.castRoles.length > 0);
      } else {
        result = result.filter(item => item.crewJobs && item.crewJobs.includes(filters.role));
      }
    }

    if (filters.genre !== 'all') {
      result = result.filter(item => {
        const itemGenres = Array.isArray(item.genres) ? item.genres : (typeof item.genres === 'string' ? JSON.parse(item.genres || '[]') : []);
        return itemGenres.includes(filters.genre);
      });
    }

    if (filters.country !== 'all') {
      result = result.filter(item => {
        const itemCountries = Array.isArray(item.production_countries) ? item.production_countries : (typeof item.production_countries === 'string' ? JSON.parse(item.production_countries || '[]') : []);
        return itemCountries.includes(filters.country);
      });
    }

    if (filters.yearMin) {
      result = result.filter(item => item.release_date && parseInt(item.release_date.substring(0, 4)) >= parseInt(filters.yearMin));
    }
    if (filters.yearMax) {
      result = result.filter(item => item.release_date && parseInt(item.release_date.substring(0, 4)) <= parseInt(filters.yearMax));
    }

    if (filters.runtimeMin) {
      result = result.filter(item => item.runtime && item.runtime >= parseInt(filters.runtimeMin));
    }
    if (filters.runtimeMax) {
      result = result.filter(item => item.runtime && item.runtime <= parseInt(filters.runtimeMax));
    }

    result.sort((a, b) => {
      if (filters.sort === 'rating_desc') return (b.user_rating || b.vote_average || 0) - (a.user_rating || a.vote_average || 0);
      if (filters.sort === 'alphabetical') return (a.title || '').localeCompare(b.title || '', 'uk');
      
      const dateA = new Date(a.release_date || (filters.sort === 'newest' ? '1900-01-01' : '2099-01-01')).getTime();
      const dateB = new Date(b.release_date || (filters.sort === 'newest' ? '1900-01-01' : '2099-01-01')).getTime();
      return filters.sort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [filters, items]);

  // Передаємо результат наверх тільки коли він реально змінився
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filteredResult);
    }
  }, [filteredResult]); 

  const handleClear = () => {
    setFilters({
      search: '', type: 'all', role: 'all', genre: 'all', country: 'all',
      yearMin: '', yearMax: '', runtimeMin: '', runtimeMax: '', sort: 'newest'
    });
  };

  const selectStyle = {
    appearance: 'none', WebkitAppearance: 'none',
    backgroundColor: '#0f172a', color: '#f8fafc',
    border: '1px solid #334155', padding: '10px 30px 10px 12px',
    borderRadius: '8px', fontSize: '14px', width: '100%', outline: 'none'
  };

  const inputStyle = {
    ...selectStyle, padding: '10px 12px'
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" placeholder="Пошук за назвою..." 
            value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})}
            style={{ ...inputStyle, paddingLeft: '38px' }}
          />
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px',
            backgroundColor: isOpen ? 'rgba(56, 189, 248, 0.1)' : '#1e293b', 
            color: isOpen ? '#38bdf8' : '#f8fafc',
            border: `1px solid ${isOpen ? '#38bdf8' : '#334155'}`, 
            borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600'
          }}
        >
          <Filter size={18} /> {isOpen ? 'Сховати панель' : 'Параметри фільтрації'}
        </button>
      </div>

      {isOpen && (
        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
            {availableRoles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UserCheck size={14} /> Роль / Посада
                </label>
                <div style={{ position: 'relative' }}>
                  <select value={filters.role} onChange={e => setFilters({...filters, role: e.target.value})} style={selectStyle}>
                    <option value="all">Усі ролі ({items.length})</option>
                    {availableRoles.map(r => (
                      <option key={r.key} value={r.key}>{r.label} ({r.count})</option>
                    ))}
                  </select>
                  <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Тип медіа</label>
              <div style={{ position: 'relative' }}>
                <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} style={selectStyle}>
                  <option value="all">Усі</option>
                  <option value="movie">Фільми</option>
                  <option value="series">Серіали</option>
                </select>
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {availableGenres.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Жанр</label>
                <div style={{ position: 'relative' }}>
                  <select value={filters.genre} onChange={e => setFilters({...filters, genre: e.target.value})} style={selectStyle}>
                    <option value="all">Всі жанри</option>
                    {availableGenres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
            )}

            {availableCountries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Країна</label>
                <div style={{ position: 'relative' }}>
                  <select value={filters.country} onChange={e => setFilters({...filters, country: e.target.value})} style={selectStyle}>
                    <option value="all">Всі країни</option>
                    {availableCountries.map(c => <option key={c} value={c}>{getCountryName(c)}</option>)}
                  </select>
                  <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Сортування</label>
              <div style={{ position: 'relative' }}>
                <select value={filters.sort} onChange={e => setFilters({...filters, sort: e.target.value})} style={selectStyle}>
                  <option value="newest">Найновіші за датою</option>
                  <option value="oldest">Найстаріші за датою</option>
                  <option value="rating_desc">За найвищою оцінкою</option>
                  <option value="alphabetical">За алфавітом (А-Я)</option>
                </select>
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Рік випуску</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="number" placeholder="Від (напр. 2000)" value={filters.yearMin} onChange={e => setFilters({...filters, yearMin: e.target.value})} style={inputStyle} />
                <span style={{ color: '#64748b' }}>-</span>
                <input type="number" placeholder="До (напр. 2024)" value={filters.yearMax} onChange={e => setFilters({...filters, yearMax: e.target.value})} style={inputStyle} />
              </div>
            </div>

             {hasRuntime && (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Тривалість (хв)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="number" placeholder="Від" value={filters.runtimeMin} onChange={e => setFilters({...filters, runtimeMin: e.target.value})} style={inputStyle} />
                  <span style={{ color: '#64748b' }}>-</span>
                  <input type="number" placeholder="До" value={filters.runtimeMax} onChange={e => setFilters({...filters, runtimeMax: e.target.value})} style={inputStyle} />
                </div>
              </div>
             )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px' }}>
            <button onClick={handleClear} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
              Скинути фільтри
            </button>
          </div>

        </div>
      )}
    </div>
  );
}