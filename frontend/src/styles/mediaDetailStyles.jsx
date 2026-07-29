import React from 'react';

export function MediaGlobalStyles() {
  return (
    <style>{`
      .mb-0 { margin-bottom: 0 !important; }

      .custom-scroll::-webkit-scrollbar { height: 6px; }
      .custom-scroll::-webkit-scrollbar-track { background: #2a2a2a; border-radius: 10px; }
      .custom-scroll::-webkit-scrollbar-thumb { background: #555; border-radius: 10px; }
      .custom-scroll::-webkit-scrollbar-thumb:hover { background: #777; }

      .main-tabs-wrapper { margin-bottom: 30px; display: inline-flex; max-width: 100%; }
      .main-tabs-container {
        display: flex; gap: 6px; padding: 6px; background: rgba(20, 20, 20, 0.5); 
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px;
        overflow-x: auto; scrollbar-width: none; 
      }
      .main-tabs-container::-webkit-scrollbar { display: none; }
      .main-tab {
        background: transparent; border: none; color: #a3a3a3; padding: 10px 20px;
        font-size: 14px; font-weight: 600; letter-spacing: 0.3px; cursor: pointer;
        border-radius: 10px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap;
      }
      .main-tab:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }
      .main-tab.active { color: #fff; background: #2a2a2a; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); }

      .sub-tabs-container { display: flex; gap: 8px; margin-bottom: 25px; flex-wrap: wrap; }
      .sub-tab {
        background: #1a1a1a; border: 1px solid #333; color: #a3a3a3; padding: 8px 18px;
        border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;
      }
      .sub-tab:hover { background: #2a2a2a; color: #fff; border-color: #555; }
      .sub-tab.active { background: #e5e5e5; border-color: #e5e5e5; color: #000; font-weight: bold; }

      .image-card {
        border-radius: 8px; overflow: hidden; background-color: #1a1a1a;
        transition: transform 0.2s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
      }
      .image-card:hover { transform: scale(1.03); z-index: 2; }
      .img-backdrops { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
      .img-posters { width: 100%; aspect-ratio: 2 / 3; object-fit: cover; }
      .img-logos { width: 100%; height: auto; max-height: 150px; object-fit: contain; padding: 20px; }

      /* Стилі для карток джерел */
      .source-card {
        display: flex; align-items: center; gap: 15px; padding: 16px 20px;
        background-color: #1a1a1a; border: 1px solid #333; border-radius: 12px;
        text-decoration: none; transition: all 0.2s ease;
      }
      .source-card:hover {
        background-color: #2a2a2a; border-color: #555; transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.3);
      }
      .source-icon-wrapper {
        display: flex; align-items: center; justify-content: center;
        width: 40px; height: 40px; background-color: #2a2a2a; border-radius: 50%; color: #fff;
      }
      .source-card:hover .source-icon-wrapper { background-color: #38bdf8; color: #000; }
      .source-label { color: #e5e5e5; font-size: 15px; font-weight: 600; }
    `}</style>
  );
}

