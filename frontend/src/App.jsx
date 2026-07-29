import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MediaDetail from './pages/MediaDetail';
import SeasonDetail from './pages/SeasonDetail';
import EpisodeDetail from './pages/EpisodeDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Універсальна сторінка для фільмів та серіалів (як з колекції, так і нових) */}
        <Route path="/media/:type/:tmdbId" element={<MediaDetail />} />
        
        {/* Сторінки сезонів та серій також прив'язуємо до tmdbId */}
        <Route path="/media/:type/:tmdbId/season/:seasonNumber" element={<SeasonDetail />} />
        <Route path="/media/:type/:tmdbId/season/:seasonNumber/episode/:episodeNumber" element={<EpisodeDetail />} />
      </Routes>
    </BrowserRouter>
  );
}