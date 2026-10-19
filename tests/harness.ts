import assert from "assert";

let passed = 0;
let failed = 0;

export const test = async (name: string, body: () => Promise<void> | void) => {
  try {
    await body();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL  ${name}\n      ${(error as Error).message}`);
  }
};

export const expectError = async (body: () => Promise<unknown>, contains: string) => {
  try {
    await body();
  } catch (error) {
    const message = (error as Error).message;
    assert.ok(
      message.toLowerCase().includes(contains.toLowerCase()),
      `expected an error containing "${contains}" but got "${message}"`,
    );
    return;
  }
  assert.fail(`expected an error containing "${contains}" but nothing was thrown`);
};

export const report = (suite: string) => {
  console.log(`\n${suite}: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
};

export const memoryDatabase = async () => {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const memory = await MongoMemoryServer.create();
  const uri = memory.getUri();

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = uri;
  process.env.JWT_ACCESS_SECRET = "test-access-secret-value";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-value";

  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(uri);

  return async () => {
    await mongoose.connection.dropDatabase().catch(() => undefined);
    await mongoose.connection.close().catch(() => undefined);
    await memory.stop();
  };
};
