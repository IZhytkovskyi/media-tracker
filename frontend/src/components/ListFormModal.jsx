// frontend/src/components/ListFormModal.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ListFormModal({ isOpen, onClose, onSubmit, initialData }) {
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (isOpen) {
      setFormData({ 
        name: initialData?.name || '', 
        description: initialData?.description || '' 
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData, initialData?.id);
  };

  return (
    <div className="home-modal-overlay" onClick={onClose}>
      <div className="home-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="home-modal-header">
          <h2 className="home-modal-title">{initialData?.id ? 'Редагувати список' : 'Новий список'}</h2>
          <button className="home-close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Назва *</label>
            <input type="text" required placeholder="Назва списку" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="home-search-input" autoFocus />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Опис (необов'язково)</label>
            <textarea placeholder="Короткий опис..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="home-search-input" style={{ minHeight: '80px', resize: 'vertical', paddingLeft: '14px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="home-search-submit-btn" style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8' }} onClick={onClose}>Скасувати</button>
            <button type="submit" className="home-search-submit-btn" style={{ background: '#38bdf8', color: '#000' }}>Зберегти</button>
          </div>
        </form>
      </div>
    </div>
  );
}