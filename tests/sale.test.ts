import assert from "assert";
import { expectError, memoryDatabase, report, test } from "./harness";
import { OWNER, makeFixtures } from "./fixtures";

const run = async () => {
  const stop = await memoryDatabase();

  const { AuthService } = await import("../src/app/modules/auth/auth.service");
  const { SaleService } = await import("../src/app/modules/sale/sale.service");
  const { Batch } = await import("../src/app/modules/batch/batch.model");
  const { Sale } = await import("../src/app/modules/sale/sale.model");

  const session = await AuthService.register(OWNER);
  const user = {
    userId: session.account.id,
    role: session.account.role,
    email: session.account.email,
    name: session.account.name,
    tokenVersion: 1,
  };

  const fx = await makeFixtures();
  const napaId = String(fx.napa._id);
  const secloId = String(fx.seclo._id);

  await test("FEFO reaches for the batch that expires first", async () => {
    const picked = await SaleService.suggestion(napaId, 1);
    assert.equal(picked.picked[0].batchNo, "NPX-4417");
    assert.equal(picked.queue[0].role, "Sells first");
    assert.equal(picked.queue[1].role, "Waits its turn");
  });

  await test("expired stock is never offered, however old it is", async () => {
    const picked = await SaleService.suggestion(secloId, 1);
    assert.equal(picked.picked[0].batchNo, "SEC-2210");
    assert.ok(!picked.queue.some((row) => row.batchNo === "SEC-1180"));
  });

  await test("a sale takes the units off the shelf", async () => {
    const before = await Batch.findById(fx.early._id).lean();
    await SaleService.create({ customerName: "", items: [{ medicine: napaId, qty: 3 }] }, user);
    const after = await Batch.findById(fx.early._id).lean();
    assert.equal(after!.left, before!.left - 3);
  });

  await test("the invoice number moves on by one each sale", async () => {
    const first = await SaleService.create(
      { customerName: "", items: [{ medicine: napaId, qty: 1 }] },
      user,
    );
    const second = await SaleService.create(
      { customerName: "", items: [{ medicine: napaId, qty: 1 }] },
      user,
    );
    const step = Number(second.invoiceNo.slice(4)) - Number(first.invoiceNo.slice(4));
    assert.equal(step, 1);
  });

  await test("one line can span two batches when the first runs short", async () => {
    const left = (await Batch.findById(fx.early._id).lean())!.left;
    const sale = await SaleService.create(
      { customerName: "", items: [{ medicine: napaId, qty: left + 10 }] },
      user,
    );

    assert.equal(sale.items.length, 2);
    assert.equal(sale.items[0].batchNo, "NPX-4417");
    assert.equal(sale.items[1].batchNo, "NPX-5102");
    assert.equal((await Batch.findById(fx.early._id).lean())!.left, 0);
  });

  await test("an emptied batch counts as closed and drops out of the queue", async () => {
    const picked = await SaleService.suggestion(napaId, 1);
    assert.equal(picked.picked[0].batchNo, "NPX-5102");
  });

  await test("selling more than the shelf holds is refused", async () => {
    await expectError(
      () => SaleService.create({ customerName: "", items: [{ medicine: napaId, qty: 10_000 }] }, user),
      "are on the shelf",
    );
  });

  await test("a refused sale leaves every batch untouched", async () => {
    const before = await Batch.find({ medicine: napaId }).sort({ expiry: 1 }).lean();
    await expectError(
      () => SaleService.create({ customerName: "", items: [{ medicine: napaId, qty: 10_000 }] }, user),
      "are on the shelf",
    );
    const after = await Batch.find({ medicine: napaId }).sort({ expiry: 1 }).lean();
    assert.deepEqual(after.map((b) => b.left), before.map((b) => b.left));
  });

  await test("a refused sale records no invoice", async () => {
    const before = await Sale.countDocuments();
    await expectError(
      () => SaleService.create({ customerName: "", items: [{ medicine: napaId, qty: 10_000 }] }, user),
      "are on the shelf",
    );
    assert.equal(await Sale.countDocuments(), before);
  });

  await test("a medicine with nothing sellable cannot be sold at all", async () => {
    const { Medicine } = await import("../src/app/modules/medicine/medicine.model");
    const lonely = await Medicine.create({
      name: "Orsaline-N",
      generic: "Oral rehydration salts",
      strength: "20.5g",
      form: "syrup",
      unit: "sachets",
    });

    await expectError(
      () =>
        SaleService.create({ customerName: "", items: [{ medicine: String(lonely._id), qty: 1 }] }, user),
      "No sellable batch",
    );
  });

  await test("a live discount is what the counter charges", async () => {
    const { BatchService } = await import("../src/app/modules/batch/batch.service");
    await BatchService.applyDiscount(String(fx.later._id), { percent: 25 });

    const sale = await SaleService.create(
      { customerName: "", items: [{ medicine: napaId, qty: 2 }] },
      user,
    );

    assert.equal(sale.items[0].unitPrice, 47.25);
    assert.equal(sale.items[0].discount, 25);
    assert.equal(sale.total, 94.5);
    assert.equal(sale.fullTotal, 126);
  });

  await test("two lines of the same medicine are merged before stock is touched", async () => {
    const before = (await Batch.findById(fx.later._id).lean())!.left;
    const sale = await SaleService.create(
      {
        customerName: "",
        items: [
          { medicine: napaId, qty: 2 },
          { medicine: napaId, qty: 3 },
        ],
      },
      user,
    );

    assert.equal(sale.items.length, 1);
    assert.equal(sale.items[0].qty, 5);
    assert.equal((await Batch.findById(fx.later._id).lean())!.left, before - 5);
  });

  await test("the movement list shows what left this batch", async () => {
    const movement = await SaleService.movementOf(String(fx.later._id));
    assert.ok(movement.length > 0);
    assert.ok(movement.every((row) => row.qty > 0));
  });

  await stop();
  report("sale");
};

void run();
