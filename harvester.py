import asyncio
import httpx
import feedparser
from typing import List, Dict, Any, Callable, Optional
from config import RSS_SOURCES, MIN_SCORE_THRESHOLD
from database import is_lead_exists, save_lead
from ai_filter import analyze_lead_with_ai, clean_html

class LeadHarvester:
    def __init__(self, on_new_lead: Optional[Callable[[Dict[str, Any]], Any]] = None):
        self.on_new_lead = on_new_lead
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    async def fetch_rss(self, url: str) -> List[Dict[str, Any]]:
        """Асинхронное получение RSS-ленты"""
        try:
            async with httpx.AsyncClient(timeout=15.0, headers=self.headers, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    feed = feedparser.parse(resp.text)
                    return feed.entries
                else:
                    print(f"[Harvester] Ошибка {resp.status_code} при запросе {url}")
                    return []
        except Exception as e:
            print(f"[Harvester Error] Запрос к {url} не удался: {e}")
            return []

    async def process_entry(self, source_name: str, entry: Any) -> Optional[Dict[str, Any]]:
        """Обработка отдельного заказа из ленты"""
        link = entry.get("link", "")
        external_id = entry.get("id") or link
        if not link or not external_id:
            return None

        # Проверка дубликата
        if await is_lead_exists(external_id):
            return None

        title = clean_html(entry.get("title", ""))
        raw_text = entry.get("summary", "")

        # AI-анализ и скоринг
        ai_res = await analyze_lead_with_ai(title, raw_text)

        # Сохранение в SQLite
        lead_id = await save_lead(
            source=source_name,
            external_id=external_id,
            title=title,
            link=link,
            raw_text=raw_text,
            budget=ai_res["budget"],
            category=ai_res["category"],
            score=ai_res["score"],
            summary=ai_res["summary"],
            pitch=ai_res["pitch"]
        )

        lead_data = {
            "id": lead_id,
            "source": source_name,
            "external_id": external_id,
            "title": title,
            "link": link,
            "budget": ai_res["budget"],
            "category": ai_res["category"],
            "score": ai_res["score"],
            "summary": ai_res["summary"],
            "pitch": ai_res["pitch"],
            "is_spam": ai_res.get("is_spam", False)
        }

        # Если лид качественный — отправляем в обработчик (бот / интерфейс)
        if self.on_new_lead and lead_data["score"] >= MIN_SCORE_THRESHOLD and not lead_data["is_spam"]:
            try:
                if asyncio.iscoroutinefunction(self.on_new_lead):
                    await self.on_new_lead(lead_data)
                else:
                    self.on_new_lead(lead_data)
            except Exception as e:
                print(f"[Harvester Callback Error] {e}")

        return lead_data

    async def run_cycle(self) -> int:
        """Один цикл сбора по всем активным источникам"""
        new_leads_count = 0
        for src in RSS_SOURCES:
            entries = await self.fetch_rss(src["url"])
            for entry in entries:
                res = await self.process_entry(src["name"], entry)
                if res:
                    new_leads_count += 1
        return new_leads_count
