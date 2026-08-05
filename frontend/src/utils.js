// frontend/src/utils.js

export const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getJobTranslation = (job, gender) => {
  const isFemale = gender === 1;
  const translations = {
      'Director': isFemale ? 'Режисерка' : 'Режисер',
      'Screenplay': isFemale ? 'Сценаристка' : 'Сценарист',
      'Writer': isFemale ? 'Сценаристка' : 'Сценарист',
      'Story': isFemale ? 'Авторка історії' : 'Автор історії',
      'Director of Photography': isFemale ? 'Операторка' : 'Оператор',
      'Original Music Composer': isFemale ? 'Композиторка' : 'Композитор',
      'Music': isFemale ? 'Композиторка' : 'Композитор',
      'Producer': isFemale ? 'Продюсерка' : 'Продюсер',
      'Executive Producer': isFemale ? 'Виконавча продюсерка' : 'Виконавчий продюсер',
      'Co-Producer': isFemale ? 'Співпродюсерка' : 'Співпродюсер',
      'Editor': isFemale ? 'Монтажерка' : 'Монтажер',
      'Production Design': 'Художник-постановник',
      'Art Direction': 'Артдиректор',
      'Set Decoration': 'Декоратор',
      'Costume Design': isFemale ? 'Художниця по костюмах' : 'Художник по костюмах',
      'Makeup Artist': 'Гример',
      'Hairstylist': 'Стиліст зачісок',
      'Casting': 'Кастинг-директор',
      'Sound Designer': 'Звукорежисер',
      'Visual Effects Supervisor': 'Супервайзер візуальних ефектів',
      'Stunt Coordinator': 'Постановник трюків',
      'Creator': isFemale ? 'Творчиня' : 'Творець'
  };
  return translations[job] || job;
};

export const getAverageColor = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    // CORS для того, щоб не було помилок малювання на canvas
    img.crossOrigin = 'Anonymous'; 
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        let count = 0;
        
        // Беремо кожен 10-й піксель (4 канали * 10 = 40) для швидкодії
        for (let i = 0; i < data.length; i += 40) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        resolve(`${r}, ${g}, ${b}`);
      } catch (e) {
        resolve('10, 10, 10'); // Запасний темний колір
      }
    };
    img.onerror = () => resolve('10, 10, 10');
  });
};

/**
 * Оптимізація: Єдина функція для формування URL зображень з TMDB.
 * @param {string} path - Шлях до зображення (наприклад, /kqjL17yufvn9OVLyXYpvtyrFfak.jpg)
 * @param {string} size - Розмір зображення (w92, w154, w185, w342, w500, w780, original)
 * @param {string} fallbackText - Текст для заглушки, якщо зображення немає
 */
export const getTmdbImage = (path, size = 'w500', fallbackText = 'Немає+Зображення') => {
  if (!path || path === 'null') {
    // Формуємо розміри для плейсхолдера на основі запитуваного розміру
    let dims = '300x450';
    if (size === 'w92') dims = '92x138';
    if (size === 'w154') dims = '154x231';
    if (size === 'w185' || size === 'w300') dims = '300x170'; // Для кадрів з епізодів
    if (size === 'w780' || size === 'original') dims = '1280x720';
    
    return `https://via.placeholder.com/${dims}?text=${fallbackText}`;
  }
  
  if (path.startsWith('http')) return path;
  
  return `https://image.tmdb.org/t/p/${size}${path}`;
};