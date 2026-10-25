import os
from pathlib import Path
from dotenv import load_dotenv

# Загрузка переменных окружения из .env
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

# Токены и ключи
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
TELEGRAM_PROXY = os.getenv("TELEGRAM_PROXY", "").strip()  # например: socks5://user:pass@host:port или http://host:port

# Настройки парсинга
CHECK_INTERVAL_SECONDS = int(os.getenv("CHECK_INTERVAL_SECONDS", "45"))
MIN_SCORE_THRESHOLD = int(os.getenv("MIN_SCORE_THRESHOLD", "6"))  # Лиды от 6 из 10

# База данных
DB_PATH = BASE_DIR / "leads.db"

# Источники заказов (RSS и каналы)
RSS_SOURCES = [
    {
        "name": "FL.ru",
        "url": "https://www.fl.ru/rss/all.xml",
        "type": "rss"
    }
]

# Категории для фильтрации
CATEGORIES = [
    "Все категории",
    "Веб-разработка & Сайты",
    "Боты & Автоматизация",
    "Парсинг & Данные",
    "Дизайн & UI/UX",
    "Копирайтинг & Тексты",
    "Видео & Монтаж"
]
