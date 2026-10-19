-- Additive-only Transfer19 fields. Does not read/copy data from SvoiGruzi.
ALTER TABLE "Vehicle" ADD COLUMN "passengerSeats" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN "luggageCapacity" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "cabinFeatures" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "amenities" TEXT;
ALTER TABLE "Order" ADD COLUMN "passengerCount" INTEGER;
ALTER TABLE "Order" ADD COLUMN "luggageDetails" TEXT;
