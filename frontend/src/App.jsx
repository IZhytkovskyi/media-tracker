// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext';
import Home from './pages/Home';
import MediaDetail from './pages/MediaDetail';
import SeasonDetail from './pages/SeasonDetail';
import EpisodeDetail from './pages/EpisodeDetail';
import PersonDetail from './pages/PersonDetail';
import Stats from './pages/Stats';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/media/:type/:tmdbId" element={<MediaDetail />} />
          <Route path="/media/:type/:tmdbId/season/:seasonNumber" element={<SeasonDetail />} />
          <Route path="/media/:type/:tmdbId/season/:seasonNumber/episode/:episodeNumber" element={<EpisodeDetail />} />
          <Route path="/person/:id" element={<PersonDetail />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}