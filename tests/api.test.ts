import assert from "assert";
import { memoryDatabase, report, test } from "./harness";
import { OWNER, PHARMACIST } from "./fixtures";

const run = async () => {
  const stop = await memoryDatabase();

  const request = (await import("supertest")).default;
  const app = (await import("../src/app")).default;
  const { addDays, today } = await import("../src/app/domain");

  const api = "/api/v1";
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  let ownerToken = "";
  let staffToken = "";
  let supplierId = "";
  let medicineId = "";
  let batchId = "";
  let requestId = "";

  await test("a protected route is closed without a token", async () => {
    const res = await request(app).get(`${api}/batches`);
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await test("a made up token is not accepted", async () => {
    const res = await request(app).get(`${api}/batches`).set(bearer("not.a.real.token"));
    assert.equal(res.status, 401);
  });

  await test("registering the first account returns an owner and sets the refresh cookie", async () => {
    const res = await request(app).post(`${api}/auth/register`).send(OWNER);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.account.role, "owner");
    ownerToken = res.body.data.accessToken;

    const cookie = String(res.headers["set-cookie"]);
    assert.ok(cookie.includes("pw_refresh"));
    assert.ok(cookie.includes("HttpOnly"));
  });

  await test("the refresh token is never put in the response body", async () => {
    const res = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: OWNER.email, password: OWNER.password });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.refreshToken, undefined);
    ownerToken = res.body.data.accessToken;
  });

  await test("a weak password is refused with a field level message", async () => {
    const res = await request(app)
      .post(`${api}/auth/register`)
      .send({ ...OWNER, email: "weak@pharmawatch.test", password: "password" });

    assert.equal(res.status, 400);
    assert.ok(res.body.errors.some((item: { path: string }) => item.path === "password"));
  });

  await test("the owner can add a pharmacist", async () => {
    const res = await request(app)
      .post(`${api}/auth/staff`)
      .set(bearer(ownerToken))
      .send(PHARMACIST);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.role, "pharmacist");

    const login = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: PHARMACIST.email, password: PHARMACIST.password });

    staffToken = login.body.data.accessToken;
  });

  await test("a pharmacist cannot reach the owner only staff list", async () => {
    const res = await request(app).get(`${api}/auth/staff`).set(bearer(staffToken));
    assert.equal(res.status, 403);
  });

  await test("a supplier and a medicine can be added", async () => {
    const supplier = await request(app)
      .post(`${api}/suppliers`)
      .set(bearer(ownerToken))
      .send({ name: "Beximco Pharma", returnWindowDays: 90 });

    assert.equal(supplier.status, 201);
    supplierId = supplier.body.data._id;

    const medicine = await request(app)
      .post(`${api}/medicines`)
      .set(bearer(staffToken))
      .send({
        name: "Napa Extra",
        generic: "Paracetamol + Caffeine",
        strength: "500mg",
        form: "tablet",
        unit: "strips",
      });

    assert.equal(medicine.status, 201);
    medicineId = medicine.body.data._id;
  });

  await test("a batch that expires before it arrives is refused", async () => {
    const res = await request(app)
      .post(`${api}/batches`)
      .set(bearer(staffToken))
      .send({
        batchNo: "NPX-0001",
        medicine: medicineId,
        supplier: supplierId,
        qtyIn: 100,
        cost: 42,
        price: 63,
        received: addDays(today(), 10),
        expiry: addDays(today(), 5),
      });

    assert.equal(res.status, 400);
  });

  await test("a batch priced below cost is refused", async () => {
    const res = await request(app)
      .post(`${api}/batches`)
      .set(bearer(staffToken))
      .send({
        batchNo: "NPX-0002",
        medicine: medicineId,
        supplier: supplierId,
        qtyIn: 100,
        cost: 63,
        price: 42,
        expiry: addDays(today(), 200),
      });

    assert.equal(res.status, 400);
    assert.ok(res.body.errors.some((item: { path: string }) => item.path === "price"));
  });

  await test("receiving a batch derives its return cut-off from the supplier window", async () => {
    const res = await request(app)
      .post(`${api}/batches`)
      .set(bearer(staffToken))
      .send({
        batchNo: "NPX-4417",
        medicine: medicineId,
        supplier: supplierId,
        qtyIn: 500,
        cost: 42,
        price: 63,
        expiry: addDays(today(), 120),
      });

    assert.equal(res.status, 201);
    batchId = res.body.data.id;
    assert.equal(res.body.data.daysToCutoff, 30);
    assert.equal(res.body.data.left, 500);
  });

  await test("the same batch number cannot be received twice for one medicine", async () => {
    const res = await request(app)
      .post(`${api}/batches`)
      .set(bearer(staffToken))
      .send({
        batchNo: "NPX-4417",
        medicine: medicineId,
        supplier: supplierId,
        qtyIn: 10,
        cost: 42,
        price: 63,
        expiry: addDays(today(), 120),
      });

    assert.equal(res.status, 409);
  });

  await test("a batch view carries the raw sell rates the client needs", async () => {
    const res = await request(app).get(`${api}/batches/${batchId}`).set(bearer(staffToken));

    assert.equal(res.status, 200);
    assert.equal(typeof res.body.data.r30, "number");
    assert.equal(typeof res.body.data.r7, "number");
    assert.equal(typeof res.body.data.sellRate, "number");
  });

  await test("remember me is what decides whether the cookie outlives the browser", async () => {
    const plain = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: OWNER.email, password: OWNER.password });

    assert.ok(!String(plain.headers["set-cookie"]).includes("Max-Age"));

    const kept = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: OWNER.email, password: OWNER.password, remember: true });

    assert.ok(String(kept.headers["set-cookie"]).includes("Max-Age"));
    ownerToken = kept.body.data.accessToken;
  });

  await test("a batch carries its risk score, factors and recommendation", async () => {
    const res = await request(app).get(`${api}/batches/${batchId}/risk`).set(bearer(staffToken));

    assert.equal(res.status, 200);
    assert.ok(res.body.data.riskScore >= 0 && res.body.data.riskScore <= 1);
    assert.equal(res.body.data.factors.length, 3);
    assert.ok(res.body.data.recommendation.title);
  });

  await test("a sale goes through FEFO and takes the stock down", async () => {
    const res = await request(app)
      .post(`${api}/sales`)
      .set(bearer(staffToken))
      .send({ items: [{ medicine: medicineId, qty: 4 }] });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.items[0].batchNo, "NPX-4417");

    const batch = await request(app).get(`${api}/batches/${batchId}`).set(bearer(staffToken));
    assert.equal(batch.body.data.left, 496);
  });

  await test("selling more than the shelf holds is a 409, not a silent partial sale", async () => {
    const res = await request(app)
      .post(`${api}/sales`)
      .set(bearer(staffToken))
      .send({ items: [{ medicine: medicineId, qty: 100_000 }] });

    assert.equal(res.status, 409);

    const batch = await request(app).get(`${api}/batches/${batchId}`).set(bearer(staffToken));
    assert.equal(batch.body.data.left, 496);
  });

  await test("a pharmacist raises a request but cannot decide it", async () => {
    const raised = await request(app)
      .post(`${api}/stock-actions`)
      .set(bearer(staffToken))
      .send({ batch: batchId, type: "RETURN_TO_SUPPLIER", reason: "Slow moving" });

    assert.equal(raised.status, 201);
    requestId = raised.body.data._id;

    const refused = await request(app)
      .patch(`${api}/stock-actions/${requestId}/approve`)
      .set(bearer(staffToken))
      .send({});

    assert.equal(refused.status, 403);
  });

  await test("the owner approves it and the batch closes", async () => {
    const res = await request(app)
      .patch(`${api}/stock-actions/${requestId}/approve`)
      .set(bearer(ownerToken))
      .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, "approved");

    const batch = await request(app).get(`${api}/batches/${batchId}`).set(bearer(staffToken));
    assert.equal(batch.body.data.state, "returned");
    assert.equal(batch.body.data.left, 0);
    assert.equal(batch.body.data.closed, true);
  });

  await test("a closed batch can no longer be sold from", async () => {
    const res = await request(app)
      .post(`${api}/sales`)
      .set(bearer(staffToken))
      .send({ items: [{ medicine: medicineId, qty: 1 }] });

    assert.equal(res.status, 400);
  });

  await test("the dashboard adds the pharmacy up", async () => {
    const res = await request(app).get(`${api}/reports/summary`).set(bearer(staffToken));

    assert.equal(res.status, 200);
    assert.equal(typeof res.body.data.stockOnShelf, "number");
    assert.equal(typeof res.body.data.valueAtRisk90, "number");
    assert.equal(res.body.data.pendingApprovals, 0);
  });

  await test("the model explains itself, weights and all", async () => {
    const res = await request(app)
      .get(`${api}/predictions/model-info`)
      .set(bearer(staffToken));

    assert.equal(res.status, 200);
    assert.equal(res.body.data.kind, "logistic regression");
    assert.equal(res.body.data.weights.length, 4);
    assert.ok(res.body.data.evaluation.model.recall > res.body.data.evaluation.baseline.recall);
    assert.ok(res.body.data.limitations.length >= 3);
  });

  await test("an unknown route answers in the same envelope as everything else", async () => {
    const res = await request(app).get(`${api}/nothing-here`);
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes("No route matches"));
  });

  await test("a mongo operator in the body is stripped before it reaches the query", async () => {
    const res = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: { $ne: null }, password: { $ne: null } });

    assert.notEqual(res.status, 200);
  });

  await stop();
  report("api");
};

void run();
