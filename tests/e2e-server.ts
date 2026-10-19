import express from "express";

const run = async () => {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const memory = await MongoMemoryServer.create();

  process.env.NODE_ENV = "development";
  process.env.DATABASE_URL = memory.getUri();
  process.env.JWT_ACCESS_SECRET ??= "e2e-access-secret-value";
  process.env.JWT_REFRESH_SECRET ??= "e2e-refresh-secret-value";
  process.env.PORT ??= "5055";

  // The browser suite signs in with these, so they must not depend on a local .env.
  process.env.PHARMACY_NAME = "Shahjalal Pharmacy";
  process.env.OWNER_NAME = "Mahmuda Khatun";
  process.env.OWNER_EMAIL = "owner@pharmawatch.test";
  process.env.OWNER_PASSWORD = "Pharma@2026";

  process.env.RATE_LIMIT_LOGIN = "1000";
  process.env.RATE_LIMIT_FORGOT = "1000";
  process.env.RATE_LIMIT_REGISTER = "1000";
  process.env.RATE_LIMIT_RESET = "1000";

  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(process.env.DATABASE_URL);

  const { seedPharmacy } = await import("../src/app/utilities/seed");
  const { bootstrapPharmacy } = await import("../src/app/utilities/bootstrap");
  await seedPharmacy();

  const app = (await import("../src/app")).default;

  const harness = express();

  harness.post("/test/reseed", (_request, response) => {
    void seedPharmacy()
      .then(() => response.json({ seeded: true }))
      .catch((error: Error) => response.status(500).json({ message: error.message }));
  });

  harness.post("/test/empty", (_request, response) => {
    void mongoose.connection
      .dropDatabase()
      .then(() => bootstrapPharmacy())
      .then(() => response.json({ emptied: true }))
      .catch((error: Error) => response.status(500).json({ message: error.message }));
  });

  harness.use(app);

  const port = Number(process.env.PORT);
  const server = harness.listen(port, () => {
    console.log(`PharmaWatch E2E API listening on port ${port}`);
  });

  const stop = async () => {
    server.close();
    await mongoose.connection.close().catch(() => undefined);
    await memory.stop().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGTERM", () => void stop());
  process.on("SIGINT", () => void stop());
};

void run();
