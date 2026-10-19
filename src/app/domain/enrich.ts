import { daysTo } from "./dates";
import { Recommendation, recommend } from "./recommend";
import { Band, Score, bandOf, expectedUnsold, riskFactors, score, sellRate } from "./risk";
import { BatchState, BatchStatus, isClosed, isSellable, statusLabel, statusOf } from "./status";

export type RawBatch = {
  batchNo: string;
  unit: string;
  supplierName: string;
  returnWindowDays: number;
  qtyIn: number;
  left: number;
  cost: number;
  price: number;
  received: Date | string;
  expiry: Date | string;
  cutoff: Date | string;
  r30: number;
  r7: number;
  discount: number;
  state: BatchState;
};

export type Derived = {
  daysToExpiry: number;
  daysToCutoff: number;
  closed: boolean;
  sellable: boolean;
  status: BatchStatus;
  statusLabel: string;
  riskScore: number;
  riskBand: Band;
  sellRate: number;
  coverage: number;
  fractionRemaining: number;
  projectedSales: number;
  expectedUnsold: number;
  valueAtRisk: number;
  priceNow: number;
  factors: ReturnType<typeof riskFactors>;
  recommendation: Recommendation;
};

export const derive = (batch: RawBatch): Derived => {
  const d = daysTo(batch.expiry);
  const c = daysTo(batch.cutoff);
  const closed = isClosed(batch);
  const rate = sellRate(batch);
  const raw: Score = score(d, batch.left, batch.qtyIn, rate);
  const p = closed ? 0 : raw.p;
  const unsold = closed ? 0 : expectedUnsold(d, batch.left, rate);
  const valueAtRisk = unsold * batch.cost;
  const status = statusOf(batch, d);

  return {
    daysToExpiry: d,
    daysToCutoff: c,
    closed,
    sellable: isSellable(batch, d),
    status,
    statusLabel: statusLabel(status, batch.state),
    riskScore: Number(p.toFixed(4)),
    riskBand: bandOf(p, closed),
    sellRate: Number(rate.toFixed(4)),
    coverage: Number(raw.cov.toFixed(4)),
    fractionRemaining: Number(raw.frac.toFixed(4)),
    projectedSales: Math.round(rate * Math.max(d, 0)),
    expectedUnsold: unsold,
    valueAtRisk: Math.round(valueAtRisk),
    priceNow: Number((batch.price * (1 - (batch.discount || 0) / 100)).toFixed(2)),
    factors: riskFactors(raw.cov, raw.frac, d),
    recommendation: recommend({
      d,
      c,
      p,
      left: batch.left,
      unit: batch.unit,
      unsold,
      valueAtRisk,
      recoverable: batch.left * batch.cost,
      discount: batch.discount || 0,
      supplier: batch.supplierName,
      closed,
    }),
  };
};
