import sys

# Гарантируем UTF-8 вывод в любой Windows-консоли (cp1251 / cp866)
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import asyncio
import uvicorn
from contextlib import asynccontextmanager

from config import CHECK_INTERVAL_SECONDS, TELEGRAM_BOT_TOKEN
from database import init_db
from harvester import LeadHarvester
from bot import get_bot_instance, broadcast_lead, dp
from web_ui import app

# Фоновая задача авто-сканера
harvester_task = None
bot_task = None

async def background_harvester_loop():
    """Фоновый цикл периодического мониторинга заказов"""
    print("[Autopilot] Фоновый сканер заказов запущен...")
    harvester = LeadHarvester(on_new_lead=broadcast_lead)
    
    # Первичный сбор при старте
    try:
        new_cnt = await harvester.run_cycle()
        print(f"[Autopilot] Первичный проход завершен. Новых заказов: {new_cnt}")
    except Exception as e:
        print(f"[Autopilot Error] {e}")

    while True:
        try:
            await asyncio.sleep(CHECK_INTERVAL_SECONDS)
            new_cnt = await harvester.run_cycle()
            if new_cnt > 0:
                print(f"[Autopilot] Найдено и обработано новых заказов: {new_cnt}")
        except asyncio.CancelledError:
            print("[Autopilot] Сканер остановлен.")
            break
        except Exception as e:
            print(f"[Autopilot Loop Error] {e}")
            await asyncio.sleep(10)

async def start_telegram_bot():
    """Запуск Telegram-бота, если токен указан в настройках"""
    bot = get_bot_instance()
    if not bot or not dp:
        print("[Telegram Bot] TELEGRAM_BOT_TOKEN не задан. Бот работает в режиме Web Dashboard.")
        return

    try:
        print("[Telegram Bot] Запуск polling Telegram-бота...")
        await dp.start_polling(bot)
    except asyncio.CancelledError:
        print("[Telegram Bot] Бот остановлен.")
    except Exception as e:
        print(f"[Telegram Bot Error] Не удалось подключиться к Telegram API: {e}")
        print("[Telegram Bot] Работа продолжается через локальный веб-интерфейс.")

@asynccontextmanager
async def lifespan(app_instance):
    # Startup
    print("=" * 60)
    print("🚀 AI LEAD SNIPER ЗАПУСКАЕТСЯ...")
    print("=" * 60)
    await init_db()

    # Запуск фонового сканера
    loop = asyncio.get_running_loop()
    h_task = loop.create_task(background_harvester_loop())
    
    # Запуск бота при наличии токена
    b_task = None
    if TELEGRAM_BOT_TOKEN:
        b_task = loop.create_task(start_telegram_bot())

    yield

    # Shutdown
    h_task.cancel()
    if b_task:
        b_task.cancel()

# Назначаем lifespan приложению FastAPI
app.router.lifespan_context = lifespan

def main():
    print("\n" + "=" * 50)
    print(">>> OTKROY BRAUZER: http://127.0.0.1:8000")
    print("=" * 50 + "\n")
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info"
    )

if __name__ == "__main__":
    main()
