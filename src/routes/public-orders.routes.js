"use strict";
const express = require("express");
const prisma = require("../lib/prisma");
const { asyncRoute } = require("../lib/async-route");
const { HttpError } = require("../lib/http-error");
const { singleLineText, personName, publicTransferDate, safeSlug, normalizeSearch, passengerCount } = require("../lib/validation");
const { upsertClient } = require("../services/client.service");
const { sendNewOrderNotification } = require("../services/push.service");
const router = express.Router();

router.post("/", asyncRoute(async (req, res) => {
  // Honeypot bots don't create records or send notifications.
  if (String(req.body.website || "").trim()) {
    return res.status(202).json({ success: true, message: "Заявка принята." });
  }
  const clientName = personName(req.body.clientName, "Имя");
  const pickupAddress = singleLineText(req.body.from, "Откуда", 300, true);
  const destinationAddress = singleLineText(req.body.to, "Куда", 300, true);
  if (pickupAddress.toLocaleLowerCase('ru-RU') === destinationAddress.toLocaleLowerCase('ru-RU')) {
    throw new HttpError(400, "Место подачи должно отличаться от назначения", "VALIDATION_ERROR");
  }
  const scheduledAt = publicTransferDate(req.body.date, req.body.time);
  const count = passengerCount(req.body.passengers, { required: true });
  const luggageDetails = singleLineText(req.body.luggage, "Багаж", 500);
  const vehicleSlug = safeSlug(req.body.vehicleSlug, "Автомобиль");
  const notes = singleLineText(req.body.comments, "Комментарий", 500);

  const order = await prisma.$transaction(async (tx) => {
    let vehicle = null;
    if (vehicleSlug) {
      vehicle = await tx.vehicle.findFirst({ where: { slug: vehicleSlug, published: true } });
      if (!vehicle || vehicle.status !== "AVAILABLE") throw new HttpError(400, "Выбранный автомобиль сейчас недоступен. Свяжитесь с нами для уточнения", "VALIDATION_ERROR");
      if (vehicle.passengerSeats != null && count > vehicle.passengerSeats) {
        throw new HttpError(400, "Выберите автомобиль с достаточным числом мест", "VALIDATION_ERROR");
      }
    }
    const client = await upsertClient(tx, { phone: req.body.phone, name: clientName, vehicle: vehicle?.name || null });
    const source = "Сайт";
    return tx.order.create({
      data: {
        type: "SCHEDULED", status: "NEW", clientId: client.id,
        pickupAddress, destinationAddress, passengerCount: count, luggageDetails,
        vehicle: vehicle?.name || null, vehicleId: vehicle?.id || null,
        source, scheduledAt, notes, createdById: null,
        searchText: normalizeSearch(client.name, client.phone, pickupAddress, destinationAddress, count, luggageDetails, vehicle?.name, notes, source)
      },
      include: { client: true, vehicleRecord: { include: { carrier: true } } }
    });
  });
  sendNewOrderNotification(order).catch(error => console.error("Комфорт Сибири Web Push:", error.message));
  return res.status(201).json({ success: true, message: "Заявка принята. Мы свяжемся с вами для подтверждения поездки." });
}));

module.exports = router;
