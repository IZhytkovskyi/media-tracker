import Database from 'better-sqlite3';
import dotenv from 'dotenv';
dotenv.config();

const db = new Database(process.env.DB_FILE || './src/db/tracker.db', {
    // verbose: console.log
});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initDB = () => {
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

    const createLogsTable = `
        CREATE TABLE IF NOT EXISTS watch_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id INTEGER NOT NULL,
            start_date TEXT,
            finish_date TEXT,
            comment TEXT,
            rating REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (media_id) REFERENCES media_items (id) ON DELETE CASCADE
        );
    `;
    db.exec(createLogsTable);

    // НОВІ ТАБЛИЦІ ДЛЯ СПИСКІВ
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

    const mediaTableInfo = db.pragma("table_info(media_items)");
    const mediaColumnNames = mediaTableInfo.map(col => col.name);
    if (!mediaColumnNames.includes('external_id')) db.exec(`ALTER TABLE media_items ADD COLUMN external_id TEXT UNIQUE`);
    if (!mediaColumnNames.includes('parent_id')) db.exec(`ALTER TABLE media_items ADD COLUMN parent_id INTEGER REFERENCES media_items(id) ON DELETE CASCADE`);

    const logTableInfo = db.pragma("table_info(watch_logs)");
    const logColumnNames = logTableInfo.map(col => col.name);
    if (!logColumnNames.includes('start_date')) db.exec(`ALTER TABLE watch_logs ADD COLUMN start_date TEXT`);
    if (!logColumnNames.includes('finish_date')) {
        db.exec(`ALTER TABLE watch_logs ADD COLUMN finish_date TEXT`);
        if (logColumnNames.includes('watch_date')) {
            db.exec(`UPDATE watch_logs SET finish_date = watch_date WHERE finish_date IS NULL`);
        }
    }

    const createUpdateTrigger = `
        CREATE TRIGGER IF NOT EXISTS update_media_items_time
           AFTER UPDATE ON media_items
        BEGIN
            UPDATE media_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `;
    db.exec(createUpdateTrigger);

    const createListUpdateTrigger = `
        CREATE TRIGGER IF NOT EXISTS update_custom_lists_time
           AFTER UPDATE ON custom_lists
        BEGIN
            UPDATE custom_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `;
    db.exec(createListUpdateTrigger);

    console.log('База даних ініціалізована.');
};

initDB();
export default db;