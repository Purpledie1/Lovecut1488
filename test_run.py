import asyncio
import sys
from database import init_db, get_recent_leads
from harvester import LeadHarvester

async def test():
    sys.stdout.reconfigure(encoding='utf-8')
    print("1. Инициализация базы данных...")
    await init_db()
    print("   [OK] База данных готова.")

    print("2. Запуск тестового сбора лидов...")
    h = LeadHarvester()
    count = await h.run_cycle()
    print(f"   [OK] Собрано и проанализировано новых лидов: {count}")

    print("3. Проверка сохраненных данных в SQLite...")
    leads = await get_recent_leads(limit=5, min_score=1)
    print(f"   [OK] Извлечено записей: {len(leads)}")
    for i, item in enumerate(leads, 1):
        print(f"   [{i}] Категория: {item['category']} | Оценка: {item['score']}/10 | Бюджет: {item['budget']}")
        print(f"       Заказ: {item['title']}")
        print(f"       Отклик: {item['pitch'][:100]}...\n")

if __name__ == "__main__":
    asyncio.run(test())
