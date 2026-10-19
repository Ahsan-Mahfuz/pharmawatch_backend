import mongoose from "mongoose";
import config from "../config";
import { bootstrapPharmacy } from "./bootstrap";

const run = async () => {
  await mongoose.connect(config.database_url);
  await mongoose.connection.dropDatabase();
  await bootstrapPharmacy();

  console.log(`Emptied ${config.database_url}`);
  console.log(`Owner  ${config.owner.email} / ${config.owner.password}`);
  console.log("No suppliers, no medicines, no batches — add your own from the app.");

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Could not empty the database", error);
  await mongoose.connection.close().catch(() => undefined);
  process.exit(1);
});
