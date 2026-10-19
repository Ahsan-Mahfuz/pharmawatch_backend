import assert from "assert";
import { report, test } from "./harness";

const run = async () => {
  const { statusOf, isClosed, isSellable } = await import("../src/app/domain/status");
  const { sellRate, score, expectedUnsold, bandOf } = await import("../src/app/domain/risk");
  const { recommend, discountTier } = await import("../src/app/domain/recommend");
  const { daysBetween, addDays, startOfDay } = await import("../src/app/domain/dates");

  const open = { state: "open" as const, left: 100 };

  await test("status is read from days left, at 90 and 30", () => {
    assert.equal(statusOf(open, 91), "active");
    assert.equal(statusOf(open, 90), "near");
    assert.equal(statusOf(open, 31), "near");
    assert.equal(statusOf(open, 30), "critical");
    assert.equal(statusOf(open, 1), "critical");
    assert.equal(statusOf(open, 0), "critical");
    assert.equal(statusOf(open, -1), "expired");
  });

  await test("closed beats every other status", () => {
    assert.equal(statusOf({ state: "returned", left: 50 }, 200), "closed");
    assert.equal(statusOf({ state: "written-off", left: 50 }, -5), "closed");
    assert.equal(statusOf({ state: "open", left: 0 }, 200), "closed");
    assert.equal(isClosed({ state: "open", left: 0 }), true);
  });

  await test("an expired or closed batch can never be sold", () => {
    assert.equal(isSellable(open, 0), true);
    assert.equal(isSellable(open, -1), false);
    assert.equal(isSellable({ state: "returned", left: 10 }, 30), false);
  });

  await test("sell rate leans on the 30 day pace", () => {
    assert.equal(sellRate({ r30: 1, r7: 0, discount: 0 }), 0.6);
    assert.equal(sellRate({ r30: 0, r7: 1, discount: 0 }), 0.4);
  });

  await test("a 25 percent discount doubles the assumed pace", () => {
    assert.equal(sellRate({ r30: 1, r7: 1, discount: 25 }), 2);
  });

  await test("an empty batch carries no risk and an expired one carries all of it", () => {
    assert.equal(score(30, 0, 100, 1).p, 0);
    assert.equal(score(-1, 50, 100, 1).p, 1);
  });

  await test("coverage is capped at 2 so a fast seller cannot go negative", () => {
    assert.equal(score(3650, 10, 100, 100).cov, 2);
  });

  await test("the final 30 days add a fixed nudge", () => {
    const inside = score(30, 88, 500, 0.7).p;
    const outside = score(31, 88, 500, 0.7).p;
    assert.ok(inside > outside);
  });

  await test("the score always lands between 0 and 1", () => {
    for (const d of [0, 1, 30, 90, 365]) {
      for (const rate of [0, 0.5, 5, 50]) {
        const { p } = score(d, 88, 500, rate);
        assert.ok(p >= 0 && p <= 1, `p was ${p}`);
      }
    }
  });

  await test("expected unsold is what the pace cannot clear", () => {
    assert.equal(expectedUnsold(27, 88, 0.9), 64);
    assert.equal(expectedUnsold(3650, 88, 0.9), 0);
    assert.equal(expectedUnsold(-1, 88, 0.9), 88);
  });

  await test("bands split at 0.70 and 0.40", () => {
    assert.equal(bandOf(0.7, false), "High");
    assert.equal(bandOf(0.69, false), "Medium");
    assert.equal(bandOf(0.4, false), "Medium");
    assert.equal(bandOf(0.39, false), "Low");
    assert.equal(bandOf(0.99, true), "No");
  });

  await test("the discount ladder deepens with the risk", () => {
    assert.equal(discountTier(0.85), 30);
    assert.equal(discountTier(0.7), 25);
    assert.equal(discountTier(0.55), 15);
    assert.equal(discountTier(0.4), 10);
  });

  const base = {
    left: 88,
    unit: "strips",
    unsold: 64,
    valueAtRisk: 2688,
    recoverable: 3696,
    discount: 0,
    supplier: "Beximco Pharma",
    closed: false,
  };

  await test("an expired batch is written off, whatever else is true", () => {
    assert.equal(recommend({ ...base, d: -5, c: 30, p: 0.1 }).kind, "writeoff");
  });

  await test("a return beats a discount while the window is open", () => {
    assert.equal(recommend({ ...base, d: 45, c: 20, p: 0.8 }).kind, "return");
  });

  await test("once the window has closed the answer is a discount", () => {
    const result = recommend({ ...base, d: 26, c: -64, p: 0.93 });
    assert.equal(result.kind, "discount");
    assert.equal(result.discountPercent, 30);
  });

  await test("a discount already deeper than the ladder is left alone", () => {
    const result = recommend({ ...base, d: 26, c: -64, p: 0.93, discount: 30 });
    assert.equal(result.kind, "watch");
  });

  await test("a slow batch with plenty of time is only watched", () => {
    assert.equal(recommend({ ...base, d: 300, c: 200, p: 0.5 }).kind, "watch");
  });

  await test("a healthy batch is left to sell", () => {
    assert.equal(recommend({ ...base, d: 300, c: 200, p: 0.1 }).kind, "keep");
  });

  await test("a closed batch has nothing left to decide", () => {
    assert.equal(recommend({ ...base, d: 30, c: 10, p: 0.9, closed: true }).kind, "none");
  });

  await test("dates are counted in whole days, ignoring the clock", () => {
    const start = startOfDay("2026-10-19T23:30:00.000Z");
    assert.equal(daysBetween(start, addDays(start, 45)), 45);
    assert.equal(daysBetween("2026-10-19", "2026-10-19"), 0);
    assert.equal(daysBetween("2026-10-19", "2026-10-18"), -1);
  });

  report("domain");
};

void run();
