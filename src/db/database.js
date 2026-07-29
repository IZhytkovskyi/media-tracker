import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const db = new Database(process.env.DB_FILE || './src/db/tracker.db', { 
    verbose: console.log 
});

db.pragma('journal_mode = WAL');

const initDB = () => {
    // 1. Створюємо базову таблицю, якщо її немає (додані нові поля)
    const createMediaTable = `
        CREATE TABLE IF NOT EXISTS media_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tmdb_id INTEGER UNIQUE,
            imdb_id TEXT UNIQUE,
            title TEXT NOT NULL,
            original_title TEXT,
            media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'series')),
            status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned', 'watching', 'completed', 'dropped', 'on_hold')),
            rating REAL,
            review TEXT,
            season INTEGER DEFAULT 0,
            episode INTEGER DEFAULT 0,
            total_seasons INTEGER DEFAULT 0,
            total_episodes INTEGER DEFAULT 0,
            genres TEXT, -- Будемо зберігати як JSON string: '["Action", "Sci-Fi"]'
            poster_path TEXT,
            backdrop_path TEXT,
            release_date TEXT,
            start_date TEXT,
            finish_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;
    db.exec(createMediaTable);

    // 2. Механізм міграції: перевіряємо, чи існують нові колонки, і якщо ні — додаємо їх
    // Це потрібно на випадок, якщо база вже була створена раніше
    const tableInfo = db.pragma("table_info(media_items)");
    const columnNames = tableInfo.map(col => col.name);

    const columnsToAdd = [
        { name: 'original_title', type: 'TEXT' },
        { name: 'total_seasons', type: 'INTEGER DEFAULT 0' },
        { name: 'total_episodes', type: 'INTEGER DEFAULT 0' },
        { name: 'genres', type: 'TEXT' },
        { name: 'backdrop_path', type: 'TEXT' },
        { name: 'release_date', type: 'TEXT' }
    ];

    columnsToAdd.forEach(col => {
        if (!columnNames.includes(col.name)) {
            console.log(`Додавання нової колонки: ${col.name}`);
            db.exec(`ALTER TABLE media_items ADD COLUMN ${col.name} ${col.type}`);
        }
    });

    // 3. Тригер для автооновлення часу
    const createUpdateTrigger = `
        CREATE TRIGGER IF NOT EXISTS update_media_items_time 
        AFTER UPDATE ON media_items
        BEGIN
            UPDATE media_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `;
    db.exec(createUpdateTrigger);
    
    console.log('Ініціалізація бази даних та міграції завершені.');
};

initDB();

export default db;