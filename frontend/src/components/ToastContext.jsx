// frontend/src/components/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = (msg) => addToast(msg, 'success');
  const error = (msg) => addToast(msg, 'error');
  const info = (msg) => addToast(msg, 'info');

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div style={toastContainerStyle}>
        {toasts.map(toast => (
          <div key={toast.id} style={{ ...toastStyle, borderLeft: `4px solid ${getToastColor(toast.type)}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getToastIcon(toast.type)}
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#f8fafc' }}>{toast.message}</span>
            </div>
            <button onClick={() => removeToast(toast.id)} style={closeBtnStyle}><X size={16} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const getToastColor = (type) => {
  if (type === 'success') return '#2ecc71';
  if (type === 'error') return '#ef4444';
  return '#38bdf8';
};

const getToastIcon = (type) => {
  if (type === 'success') return <CheckCircle size={18} color="#2ecc71" />;
  if (type === 'error') return <AlertCircle size={18} color="#ef4444" />;
  return <Info size={18} color="#38bdf8" />;
};

const toastContainerStyle = { position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999 };
const toastStyle = { background: '#1e293b', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '250px' };
const closeBtnStyle = { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' };