export const styles = {
  container: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', backgroundColor: '#0a0a0a', color: '#f3f4f6', minHeight: '100vh', position: 'relative', overflowX: 'hidden' },
  loadingWrapper: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0a0a0a', color: '#9ca3af' },
  backdropImage: { position: 'absolute', top: 0, left: 0, right: 0, height: '75vh', backgroundSize: 'cover', backgroundPosition: 'center 20%', zIndex: 0 },
  backdropGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: '75vh', background: 'linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.95) 55%, rgba(10,10,10,1) 100%)', zIndex: 1 },
  topNav: { position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', padding: '20px 40px' },
  navButton: { background: 'rgba(20, 20, 20, 0.85)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backdropFilter: 'blur(10px)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
  navButtonIcon: { background: 'rgba(20, 20, 20, 0.85)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', backdropFilter: 'blur(10px)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
  mainContent: { position: 'relative', zIndex: 10, display: 'flex', gap: '40px', maxWidth: '1200px', margin: '0 auto', padding: '0 40px 40px 40px', alignItems: 'flex-start', flexWrap: 'wrap' },
  leftColumn: { width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '15px' },
  posterWrapper: { width: '100%', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.9)' },
  poster: { width: '100%', height: 'auto', display: 'block' },
  actionPanel: { display: 'flex', justifyContent: 'space-between', backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '20px 15px', border: '1px solid #2a2a2a' },
  actionItem: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 },
  actionIconCircle: { width: '45px', height: '45px', borderRadius: '50%', border: '1px solid #444', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', backgroundColor: '#222' },
  actionLabel: { fontSize: '12px', color: '#a3a3a3', fontWeight: '500' },
  rightColumn: { flex: 1, minWidth: '400px', paddingTop: '10px' },
  
  headerBlock: { marginBottom: '30px' },
  mainTitle: { fontSize: '42px', color: '#fff', margin: '0 0 5px 0', fontWeight: 'bold', textShadow: '0 2px 8px rgba(0,0,0,0.8)' },
  year: { color: '#d1d5db', fontWeight: 'normal', fontSize: '28px' },
  originalTitle: { fontSize: '16px', color: '#d1d5db', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 1px 4px rgba(0,0,0,0.8)' },
  tagline: { fontSize: '16px', color: '#38bdf8', fontStyle: 'italic', margin: '0', fontWeight: '500', textShadow: '0 1px 4px rgba(0,0,0,0.8)' },
  detailsBox: { backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '25px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #2a2a2a' },
  detailRow: { display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'baseline' },
  detailLabel: { color: '#9ca3af', fontSize: '14px' },
  detailValue: { color: '#f3f4f6', fontSize: '14px' },
  genresContainer: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '30px' },
  genreBadge: { backgroundColor: '#facc15', color: '#000', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', textTransform: 'capitalize', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' },
  
  sectionBlock: { marginTop: '30px' },
  sectionTitle: { fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '15px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' },
  descriptionText: { fontSize: '15px', lineHeight: '1.6', color: '#e5e5e5', margin: 0, textShadow: '0 1px 2px rgba(0,0,0,0.5)' },
  horizontalScroll: { display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px' },
  personCard: { width: '105px', flexShrink: 0, display: 'flex', flexDirection: 'column' },
  peopleGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: '25px 15px', paddingBottom: '20px' },
  gridPersonCard: { width: '100%', display: 'flex', flexDirection: 'column' },
  personPhoto: { width: '100%', height: '155px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px', backgroundColor: '#1a1a1a', boxShadow: '0 4px 6px rgba(0,0,0,0.4)' },
  personName: { fontSize: '13px', fontWeight: 'bold', color: '#fff', lineHeight: '1.2' },
  personRole: { fontSize: '12px', color: '#9ca3af', marginTop: '4px', lineHeight: '1.2' },
  emptyText: { color: '#9ca3af', fontSize: '15px', fontStyle: 'italic', marginTop: '20px' },
  
  loadMoreContainer: { display: 'flex', justifyContent: 'center', padding: '10px 0 30px 0' },
  loadMoreButton: { background: '#2a2a2a', border: '1px solid #444', color: '#fff', padding: '10px 24px', borderRadius: '20px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' },
  imagesGrid: { display: 'grid', gap: '15px', paddingBottom: '20px' },

  premiereContainer: { marginTop: '10px' },
  countryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' },
  countryCard: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' },
  countryCardHeader: { display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #333', paddingBottom: '10px' },
  countryName: { margin: 0, fontSize: '18px', color: '#fff' },
  datesList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  dateItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  dateTypeWrapper: { display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' },
  dateTypeBadge: { backgroundColor: '#2ecc71', color: '#000', fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' },
  dateNote: { color: '#9ca3af', fontSize: '12px', fontStyle: 'italic' },
  dateValue: { color: '#e5e5e5', fontSize: '15px', fontWeight: '500', marginTop: '2px' },

  sourcesContainer: { display: 'flex', flexDirection: 'column', gap: '40px', marginTop: '10px' },
  sourceGroup: { display: 'flex', flexDirection: 'column', gap: '15px' },
  sourceGroupHeader: { display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #333', paddingBottom: '10px' },
  sourceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }
};