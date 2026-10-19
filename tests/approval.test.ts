import assert from "assert";
import { expectError, memoryDatabase, report, test } from "./harness";
import { OWNER, PHARMACIST, makeFixtures } from "./fixtures";

const run = async () => {
  const stop = await memoryDatabase();

  const { AuthService } = await import("../src/app/modules/auth/auth.service");
  const { ApprovalService } = await import("../src/app/modules/approval/approval.service");
  const { StockAction } = await import("../src/app/modules/approval/approval.model");
  const { Batch } = await import("../src/app/modules/batch/batch.model");

  const session = await AuthService.register(OWNER);
  const staff = await AuthService.addStaff(OWNER.pharmacy, PHARMACIST);

  const owner = {
    userId: session.account.id,
    role: "owner" as const,
    email: session.account.email,
    name: session.account.name,
    tokenVersion: 1,
  };

  const pharmacist = {
    userId: staff.id,
    role: "pharmacist" as const,
    email: staff.email,
    name: staff.name,
    tokenVersion: 1,
  };

  const fx = await makeFixtures();

  let request = await ApprovalService.request(
    { batch: String(fx.open._id), type: "RETURN_TO_SUPPLIER", reason: "Slow moving" },
    pharmacist,
  );

  await test("a request records who raised it and what it is worth", () => {
    assert.equal(request.requestedByName, PHARMACIST.name);
    assert.equal(request.status, "pending");
    assert.equal(request.qty, 140);
    assert.equal(request.value, 140 * 42);
  });

  await test("a pharmacist cannot decide anything", () => {
    assert.equal(ApprovalService.canDecide(request, pharmacist), false);
  });

  await test("the owner can decide a request raised by staff", () => {
    assert.equal(ApprovalService.canDecide(request, owner), true);
  });

  await test("a pharmacist is told why the buttons are closed to them", async () => {
    const { data } = await ApprovalService.getAll({}, pharmacist);
    assert.equal(data[0].canDecide, false);
    assert.ok(data[0].blockedReason.includes("Only the owner"));
  });

  await test("one batch carries one pending request at a time", async () => {
    await expectError(
      () =>
        ApprovalService.request(
          { batch: String(fx.open._id), type: "WRITE_OFF", reason: "" },
          pharmacist,
        ),
      "already waiting",
    );
  });

  await test("a return cannot be asked for after the window has closed", async () => {
    await expectError(
      () =>
        ApprovalService.request(
          { batch: String(fx.early._id), type: "RETURN_TO_SUPPLIER", reason: "" },
          pharmacist,
        ),
      "return window closed",
    );
  });

  await test("a write-off is still allowed after the return window closes", async () => {
    const writeOff = await ApprovalService.request(
      { batch: String(fx.early._id), type: "WRITE_OFF", reason: "Expired soon" },
      pharmacist,
    );
    assert.equal(writeOff.status, "pending");
    await StockAction.deleteOne({ _id: writeOff._id });
  });

  await test("approving a return closes the batch and empties the shelf", async () => {
    const decided = await ApprovalService.decide(String(request._id), true, owner);
    assert.equal(decided.status, "approved");
    assert.equal(decided.approvedByName, OWNER.name);

    const batch = await Batch.findById(fx.open._id).lean();
    assert.equal(batch!.state, "returned");
    assert.equal(batch!.left, 0);
    assert.equal(batch!.closedQty, 140);
  });

  await test("the same request cannot be decided twice", async () => {
    await expectError(
      () => ApprovalService.decide(String(request._id), false, owner),
      "already been decided",
    );
  });

  await test("nobody approves their own request, not even the owner", async () => {
    const own = await ApprovalService.request(
      { batch: String(fx.later._id), type: "RETURN_TO_SUPPLIER", reason: "" },
      owner,
    );

    assert.equal(ApprovalService.canDecide(own, owner), false);
    await expectError(
      () => ApprovalService.decide(String(own._id), true, owner),
      "someone else has to approve",
    );

    const { data } = await ApprovalService.getAll({ status: "pending" }, owner);
    const row = data.find((item) => String(item._id) === String(own._id));
    assert.ok(row!.blockedReason.includes("You raised this request"));
  });

  await test("a rejected request leaves the batch on the shelf", async () => {
    const raised = await ApprovalService.request(
      { batch: String(fx.expired._id), type: "WRITE_OFF", reason: "Expired" },
      pharmacist,
    );
    const decided = await ApprovalService.decide(String(raised._id), false, owner);

    assert.equal(decided.status, "rejected");
    const batch = await Batch.findById(fx.expired._id).lean();
    assert.equal(batch!.state, "open");
    assert.equal(batch!.left, 14);
  });

  await test("a closed batch cannot be asked about again", async () => {
    await expectError(
      () =>
        ApprovalService.request(
          { batch: String(fx.open._id), type: "WRITE_OFF", reason: "" },
          pharmacist,
        ),
      "already off the shelf",
    );
  });

  await stop();
  report("approval");
};

void run();
