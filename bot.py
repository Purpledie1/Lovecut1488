import asyncio
from typing import Optional, Dict, Any
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.client.session.aiohttp import AiohttpSession

from config import TELEGRAM_BOT_TOKEN, TELEGRAM_PROXY
from database import add_or_update_subscriber, get_active_subscribers, get_recent_leads

bot: Optional[Bot] = None
dp: Optional[Dispatcher] = None

def get_bot_instance() -> Optional[Bot]:
    global bot, dp
    if not TELEGRAM_BOT_TOKEN:
        return None
    if bot is None:
        session = None
        if TELEGRAM_PROXY:
            session = AiohttpSession(proxy=TELEGRAM_PROXY)
        bot = Bot(token=TELEGRAM_BOT_TOKEN, session=session)
        dp = Dispatcher()
        setup_handlers(dp)
    return bot

def setup_handlers(dispatcher: Dispatcher):
    @dispatcher.message(CommandStart())
    async def cmd_start(message: types.Message):
        user = message.from_user
        await add_or_update_subscriber(user.id, user.username)

        kb = InlineKeyboardBuilder()
        kb.button(text="⚡ Топ свежих заказов", callback_data="view_feed")
        kb.button(text="💳 VIP Подписка (Автопилот)", callback_data="view_sub")
        kb.adjust(1)

        text = (
            f"👋 Привет, {user.first_name}!\n\n"
            f"🤖 Я — **AI Lead Sniper**. Я в реальном времени мониторю биржи и каналы, "
            f"фильтрую 95% мусора и спама нейросетью и отдаю только заказы с реальным бюджетом.\n\n"
            f"🎁 Тебе активирован **бесплатный VIP-доступ на 3 дня**!\n"
            f"Новые горячие заказы будут прилетать прямо сюда в момент их публикации."
        )
        await message.answer(text, reply_markup=kb.as_markup(), parse_mode="Markdown")

    @dispatcher.callback_query(F.data == "view_feed")
    async def cb_view_feed(callback: types.CallbackQuery):
        leads = await get_recent_leads(limit=5, min_score=6)
        if not leads:
            await callback.message.answer("Пока свежих заказов нет, сканер в работе... Ожидайте новых уведомлений!")
            await callback.answer()
            return

        await callback.message.answer("🔥 **Последние отобранные нейросетью заказы:**", parse_mode="Markdown")
        for item in leads:
            card_text = (
                f"📌 **{item['title']}**\n"
                f"🏷 Категория: `{item['category']}`\n"
                f"💰 Бюджет: **{item['budget']}**\n"
                f"⭐ Рейтинг AI: **{item['score']}/10**\n\n"
                f"💡 *Суть:* {item['summary']}\n\n"
                f"💬 **Готовый отклик клиента (нажми чтобы скопировать):**\n"
                f"<code>{item['pitch']}</code>"
            )
            kb = InlineKeyboardBuilder()
            kb.button(text="🔗 Открыть заказ", url=item["link"])
            await callback.message.answer(card_text, reply_markup=kb.as_markup(), parse_mode="HTML")
        await callback.answer()

    @dispatcher.callback_query(F.data == "view_sub")
    async def cb_view_sub(callback: types.CallbackQuery):
        text = (
            "💳 **VIP-Подписка на мониторинг заказов**\n\n"
            "Что дает VIP:\n"
            "• Мгновенные уведомления о новых заказах за 3 секунды до конкурентов\n"
            "• Отсечение спама и неоплачиваемых тестов\n"
            "• Готовый персональный текст отклика под каждый заказ\n\n"
            "💵 **Стоимость:** 790 ₽ / месяц (или 100 Telegram Stars)\n"
            "Окупается с первой же закрытой заявки!\n\n"
            "Для продления напишите в поддержку или оплатите через админа."
        )
        await callback.message.answer(text, parse_mode="Markdown")
        await callback.answer()


async def broadcast_lead(lead: Dict[str, Any]):
    """Рассылка нового горячего лида активным подписчикам"""
    b = get_bot_instance()
    if not b:
        return

    subscribers = await get_active_subscribers()
    if not subscribers:
        return

    card_text = (
        f"🚨 **НОВЫЙ ГОРЯЧИЙ ЗАКАЗ**\n\n"
        f"📌 **{lead['title']}**\n"
        f"🏷 Категория: `{lead['category']}`\n"
        f"💰 Бюджет: **{lead['budget']}**\n"
        f"⭐ AI Оценка: **{lead['score']}/10**\n\n"
        f"💡 *Суть:* {lead['summary']}\n\n"
        f"💬 **Готовый отклик (нажми для копирования):**\n"
        f"<code>{lead['pitch']}</code>"
    )

    kb = InlineKeyboardBuilder()
    kb.button(text="🚀 Перейти к заказу", url=lead["link"])

    for sub in subscribers:
        try:
            await b.send_message(
                chat_id=sub["telegram_id"],
                text=card_text,
                reply_markup=kb.as_markup(),
                parse_mode="HTML"
            )
        except Exception as e:
            print(f"[Broadcast Warning] Не удалось отправить пользователю {sub['telegram_id']}: {e}")
