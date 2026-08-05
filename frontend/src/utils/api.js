// frontend/src/utils/api.js
const request = async (url, options = {}) => {
    const headers = { ...options.headers };
    
    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
        ...options,
        headers,
    });

    let data;
    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
        data = await res.json();
    } else {
        const text = await res.text();
        try { 
            data = text ? JSON.parse(text) : {}; 
        } catch (e) { 
            data = { message: text }; 
        }
    }

    if (!res.ok) throw new Error(data.error || 'Сталася помилка при запиті');
    return data;
};

export const api = {
    getMedia: (params = '') => request(`/api/media${params}`),
    getUpcoming: () => request('/api/media/upcoming'),
    getMediaById: (id) => request(`/api/media/${id}`),
    getMediaByExternalId: (extId) => request(`/api/media/external/${extId}`),
    getMediaChildren: (id) => request(`/api/media/${id}/children`),
    
    createMedia: (data) => request('/api/media', { method: 'POST', body: JSON.stringify(data) }),
    updateMedia: (id, updates) => request(`/api/media/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    deleteMedia: (id) => request(`/api/media/${id}`, { method: 'DELETE' }),
    
    watchNextEpisode: (seriesId) => request(`/api/media/${seriesId}/watch-next`, { method: 'POST' }),
    
    getHistory: (id) => request(`/api/media/${id}/history`),
    addToHistory: (id, data = {}) => request(`/api/media/${id}/history`, { method: 'POST', body: JSON.stringify(data) }),
    removeFromHistory: (id) => request(`/api/media/${id}/history`, { method: 'DELETE' }),
    
    updateHistoryRecord: (historyId, data) => request(`/api/history/${historyId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    removeHistoryRecord: (historyId) => request(`/api/history/${historyId}`, { method: 'DELETE' }),
    
    toggleWatchlist: (id) => request(`/api/media/${id}/watchlist`, { method: 'POST' }),
    
    getLists: () => request('/api/lists'),
    getListItems: (listId) => request(`/api/lists/${listId}/items`),
    createList: (data) => request('/api/lists', { method: 'POST', body: JSON.stringify(data) }),
    updateList: (id, data) => request(`/api/lists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteList: (id) => request(`/api/lists/${id}`, { method: 'DELETE' }),
    addToList: (listId, mediaId) => request(`/api/lists/${listId}/items`, { method: 'POST', body: JSON.stringify({ media_id: mediaId }) }),
    removeFromList: (listId, mediaId) => request(`/api/lists/${listId}/items/${mediaId}`, { method: 'DELETE' }),
    getListsForMedia: (mediaId) => request(`/api/media/${mediaId}/lists`),
    
    searchTMDB: (query) => request(`/api/external/tmdb/search?query=${encodeURIComponent(query)}`),
    getStats: () => request('/api/stats/general'),
    
    syncMetadata: () => request('/api/settings/sync-metadata', { method: 'POST' }),
    importData: (data) => request('/api/settings/import', { method: 'POST', body: JSON.stringify(data) }),
    
    exportDatabase: async () => {
        const res = await fetch('/api/settings/export');
        if (!res.ok) throw new Error('Помилка завантаження файлу БД');
        
        const blob = await res.blob();
        
        const contentDisposition = res.headers.get('content-disposition');
        let filename = 'tracker_backup.db';
        if (contentDisposition && contentDisposition.includes('filename=')) {
            filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        a.remove();
        window.URL.revokeObjectURL(url);
    }
};