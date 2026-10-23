КОМФОРТ СИБИРИ — КРУГЛЫЕ МОБИЛЬНЫЕ CTA

УСТАНОВКА
Распакуйте содержимое ZIP в корень проекта с заменой файлов.
CSS уже собран. Новые зависимости и миграции не нужны.

КОНТАКТЫ
Позвонить: tel:+79012356555 (номер предоставлен владельцем проекта).
Номер хранится единожды: components/footer.html, атрибут data-phone.
Написать: /#booking — существующая форма бронирования.
Прямого мессенджера в исходном архиве нет.

НАСТРОЙКИ
Внешний вид: site/sass/_mobile-contact.scss.
Две круглые кнопки 54×54px справа снизу, с промежутком 10px.
Сверху — золотая кнопка сообщения; снизу — тёмная кнопка звонка.
Видимые подписи убраны, доступны скринридерам.
Мобильный breakpoint: 767px (тот же breakpoint в components.js).
Порог появления: HERO_EXIT_OFFSET в site/scripts/components.js, сейчас 0:
кнопки появляются, когда первая секция полностью выходит за верх экрана.
Скрытие: IntersectionObserver наблюдает за фактическим футером.
Нижний rootMargin равен высоте CTA + нижний отступ/safe area + 8px.
При движении вверх кнопки возвращаются. ResizeObserver обновляет расчёт.
Кнопки скрыты при открытом меню, dialog и фокусе на полях формы.
Скрытый компонент inert, aria-hidden и не принимает касания.
Синяя tap-подсветка CTA отключена; клавиатурный focus-visible сохранён.
Учитываются safe-area и prefers-reduced-motion.

ПРОВЕРКИ
npm run sass:build — успешно.
npm test — 25/25.
Браузер Chromium: 28 комбинаций четырёх типов страниц и ширин
320, 375, 390, 430, 767, 768, 1280px.
Проверены начальное скрытие, появление после первой секции,
скрытие перед футером и возвращение вверх, мобильное меню,
отсутствие горизонтального overflow и необработанных JS-ошибок.
Маршрут проверен с реальным SSR-шаблонизатором, машины — с тестовыми
ответами API. Production CRM и установка на физическом телефоне не проверялись.
После подстановки номера отдельно проверена активная ссылка tel:+79012356555.

ИЗМЕНЁННЫЕ И ДОБАВЛЕННЫЕ ФАЙЛЫ
components/footer.html
public/autopark.html
public/car.html
public/index.html
public/route.html
site/css/autopark.min.css
site/css/car.min.css
site/css/home.min.css
site/css/route.min.css
site/img/icons.svg
site/sass/autopark.scss
site/sass/car.scss
site/sass/home.scss
site/sass/route.scss
site/scripts/components.js
site/sass/_mobile-contact.scss
