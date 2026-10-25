import re
import json
from typing import Dict, Any, Optional
from config import GEMINI_API_KEY

# Пытаемся импортировать google.genai, если доступен
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


def clean_html(raw_html: str) -> str:
    """Очистка текста от HTML-тегов и спецсимволов"""
    clean_text = re.sub(r'<.*?>', ' ', raw_html or '')
    clean_text = clean_text.replace('&nbsp;', ' ').replace('&#8381;', '₽').replace('&quot;', '"').replace('&amp;', '&')
    return ' '.join(clean_text.split())


def heuristic_analysis(title: str, text: str) -> Dict[str, Any]:
    """
    Интеллектуальный эвристический анализ на случай отсутствия API ключа.
    Гарантирует 100% работу системы сразу из коробки.
    """
    full_text = f"{title} {text}".lower()
    
    # 1. Определение категории
    category = "Другое"
    if any(w in full_text for w in ["бот", "bot", "telegram", "телеграм", "aiogram", "парс", "скрипт", "автоматизац"]):
        category = "Боты & Автоматизация"
    elif any(w in full_text for w in ["сайт", "landing", "лендинг", "верстк", "frontend", "backend", "fullstack", "react", "wordpress", "bitrix"]):
        category = "Веб-разработка & Сайты"
    elif any(w in full_text for w in ["дизайн", "figma", "баннер", "ui", "ux", "логотип", "оформлен"]):
        category = "Дизайн & UI/UX"
    elif any(w in full_text for w in ["парсер", "скрап", "сбор баз", "excel", "парсить"]):
        category = "Парсинг & Данные"
    elif any(w in full_text for w in ["текст", "копирайт", "стать", "рерайт", "пост", "seo"]):
        category = "Копирайтинг & Тексты"
    elif any(w in full_text for w in ["видео", "монтаж", "reels", "shorts", "ролик"]):
        category = "Видео & Монтаж"

    # 2. Поиск бюджета
    budget = "По договоренности"
    budget_match = re.search(r'(\d[\d\s]{2,})\s*(?:руб|р|₽|usd|\$|€)', full_text)
    if budget_match:
        budget = budget_match.group(0).strip()
    elif "бюджет:" in full_text:
        b_part = full_text.split("бюджет:")[1][:25].strip()
        budget = b_part

    # 3. Скоринг качества (1 - 10)
    score = 6
    # Плюсы
    if any(w in full_text for w in ["срочно", "готов оплатить", "тз готово", "бюджет"]):
        score += 2
    if len(text) > 120:
        score += 1
    # Минусы (спам, школьники, копеечные задачи)
    if any(w in full_text for w in ["150 руб", "100 руб", "отзыв", "подписк", "за лайк", "бесплатно"]):
        score -= 4
    if any(w in full_text for w in ["казино", "ставки", "криптоскам"]):
        score -= 5

    score = max(1, min(10, score))

    # 4. Генерация краткого саммари
    summary = title[:120]

    # 5. Генерация продающего отклика
    pitch = (
        f"Здравствуйте! Готов качественно реализовать задачу: «{title}». "
        f"Имею опыт решения подобных задач в стеке {category}. "
        f"Работаю быстро, соблюдаю дедлайны и гарантирую чистоту результата. "
        f"Когда вам удобно обсудить детали?"
    )

    return {
        "score": score,
        "category": category,
        "budget": budget,
        "summary": summary,
        "pitch": pitch,
        "is_spam": score < 4
    }


async def analyze_lead_with_ai(title: str, raw_text: str) -> Dict[str, Any]:
    """
    Анализ заказа через Google Gemini Flash API с автоматическим фоллбеком на эвристику.
    """
    clean_desc = clean_html(raw_text)

    # Если ключ не задан или библиотека недоступна — используем встроенную эвристику
    if not GEMINI_API_KEY or not GENAI_AVAILABLE:
        return heuristic_analysis(title, clean_desc)

    prompt = f"""
Ты — профессиональный эксперт по фрилансу и скорингу входящих заказов.
Оцени следующий заказ для исполнителей:
ЗАГОЛОВОК: {title}
ОПИСАНИЕ: {clean_desc}

Ответь ИСКЛЮЧИТЕЛЬНО в формате JSON со следующими полями:
{{
  "score": (число от 1 до 10, где 1 - мусор/спам/копейки, а 10 - идеальный адекватный заказ с понятным ТЗ и бюджетом),
  "category": (одна из категорий: "Веб-разработка & Сайты", "Боты & Автоматизация", "Парсинг & Данные", "Дизайн & UI/UX", "Копирайтинг & Тексты", "Видео & Монтаж", "Другое"),
  "budget": (определи бюджет, например "20 000 ₽" или "По договоренности"),
  "summary": (одно емкое предложение с сутью задачи без воды),
  "pitch": (профессиональный, вежливый и цепляющий отклик из 2-3 предложений, готовый для отправки клиенту),
  "is_spam": (true если это спам, неадекват или тест за 100 рублей, иначе false)
}}
"""
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
        )
        data = json.loads(response.text)
        return {
            "score": int(data.get("score", 6)),
            "category": data.get("category", "Другое"),
            "budget": data.get("budget", "По договоренности"),
            "summary": data.get("summary", title),
            "pitch": data.get("pitch", "Здравствуйте! Готов оперативно выполнить задачу."),
            "is_spam": bool(data.get("is_spam", False))
        }
    except Exception as e:
        print(f"[AI Filter Warning] Gemini API fallback: {e}")
        return heuristic_analysis(title, clean_desc)
