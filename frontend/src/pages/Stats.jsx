// frontend/src/pages/Stats.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, Film, Tv, Activity, Target, Star, Calendar, TrendingUp } from 'lucide-react';
import { api } from '../utils/api';

export default function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.getStats();
        setStats(res.data);
      } catch (err) {
        console.error('Помилка завантаження статистики:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="stats-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Обчислення максимальних значень для пропорцій графіків
  const maxGenreCount = stats?.topGenres?.length > 0 ? Math.max(...stats.topGenres.map(g => g.count)) : 1;
  const maxActivityCount = stats?.activity?.length > 0 ? Math.max(...stats.activity.map(a => a.count)) : 1;
  const maxRatingCount = stats?.ratings?.length > 0 ? Math.max(...stats.ratings.map(r => r.count)) : 1;
  const maxDailyCount = stats?.dailyActivity?.length > 0 ? Math.max(...stats.dailyActivity.map(d => d.count)) : 1;

  // Генерація масиву останніх 30 днів для безперервного графіка активності
  const last30Days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  const dailyMap = new Map((stats?.dailyActivity || []).map(d => [d.date, d.count]));

  return (
    <div className="stats-container">
      <header className="stats-header">
        <button onClick={() => navigate('/')} className="nav-btn">
          <ArrowLeft size={18} /> Назад
        </button>
        <h1 className="page-title"><BarChart2 size={24} color="#38bdf8" /> Твоя Статистика</h1>
        <div style={{ width: '85px' }}></div> {/* Placeholder для балансу */}
      </header>

      <main className="stats-main">
        {/* Блок KPI (Головні цифри) */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon bg-blue"><Film size={24} color="#38bdf8" /></div>
            <div className="kpi-info">
              <span className="kpi-label">Фільмів</span>
              <span className="kpi-value">{stats?.movies || 0}</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon bg-purple"><Tv size={24} color="#c084fc" /></div>
            <div className="kpi-info">
              <span className="kpi-label">Епізодів</span>
              <span className="kpi-value">{stats?.episodes || 0}</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon bg-green"><Target size={24} color="#2ecc71" /></div>
            <div className="kpi-info">
              <span className="kpi-label">Всього переглядів</span>
              <span className="kpi-value">{(stats?.movies || 0) + (stats?.episodes || 0)}</span>
            </div>
          </div>
        </div>

        {/* Щоденна активність (Heatmap-подібний графік) */}
        <div className="chart-card full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h3 className="chart-title" style={{ margin: 0 }}><TrendingUp size={18} color="#2ecc71" /> Активність за 30 днів</h3>
          </div>
          <div className="sparkline-container">
            {last30Days.map(dateStr => {
              const count = dailyMap.get(dateStr) || 0;
              const heightPercent = count > 0 ? Math.max(10, (count / maxDailyCount) * 100) : 0;
              return (
                <div key={dateStr} className="sparkline-bar-wrapper" title={`${dateStr}: ${count} переглядів`}>
                  <div className="sparkline-bar" style={{ 
                      height: `${heightPercent}%`, 
                      backgroundColor: count > 0 ? '#2ecc71' : '#1e293b' 
                  }}></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="charts-grid">
          {/* Улюблені жанри */}
          <div className="chart-card">
            <h3 className="chart-title"><Activity size={18} color="#facc15" /> Топ Жанрів</h3>
            {stats?.topGenres?.length > 0 ? (
              <div className="bar-list">
                {stats.topGenres.map((genre, idx) => (
                  <div key={idx} className="bar-item">
                    <div className="bar-label">
                      <span className="bar-name">{genre.name}</span>
                      <span className="bar-count">{genre.count}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill bg-yellow" style={{ width: `${(genre.count / maxGenreCount) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">Немає даних.</p>
            )}
          </div>

          {/* Розподіл оцінок */}
          <div className="chart-card">
            <h3 className="chart-title"><Star size={18} color="#f59e0b" /> Розподіл оцінок</h3>
            {stats?.ratings?.length > 0 ? (
              <div className="bar-list">
                {stats.ratings.map((ratingObj, idx) => (
                  <div key={idx} className="bar-item">
                    <div className="bar-label">
                      <span className="bar-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {ratingObj.rating} <Star size={12} fill="#f59e0b" color="#f59e0b" />
                      </span>
                      <span className="bar-count">{ratingObj.count}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ backgroundColor: '#f59e0b', width: `${(ratingObj.count / maxRatingCount) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">Оцінки ще не виставлялись.</p>
            )}
          </div>

          {/* Активність по місяцях */}
          <div className="chart-card">
            <h3 className="chart-title"><BarChart2 size={18} color="#38bdf8" /> Перегляди (Місяці)</h3>
            {stats?.activity?.length > 0 ? (
              <div className="activity-chart">
                {stats.activity.map((monthData, idx) => (
                  <div key={idx} className="activity-col">
                    <div className="activity-bar-track">
                      <div className="activity-bar-fill bg-blue-solid" style={{ height: `${(monthData.count / maxActivityCount) * 100}%` }}>
                        <span className="activity-tooltip">{monthData.count}</span>
                      </div>
                    </div>
                    <span className="activity-label">{monthData.month.split('-')[1]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">Немає даних.</p>
            )}
          </div>

          {/* Популярні роки релізу */}
          <div className="chart-card">
            <h3 className="chart-title"><Calendar size={18} color="#c084fc" /> Популярні роки релізу</h3>
            {stats?.releaseYears?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {stats.releaseYears.map((yearObj, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#1a1a1a', padding: '12px 16px', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                    <div style={{ color: '#c084fc', fontWeight: 'bold', fontSize: '18px', minWidth: '30px' }}>#{idx + 1}</div>
                    <div style={{ flex: 1, color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>{yearObj.year}</div>
                    <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#2a2a2a', padding: '4px 10px', borderRadius: '20px' }}>{yearObj.count} медіа</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">Немає даних.</p>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .stats-container { background-color: #0a0a0a; color: #f3f4f6; min-height: 100vh; padding: 30px 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .stats-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; max-width: 1100px; margin-left: auto; margin-right: auto; }
        .page-title { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 24px; color: #fff; }
        .nav-btn { background: rgba(20, 20, 20, 0.85); border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; transition: all 0.2s ease; }
        .nav-btn:hover { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border-color: #38bdf8; transform: translateX(-2px); }
        
        .stats-main { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px; padding-bottom: 50px; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .kpi-card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px; display: flex; align-items: center; gap: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); }
        .kpi-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; justify-content: center; align-items: center; flex-shrink: 0; }
        .bg-blue { background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); }
        .bg-purple { background: rgba(192, 132, 252, 0.15); border: 1px solid rgba(192, 132, 252, 0.3); }
        .bg-green { background: rgba(46, 204, 113, 0.15); border: 1px solid rgba(46, 204, 113, 0.3); }
        .kpi-info { display: flex; flex-direction: column; }
        .kpi-label { color: #94a3b8; font-size: 14px; font-weight: 500; margin-bottom: 4px; }
        .kpi-value { color: #fff; font-size: 28px; font-weight: 800; line-height: 1; }

        .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px; }
        .chart-card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); }
        .full-width { grid-column: 1 / -1; }
        .chart-title { display: flex; align-items: center; gap: 10px; margin: 0 0 24px 0; color: #fff; font-size: 18px; }
        
        /* Sparkline (Daily Activity) */
        .sparkline-container { display: flex; align-items: flex-end; justify-content: space-between; height: 100px; gap: 4px; padding-top: 10px; }
        .sparkline-bar-wrapper { flex: 1; height: 100%; display: flex; align-items: flex-end; cursor: pointer; transition: opacity 0.2s; }
        .sparkline-bar-wrapper:hover { opacity: 0.7; }
        .sparkline-bar { width: 100%; border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1); }

        /* Bar List */
        .bar-list { display: flex; flex-direction: column; gap: 16px; }
        .bar-item { display: flex; flex-direction: column; gap: 6px; }
        .bar-label { display: flex; justify-content: space-between; font-size: 14px; }
        .bar-name { color: #cbd5e1; font-weight: 500; }
        .bar-count { color: #94a3b8; font-weight: bold; }
        .bar-track { height: 8px; background: #1e293b; border-radius: 4px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 4px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }
        .bg-yellow { background: linear-gradient(90deg, #ca8a04, #facc15); }

        /* Vertical Bar Chart */
        .activity-chart { display: flex; align-items: flex-end; justify-content: space-around; height: 250px; padding-top: 30px; border-bottom: 1px solid #334155; padding-bottom: 10px; }
        .activity-col { display: flex; flex-direction: column; align-items: center; gap: 12px; height: 100%; width: 40px; }
        .activity-bar-track { flex-grow: 1; width: 100%; background: #1e293b; border-radius: 6px; display: flex; align-items: flex-end; position: relative; }
        .activity-bar-fill { width: 100%; border-radius: 6px; transition: height 1s cubic-bezier(0.4, 0, 0.2, 1); position: relative; cursor: pointer; }
        .bg-blue-solid { background: linear-gradient(0deg, #0284c7, #38bdf8); }
        .activity-label { color: #94a3b8; font-size: 13px; font-weight: 600; }
        .activity-tooltip { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: #fff; color: #000; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
        .activity-bar-fill:hover .activity-tooltip { opacity: 1; }

        .empty-text { color: #64748b; font-style: italic; }
        .spinner { width: 40px; height: 40px; border: 3px solid rgba(56, 189, 248, 0.2); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}