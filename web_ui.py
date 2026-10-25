from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from database import get_recent_leads
from harvester import LeadHarvester

app = FastAPI(title="AI Lead Sniper Dashboard")

HTML_TEMPLATE = r"""
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Lead Sniper | Панель мониторинга заказов</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; }
        .glow-card { border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); }
        .glow-card:hover { border-color: rgba(99, 102, 241, 0.4); box-shadow: 0 0 25px rgba(99, 102, 241, 0.15); }
    </style>
</head>
<body class="min-h-screen pb-16">
    <!-- Header -->
    <header class="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/30">
                    ⚡
                </div>
                <div>
                    <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        AI Lead Sniper
                        <span class="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                            🟢 Live Scanner
                        </span>
                    </h1>
                    <p class="text-xs text-gray-400">Автономный мониторинг и AI-скоринг заказов для фрилансеров</p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <button onclick="scanNow()" id="scan-btn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2">
                    🔄 Сканировать сейчас
                </button>
            </div>
        </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-6xl mx-auto px-6 pt-8">
        <!-- Target Metrics Bar -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="glow-card p-5 rounded-2xl">
                <div class="text-xs font-medium text-gray-400 uppercase tracking-wider">Ближайшая цель</div>
                <div class="text-2xl font-extrabold text-white mt-1">2 500 ₽ / мес</div>
                <div class="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    ✓ Нужно всего 3 платных подписчика по 800 ₽
                </div>
            </div>
            <div class="glow-card p-5 rounded-2xl">
                <div class="text-xs font-medium text-gray-400 uppercase tracking-wider">Масштабирование (Уровень 2)</div>
                <div class="text-2xl font-extrabold text-indigo-400 mt-1">2 500 $ / мес</div>
                <div class="text-xs text-gray-400 mt-1">
                    Выход на 50 англоязычных студий на автопилоте
                </div>
            </div>
            <div class="glow-card p-5 rounded-2xl">
                <div class="text-xs font-medium text-gray-400 uppercase tracking-wider">AI Движок фильтрации</div>
                <div class="text-2xl font-extrabold text-amber-400 mt-1">Gemini 2.5 Flash</div>
                <div class="text-xs text-gray-400 mt-1">
                    Отсечение 95% спама + автогенерация откликов
                </div>
            </div>
        </div>

        <!-- Feed Section -->
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
                🔥 Поток актуальных заказов
                <span id="leads-count" class="text-sm bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full font-normal">0</span>
            </h2>
            <div class="text-xs text-gray-400">
                Обновляется автоматически каждые 30 секунд
            </div>
        </div>

        <!-- Leads List -->
        <div id="leads-container" class="space-y-4">
            <div class="text-center py-12 text-gray-500">Загрузка заказов...</div>
        </div>
    </main>

    <!-- Notification Toast -->
    <div id="toast" class="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl transition-all transform translate-y-24 opacity-0 z-50 text-sm font-medium flex items-center gap-2">
        <span>✓</span> Отклик скопирован в буфер обмена!
    </div>

    <script>
        function showToast(text) {
            const toast = document.getElementById('toast');
            toast.innerText = '✓ ' + text;
            toast.classList.remove('translate-y-24', 'opacity-0');
            setTimeout(() => {
                toast.classList.add('translate-y-24', 'opacity-0');
            }, 2500);
        }

        function copyPitch(encodedPitch) {
            const pitchText = decodeURIComponent(encodedPitch);
            navigator.clipboard.writeText(pitchText).then(() => {
                showToast('Готовый отклик скопирован! Можешь сразу отправлять клиенту.');
            });
        }

        async function loadLeads() {
            try {
                const res = await fetch('/api/leads');
                const data = await res.json();
                const container = document.getElementById('leads-container');
                document.getElementById('leads-count').innerText = data.length;

                if (data.length === 0) {
                    container.innerHTML = '<div class="text-center py-12 text-gray-500">Новых заказов пока нет. Нажмите "Сканировать сейчас"!</div>';
                    return;
                }

                container.innerHTML = data.map(item => `
                    <div class="glow-card p-6 rounded-2xl transition-all">
                        <div class="flex flex-wrap items-start justify-between gap-4 mb-3">
                            <div>
                                <div class="flex items-center gap-2 flex-wrap mb-1">
                                    <span class="text-xs px-2.5 py-1 rounded-md font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                        ${item.category || 'Общее'}
                                    </span>
                                    <span class="text-xs px-2.5 py-1 rounded-md font-semibold ${item.score >= 8 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                                        ⭐ Рейтинг: ${item.score}/10
                                    </span>
                                    <span class="text-xs text-gray-500">Источник: ${item.source}</span>
                                </div>
                                <h3 class="text-lg font-bold text-white hover:text-indigo-400 transition">
                                    <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a>
                                </h3>
                            </div>
                            <div class="text-right">
                                <span class="text-base font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
                                    ${item.budget || 'По договоренности'}
                                </span>
                            </div>
                        </div>

                        <p class="text-sm text-gray-300 mb-4 bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
                            ${item.summary || item.raw_text.substring(0, 200)}
                        </p>

                        <div class="bg-indigo-950/20 border border-indigo-900/40 p-4 rounded-xl mb-4">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-semibold text-indigo-400 uppercase tracking-wide">
                                    💬 Сгенерированный AI-отклик клиенту:
                                </span>
                                <button onclick="copyPitch(\`${encodeURIComponent(item.pitch).replace(/'/g, "%27")}\`)" class="text-xs text-indigo-300 hover:text-white bg-indigo-600/40 hover:bg-indigo-600 px-3 py-1 rounded-lg transition font-medium">
                                    📋 Скопировать отклик
                                </button>
                            </div>
                            <p class="text-xs text-gray-300 italic">"${item.pitch}"</p>
                        </div>

                        <div class="flex justify-end">
                            <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition flex items-center gap-1">
                                🔗 Открыть заказ на бирже →
                            </a>
                        </div>
                    </div>
                `).join('');
            } catch (err) {
                console.error(err);
            }
        }

        async function scanNow() {
            const btn = document.getElementById('scan-btn');
            btn.innerText = '⏳ Сканирую...';
            btn.disabled = true;
            try {
                await fetch('/api/scan-now', { method: 'POST' });
                await loadLeads();
                showToast('Сканирование завершено, список обновлен!');
            } catch (e) {
                console.error(e);
            } finally {
                btn.innerText = '🔄 Сканировать сейчас';
                btn.disabled = false;
            }
        }

        // Автообновление каждые 30 секунд
        loadLeads();
        setInterval(loadLeads, 30000);
    </script>
</body>
</html>
"""

@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    return HTML_TEMPLATE

@app.get("/api/leads")
async def api_leads():
    leads = await get_recent_leads(limit=30, min_score=4)
    return JSONResponse(content=leads)

@app.post("/api/scan-now")
async def api_scan_now():
    harvester = LeadHarvester()
    count = await harvester.run_cycle()
    return {"status": "ok", "new_leads": count}
