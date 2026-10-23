# Трансфер19 — SEO / AEO / GEO, пакет оптимизации

Канонический домен: **https://transfer-comfort-sibiri.ru**.
Пакет — ZIP-патч для распаковки в корень проекта, не полноценная копия всех файлов.

## Выполнено

- Согласованные заголовки `title`, `description`, canonical, OG, Twitter на SSR-страницах.
- JSON-LD: Organization, WebSite, Service, WebPage, BreadcrumbList, Vehicle (если характеристики заполнены в CRM).
- Убраны старые домены в robots, sitemap и Nginx; карты URL синхронизированы с сервером.
- Один индексируемый URL каждого автомобиля: `/autopark/<slug>`. Старый `/car.html?slug=` перенаправляет 301.
- Три содержательные региональные посадочные: Абакан—Красноярск, Абакан—Шира, аэропорт Абакана.
- На главной добавлены внутренние ссылки на направления и вопросы/ответы, полезные посетителям и поисковым системам.
- Существующие CRM, Prisma-схема, авторизация, формы заявок и бизнес-логика сохранены.
- Nginx-пример под новый домен: `deploy/nginx-transfer19.conf.example`; старый именованный шаблон также приведён к новому домену для совместимости.
- `APP_ORIGIN` должен быть production-доменом. Пример `deploy/transfer19.production.env.example` не содержит секретов.
- Имя процесса PM2 приведено к `transfer19`.

## Установка на Windows

1. Сделайте резервную копию изменяемых файлов; проверьте `git status`.
2. Распакуйте ZIP в корень `transfer19` поверх существующих файлов.
3. Запустите:

```bat
npm ci
npm run sass:build
node --check server.js
npm test
npx prisma validate
git diff --check
```

Никакие операции с БД, `.env`, git-reset и деплоем патч не выполняет.
Новые маршруты не создают таблиц и не требуют новых миграций.

## Что НЕ является завершённым без доступа к production

- Загруженный ZIP не содержит папки `site/img`, хотя HTML и SCSS ссылаются на неё. Перед релизом проверьте фактические изображения и отдачу `200`, особенно favicon, логотип, hero, интерьеры, фотографии из CRM.
- В `.env` production нужно установить `APP_ORIGIN=https://transfer-comfort-sibiri.ru`, `NODE_ENV=production`, `TRUST_PROXY=1`, отдельные SESSION_SECRET и VAPID ключи. Не публикуйте `.env`.
- Не включайте HTTPS-пример Nginx до получения сертификата для домена и (при наличии DNS www) `www`-имени. Проверка `nginx -t` обязательна.
- Не выдумывайте и не добавляйте неподтверждённые цены, адрес компании, телефон, график работы, рейтинг или гарантии поездок.
- После деплоя подключите Яндекс Вебмастер, Google Search Console и Bing Webmaster Tools, проверьте индексацию, canonical, XML sitemap, страницы автомобилей и Search appearance. Подтвердите домен и проверьте ответы 200/301/404, Robots, SSR, Web Push/PWA, Core Web Vitals на реальном сайте.
- Для реального локального SEO понадобятся подтверждённые контакты и карточки Яндекс Бизнес / 2ГИС, единый NAP, реальные фотографии и отзывы. Не публикуйте ложную разметку LocalBusiness.
- SEO/AEO/GEO «100/100» нельзя гарантировать кодом: позиции, видимость и цитирования в AI-ответах зависят от индексации, качества контента и внешних факторов.

## Контроль после деплоя

```bash
curl -I https://transfer-comfort-sibiri.ru/
curl -I https://transfer-comfort-sibiri.ru/autopark.html
curl -I https://transfer-comfort-sibiri.ru/routes/abakan-krasnoyarsk
curl -I https://transfer-comfort-sibiri.ru/services/airport-abakan
curl -I 'https://transfer-comfort-sibiri.ru/car.html?slug=stepwgn-white'
curl -sS https://transfer-comfort-sibiri.ru/robots.txt
curl -sS https://transfer-comfort-sibiri.ru/sitemap.xml
```

*Примечание:* редирект car.html возвращает 301, только если автомобиль опубликован в БД. Для отсутствующего/снятого с публикации автомобиля ожидается 404. Реальный результат проверяется после настройки БД.
