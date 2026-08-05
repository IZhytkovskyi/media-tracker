// frontend/src/components/Tabs/TabShared.jsx
import React, { useState, useEffect, useRef } from 'react';
import { User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { styles } from '../../styles/mediaDetailStyles';

export const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

export const getCountryName = (isoCode) => {
  if (isoCode === 'US') return 'США';
  try {
    const displayNames = new Intl.DisplayNames(['uk'], { type: 'region' });
    return displayNames.of(isoCode);
  } catch (e) {
    return isoCode;
  }
};

export const getLanguageName = (isoCode) => {
  try {
    const displayNames = new Intl.DisplayNames(['uk'], { type: 'language' });
    return displayNames.of(isoCode);
  } catch (e) {
    return isoCode;
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatCurrency = (amount) => {
  if (!amount || amount === 0) return null;
  return '$' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

export const InfoRow = ({ label, value, children }) => {
  if (!value && !children) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'baseline' }}>
      <span style={{ color: '#94a3b8', fontSize: '14px' }}>{label}</span>
      <div style={{ color: '#f8fafc', fontSize: '14px', lineHeight: '1.4' }}>
        {children || value}
      </div>
    </div>
  );
};

export const PersonImage = ({ src, alt }) => {
  if (src) {
    return <img src={src} alt={alt} style={styles.personPhoto} loading="lazy" />;
  }
  return (
    <div style={{
      ...styles.personPhoto, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#1e293b', 
      color: '#64748b'
    }}>
      <User size={40} strokeWidth={1.5} />
    </div>
  );
};

export const HorizontalPeopleList = ({ title, people, isCrew = false, limit = 12 }) => {
  const navigate = useNavigate();
  if (!people || people.length === 0) return null;

  let displayPeople = people;
  if (isCrew) {
    const mainJobs = ['Director', 'Creator', 'Screenplay', 'Writer', 'Director of Photography', 'Original Music Composer'];
    displayPeople = people.filter(c => mainJobs.includes(c.original_job));
  }
  displayPeople = displayPeople.slice(0, limit);
  if (displayPeople.length === 0) return null;

  return (
    <div style={styles.sectionBlock}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <div className="custom-scroll" style={styles.horizontalScroll}>
        {displayPeople.map((person, idx) => (
          <div 
            key={`${isCrew ? 'crew' : 'actor'}-${person.id}-${idx}`} 
            style={{...styles.personCard, cursor: 'pointer'}}
            onClick={() => navigate(`/person/${person.id}`)}
          >
            <PersonImage src={person.profile_path} alt={person.name} />
            <div style={styles.personName}>{person.name}</div>
            <div style={styles.personRole}>
              {isCrew ? person.job : person.character}
              {person.episode_count && (
                <div style={{fontSize: '11px', color: '#38bdf8', marginTop: '2px'}}>
                  {person.episode_count} {person.episode_count % 10 === 1 && person.episode_count % 100 !== 11 ? 'еп.' : (person.episode_count % 10 >= 2 && person.episode_count % 10 <= 4 && (person.episode_count % 100 < 10 || person.episode_count % 100 >= 20) ? 'еп.' : 'еп.')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ScrollableSubTabs = ({ tabs, activeTab, onTabChange, containerStyle = {} }) => {
  const scrollRef = useRef(null);
  const [showArrows, setShowArrows] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        setShowArrows(scrollRef.current.scrollWidth > scrollRef.current.clientWidth + 5);
      }
    };
    checkScroll();
    setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollBtnStyle = {
    background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff',
    borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease', boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', marginBottom: '25px', ...containerStyle }}>
      <style>{`
        .scroll-btn-hover:hover { background: var(--dominant-color-strong, #38bdf8) !important; transform: scale(1.1); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {showArrows && <button onClick={() => scroll('left')} style={scrollBtnStyle} className="scroll-btn-hover"><ChevronLeft size={16} /></button>}
      
      <div ref={scrollRef} className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollBehavior: 'smooth', flexWrap: 'nowrap', padding: '4px 2px' }}>
        {tabs.map(tab => (
          <button key={tab.id} className={`sub-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => onTabChange(tab.id)} style={{ flexShrink: 0 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {showArrows && <button onClick={() => scroll('right')} style={scrollBtnStyle} className="scroll-btn-hover"><ChevronRight size={16} /></button>}
    </div>
  );
};