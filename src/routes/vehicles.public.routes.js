const express = require("express");
const prisma = require("../lib/prisma");
const { asyncRoute } = require("../lib/async-route");
const { safeSlug } = require("../lib/validation");

const router = express.Router();

const publicSelect = {
  slug: true, name: true, shortDescription: true, description: true,
  specsDescription: true, serviceArea: true, previewImage: true,
  passengerSeats: true, luggageCapacity: true, cabinFeatures: true, amenities: true,
  categories: true, status: true,
  images: { select: { image: true, alt: true, sortOrder: true }, orderBy: { sortOrder: "asc" } }
};

router.get("/", asyncRoute(async (req, res) => {
  const ownershipType = ["OWN", "PARTNER"].includes(req.query.ownershipType)
    ? req.query.ownershipType
    : null;

  const vehicles = await prisma.vehicle.findMany({
    where: {
      published: true,
      ...(ownershipType ? { ownershipType } : {})
    },
    select: publicSelect,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
  });

  res.json({ success: true, vehicles });
}));

router.get("/:slug", asyncRoute(async (req, res) => {
  const slug = safeSlug(req.params.slug, "Машина");
  const vehicle = await prisma.vehicle.findFirst({
    where: { slug, published: true },
    select: publicSelect
  });

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      code: "NOT_FOUND",
      message: "Машина не найдена"
    });
  }

  res.json({ success: true, vehicle });
}));

module.exports = router;
