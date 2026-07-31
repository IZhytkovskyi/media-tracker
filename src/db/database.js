import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const db = new Database(process.env.DB_FILE || './src/db/tracker.db', {
    // Прибрано verbose: console.log
});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initDB = () => {
    // 1. Таблиця медіа
    const createMediaTable = `
        CREATE TABLE IF NOT EXISTS media_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tmdb_id INTEGER UNIQUE,
            imdb_id TEXT UNIQUE,
            external_id TEXT,
            title TEXT NOT NULL,
            original_title TEXT,
            media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'series', 'book', 'game', 'comic', 'manga')),
            status TEXT CHECK(status IS NULL OR status IN ('planned', 'watching', 'completed', 'dropped', 'on_hold')),
            rating REAL,
            review TEXT,
            season INTEGER DEFAULT 0,
            episode INTEGER DEFAULT 0,
            current_progress INTEGER DEFAULT 0,
            total_seasons INTEGER DEFAULT 0,
            total_episodes INTEGER DEFAULT 0,
            total_progress INTEGER DEFAULT 0,
            genres TEXT,
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

    // 2. Таблиця логів перегляду
    const createLogsTable = `
        CREATE TABLE IF NOT EXISTS watch_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id INTEGER NOT NULL,
            watch_date TEXT,
            comment TEXT,
            rating REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (media_id) REFERENCES media_items (id) ON DELETE CASCADE
        );
    `;
    db.exec(createLogsTable);

    // 3. Міграції для watch_logs
    const logTableInfo = db.pragma("table_info(watch_logs)");
    const logColumnNames = logTableInfo.map(col => col.name);

    if (!logColumnNames.includes('watch_date')) {
        db.exec(`ALTER TABLE watch_logs ADD COLUMN watch_date TEXT`);
    }
    if (!logColumnNames.includes('comment')) {
        db.exec(`ALTER TABLE watch_logs ADD COLUMN comment TEXT`);
    }

    // 4. Тригер оновлення часу
    const createUpdateTrigger = `
        CREATE TRIGGER IF NOT EXISTS update_media_items_time 
         AFTER UPDATE ON media_items
        BEGIN
            UPDATE media_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `;
    db.exec(createUpdateTrigger);

    console.log('База даних ініціалізована успішно.');
};

initDB();

export default db;