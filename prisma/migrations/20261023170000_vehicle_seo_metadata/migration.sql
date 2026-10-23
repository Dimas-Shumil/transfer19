-- Добавляем отдельные SEO-поля для карточек автомобилей.
-- Существующие записи и URL остаются без изменений.
ALTER TABLE "Vehicle" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "seoDescription" TEXT;
