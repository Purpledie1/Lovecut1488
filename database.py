import aiosqlite
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from config import DB_PATH

async def init_db():
    """Инициализация таблиц базы данных SQLite"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                external_id TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                link TEXT NOT NULL,
                raw_text TEXT,
                budget TEXT,
                category TEXT,
                score INTEGER DEFAULT 0,
                summary TEXT,
                pitch TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS subscribers (
                telegram_id INTEGER PRIMARY KEY,
                username TEXT,
                category TEXT DEFAULT 'Все категории',
                min_score INTEGER DEFAULT 6,
                is_active INTEGER DEFAULT 1,
                trial_until TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()

async def is_lead_exists(external_id: str) -> bool:
    """Проверка, обрабатывался ли лид ранее"""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT 1 FROM leads WHERE external_id = ?", (external_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return row is not None

async def save_lead(
    source: str,
    external_id: str,
    title: str,
    link: str,
    raw_text: str,
    budget: str,
    category: str,
    score: int,
    summary: str,
    pitch: str
) -> Optional[int]:
    """Сохранение нового лида в базу"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            cursor = await db.execute("""
                INSERT OR IGNORE INTO leads 
                (source, external_id, title, link, raw_text, budget, category, score, summary, pitch)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (source, external_id, title, link, raw_text, budget, category, score, summary, pitch))
            await db.commit()
            return cursor.lastrowid
    except Exception as e:
        print(f"[DB Error] Ошибка сохранения лида: {e}")
        return None

async def get_recent_leads(limit: int = 20, min_score: int = 5) -> List[Dict[str, Any]]:
    """Получение последних качественных заказов"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT * FROM leads 
            WHERE score >= ? 
            ORDER BY id DESC 
            LIMIT ?
        """, (min_score, limit)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def add_or_update_subscriber(telegram_id: int, username: Optional[str] = None):
    """Регистрация нового подписчика с 3-дневным VIP триалом"""
    trial_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO subscribers (telegram_id, username, trial_until)
            VALUES (?, ?, ?)
            ON CONFLICT(telegram_id) DO UPDATE SET
                username = COALESCE(excluded.username, subscribers.username),
                is_active = 1
        """, (telegram_id, username, trial_date))
        await db.commit()

async def get_active_subscribers() -> List[Dict[str, Any]]:
    """Получение всех активных подписчиков для рассылки"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT * FROM subscribers WHERE is_active = 1
        """) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
