// frontend/src/utils/api.js
const request = async (url, options = {}) => {
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Сталася помилка при запиті до сервера');
    }
    return data;
};

export const api = {
    getMedia: (params = '') => request(`/api/media${params}`),
    getLists: () => request('/api/lists'),
    getUpcoming: () => request('/api/media/upcoming'),
    getListItems: (listId) => request(`/api/lists/${listId}/items`),
    searchTMDB: (query) => request(`/api/external/tmdb/search?query=${encodeURIComponent(query)}`),
    getMediaByExternalId: (extId) => request(`/api/media/external/${extId}`),
    
    createMedia: (data) => request('/api/media', { method: 'POST', body: JSON.stringify(data) }),
    updateMedia: (id, updates) => request(`/api/media/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    deleteMedia: (id) => request(`/api/media/${id}`, { method: 'DELETE' }),
    watchNextEpisode: (seriesId) => request(`/api/media/${seriesId}/watch-next`, { method: 'POST' }),

    addToList: (listId, mediaId) => request(`/api/lists/${listId}/items`, { method: 'POST', body: JSON.stringify({ media_id: mediaId }) }),
    removeFromList: (listId, mediaId) => request(`/api/lists/${listId}/items/${mediaId}`, { method: 'DELETE' }),
    
    createList: (data) => request('/api/lists', { method: 'POST', body: JSON.stringify(data) }),
    updateList: (id, data) => request(`/api/lists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteList: (id) => request(`/api/lists/${id}`, { method: 'DELETE' }),
};