// src/db/database.js
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const db = new Database(process.env.DB_FILE || './src/db/tracker.db', {
    // verbose: console.log
});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initDB = () => {
    // 1. Основна таблиця медіа (без статусів і дат перегляду)
    const createMediaTable = `
        CREATE TABLE IF NOT EXISTS media_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tmdb_id INTEGER,
            imdb_id TEXT UNIQUE,
            external_id TEXT UNIQUE,
            parent_id INTEGER REFERENCES media_items(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            original_title TEXT,
            media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'series', 'season', 'episode', 'book', 'game', 'comic', 'manga')),
            user_rating REAL,
            review TEXT,
            season INTEGER DEFAULT 0,
            episode INTEGER DEFAULT 0,
            total_seasons INTEGER DEFAULT 0,
            total_episodes INTEGER DEFAULT 0,
            genres TEXT,
            poster_path TEXT,
            backdrop_path TEXT,
            release_date TEXT,
            next_episode_cache TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;
    db.exec(createMediaTable);

    // 2. Історія переглядів (Trakt History)
    const createHistoryTable = `
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id INTEGER NOT NULL,
            watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (media_id) REFERENCES media_items (id) ON DELETE CASCADE
        );
    `;
    db.exec(createHistoryTable);

    // 3. У планах (Trakt Watchlist)
    const createWatchlistTable = `
        CREATE TABLE IF NOT EXISTS watchlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id INTEGER UNIQUE NOT NULL,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (media_id) REFERENCES media_items (id) ON DELETE CASCADE
        );
    `;
    db.exec(createWatchlistTable);

    // 4. Кастомні списки
    const createCustomListsTable = `
        CREATE TABLE IF NOT EXISTS custom_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;
    db.exec(createCustomListsTable);

    const createListItemsTable = `
        CREATE TABLE IF NOT EXISTS list_items (
            list_id INTEGER REFERENCES custom_lists(id) ON DELETE CASCADE,
            media_id INTEGER REFERENCES media_items(id) ON DELETE CASCADE,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (list_id, media_id)
        );
    `;
    db.exec(createListItemsTable);

    // Тригери для updated_at
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_media_items_time
           AFTER UPDATE ON media_items
        BEGIN
            UPDATE media_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);

    db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_custom_lists_time
           AFTER UPDATE ON custom_lists
        BEGIN
            UPDATE custom_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);

    // Індекси для швидкодії
    db.exec(`CREATE INDEX IF NOT EXISTS idx_media_parent ON media_items(parent_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(media_type);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_history_media ON history(media_id);`);
    
    console.log('База даних успішно ініціалізована за новою логікою Trakt.');
};

initDB();

export default db;