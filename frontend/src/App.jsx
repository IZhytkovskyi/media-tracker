// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MediaDetail from './pages/MediaDetail';
import SeasonDetail from './pages/SeasonDetail';
import EpisodeDetail from './pages/EpisodeDetail';
import PersonDetail from './pages/PersonDetail'; // НОВИЙ ІМПОРТ

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Фільми та серіали (зовнішній пошук та локальна база) */}
        <Route path="/media/:type/:tmdbId" element={<MediaDetail />} />
        
        {/* Деталі сезону та епізоду по tmdbId */}
        <Route path="/media/:type/:tmdbId/season/:seasonNumber" element={<SeasonDetail />} />
        <Route path="/media/:type/:tmdbId/season/:seasonNumber/episode/:episodeNumber" element={<EpisodeDetail />} />

        {/* НОВЕ: Сторінка Актора/Творця */}
        <Route path="/person/:id" element={<PersonDetail />} />
      </Routes>
    </BrowserRouter>
  );
}