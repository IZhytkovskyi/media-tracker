import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MediaDetail from './pages/MediaDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Головна сторінка зі списком */}
        <Route path="/" element={<Home />} />
        {/* Детальна сторінка конкретного тайтлу */}
        <Route path="/media/:id" element={<MediaDetail />} />
      </Routes>
    </BrowserRouter>
  );
}