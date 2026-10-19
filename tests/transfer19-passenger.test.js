'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { passengerCount, publicTransferDate } = require('../src/lib/validation');

test('пассажиры: целое число, без нуля, дроби и превышения лимита', () => {
  assert.equal(passengerCount('4', { required: true }), 4);
  assert.equal(passengerCount('', { required: false }), null);
  for (const value of ['0', '4.5', '21', 'x']) assert.throws(() => passengerCount(value, { required: true }));
  assert.throws(() => passengerCount(undefined, { required: true }));
});

test('время подачи парсится как +07:00, отклоняет некорректные значения', () => {
  assert.equal(publicTransferDate('2030-01-31', '12:30').toISOString(), '2030-01-31T05:30:00.000Z');
  for (const [date, time] of [
    ['2030-02-30', '12:30'], ['2030-01-31', '24:00'], ['2030-01-31', ''], ['2010-01-01', '10:00']
  ]) assert.throws(() => publicTransferDate(date, time));
});

test('структура passenger schema совпадает с подготовленной дельта-миграцией', () => {
  const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'prisma/migrations/20261019130000_transfer19_passenger_fields/migration.sql'), 'utf8');
  for (const field of ['passengerSeats', 'luggageCapacity', 'cabinFeatures', 'amenities', 'passengerCount', 'luggageDetails']) {
    assert.match(schema, new RegExp(`\\b${field}\\b`));
    assert.match(migration, new RegExp(`"${field}"`));
  }
  assert.doesNotMatch(migration, /\b(?:DROP|DELETE|UPDATE)\b/i);
});

test('формы CRM и публичный сайт используют новые поля и настоящий API', () => {
  const files = {
    admin: 'control/assets/control.js', public: 'site/scripts/home.js',
    fleet: 'site/scripts/autopark.js', car: 'site/scripts/car.js'
  };
  const contents = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(path.join(root, file), 'utf8')]));
  assert.match(contents.admin, /name="passengerCount"/);
  assert.match(contents.admin, /name="passengerSeats"/);
  assert.match(contents.public, /fetch\('\/api\/requests'/);
  assert.match(contents.fleet, /fetch\('\/api\/vehicles'/);
  assert.match(contents.car, /\/api\/vehicles\/\$\{/);
  assert.doesNotMatch(contents.public, /Демонстрационная версия/);
  assert.doesNotMatch(contents.admin, /cargoType|loadersRequired/);
});

// SSR renders exactly those vehicles provided by the database layer; hidden vehicles are excluded by route filters.
test('Главная SSR строит карточки из CRM, не статического макета', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'src/services/seo.service.js'), 'utf8');
  assert.match(source, /function homepageHtml\(vehicles/);
  assert.match(source, /data-select-car=/);
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /homepageHtml\(vehicles\)/);
});
