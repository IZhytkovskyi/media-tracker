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
      'Costume Design': isFemale ? 'Художниця з костюмів' : 'Художник з костюмів',
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

// Нова функція для отримання середнього кольору зображення
export const getAverageColor = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    // Важливо для обходу CORS при використанні canvas
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
        resolve('10, 10, 10'); // Резервний темний колір у разі помилки
      }
    };
    img.onerror = () => resolve('10, 10, 10');
  });
};