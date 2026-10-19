import http from "http";
import mongoose from "mongoose";
import app from "./app";
import config from "./app/config";
import { bootstrapPharmacy } from "./app/utilities/bootstrap";

const server = http.createServer(app);

const start = async () => {
  mongoose.set("strictQuery", true);

  await mongoose.connect(config.database_url, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 15_000,
    retryWrites: true,
  });
  console.log("Database connected");

  await bootstrapPharmacy();

  server.listen(config.port, () => {
    console.log(`PharmaWatch API listening on port ${config.port}`);
  });
};

const shutdown = async (reason: string, code = 0) => {
  console.log(`Shutting down: ${reason}`);
  server.close();
  await mongoose.connection.close().catch(() => undefined);
  process.exit(code);
};

start().catch((error) => {
  console.error("Failed to start", error);
  process.exit(1);
});

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection", reason);
  void shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception", error);
  void shutdown("uncaughtException", 1);
});
