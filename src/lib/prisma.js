const { PrismaClient } = require("@prisma/client");

const prisma = global.__transfer19Prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__transfer19Prisma = prisma;
}

module.exports = prisma;
