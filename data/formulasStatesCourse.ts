// Демо-курс "Формулы состояний" - первая страница
export const formulasStatesFirstPage = {
  id: 'formulas-states-intro',
  type: 'html' as const,
  content: 'Формулы состояний для туристического бизнеса',
  htmlContent: `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Формулы состояний для туристического бизнеса</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet"/>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
<style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Open Sans', sans-serif;
            background-color: #f3f4f6;
            overflow: hidden;
        }
        .slide-container {
            width: 100%;
            max-width: 1280px;
            min-height: 720px;
            display: flex;
            background-color: white;
            position: relative;
            overflow: hidden;
            margin: 0 auto;
        }
        .left-panel {
            flex: 0 0 55%;
            padding: 60px 50px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            z-index: 10;
            background-color: #ffffff;
        }
        .right-panel {
            flex: 0 0 45%;
            position: relative;
            background-color: #0ea5e9;
            overflow: hidden;
        }
        .bg-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url("https://page.gensparksite.com/slides_images/c399add957dd43027e35e367d96be692.webp");
            background-size: cover;
            background-position: center;
        }
        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(14, 165, 233, 0.2);
        }
        .accent-shape {
            position: absolute;
            top: -50px;
            left: -50px;
            width: 150px;
            height: 150px;
            background-color: #f0f9ff;
            border-radius: 50%;
            z-index: 5;
        }
        .title-accent {
            color: #0284c7;
        }
        h1 {
            font-family: 'Montserrat', sans-serif;
            line-height: 1.1;
        }
        .tag-pill {
            display: inline-flex;
            align-items: center;
            padding: 8px 16px;
            background-color: #e0f2fe;
            color: #0369a1;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            margin-right: 10px;
            margin-bottom: 10px;
        }
        .decorative-line {
            width: 80px;
            height: 6px;
            background-color: #fbbf24;
            margin: 30px 0;
            border-radius: 3px;
        }
        @media (max-width: 768px) {
            .slide-container {
                flex-direction: column;
                min-height: auto;
            }
            .left-panel, .right-panel {
                flex: 1 1 100%;
            }
            .left-panel {
                padding: 40px 30px;
            }
            h1 {
                font-size: 2.5rem !important;
            }
        }
    </style>
</head>
<body>
<div class="slide-container">
<div class="accent-shape"></div>
<div style="position: absolute; bottom: -30px; left: 40%; width: 100px; height: 100px; background-color: #fff7ed; border-radius: 50%; z-index: 5;"></div>
<div class="left-panel">
<div class="flex flex-wrap mb-8">
<div class="tag-pill"><i class="fas fa-plane-departure mr-2"></i> Туризм</div>
<div class="tag-pill"><i class="fas fa-chart-line mr-2"></i> Управление</div>
<div class="tag-pill"><i class="fas fa-laptop-house mr-2"></i> Удаленный офис</div>
</div>
<h1 class="text-6xl font-extrabold text-gray-800 mb-2">
                ФОРМУЛЫ<br/>
<span class="title-accent">СОСТОЯНИЙ</span>
</h1>
<h2 class="text-3xl font-light text-gray-600 mb-4 font-montserrat">
                Для туристического бизнеса
            </h2>
<div class="decorative-line"></div>
<p class="text-xl text-gray-600 leading-relaxed mb-8 pr-10">
                Полное руководство по адаптации технологии управления состояниями для компании на Пхукете.
                <br/><br/>
<span class="text-sm text-gray-500 block mt-2">
<i class="fas fa-check-circle text-green-500 mr-2"></i> Специфика работы с клиентами из СНГ
                    <br/>
<i class="fas fa-check-circle text-green-500 mr-2"></i> Инструменты для удаленных продаж
                </span>
</p>
<div class="mt-auto flex items-center text-gray-400 text-sm">
<div class="flex items-center mr-8">
<i class="fas fa-calendar-alt mr-2"></i>
<span>2025</span>
</div>
<div class="flex items-center">
<i class="fas fa-map-marker-alt mr-2"></i>
<span>Пхукет, Таиланд</span>
</div>
</div>
</div>
<div class="right-panel">
<div class="bg-image"></div>
<div class="overlay"></div>
<div style="position: absolute; bottom: 40px; right: 40px; background: rgba(255,255,255,0.95); padding: 20px; border-radius: 12px; width: 280px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
<div class="flex items-center mb-3">
<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
<i class="fas fa-search-dollar"></i>
</div>
<div>
<p class="text-xs text-gray-500 uppercase font-bold">Цель курса</p>
<p class="text-sm font-bold text-gray-800">Рост продаж и порядка</p>
</div>
</div>
<div class="w-full bg-gray-200 rounded-full h-1.5 mb-2">
<div class="bg-blue-500 h-1.5 rounded-full" style="width: 85%"></div>
</div>
<p class="text-xs text-gray-500">Эффективность управления</p>
</div>
</div>
</div>
</body>
</html>`,
  order: 0,
};

