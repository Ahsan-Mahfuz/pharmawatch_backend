import { listMeta, pageOf, paginate } from "../../builder/listQuery";
import { MODEL_METRICS, MODEL_VERSION, MODEL_WEIGHTS, score } from "../../domain";
import { BatchService } from "../batch/batch.service";

const deadStock = async (query: Record<string, unknown>) => {
  const { page, limit } = pageOf(query, 20);
  const minimum = Number(query.minScore ?? 0.4);

  const rows = (await BatchService.viewsOf())
    .filter((batch) => !batch.closed && batch.riskScore >= minimum)
    .sort((a, b) => b.riskScore - a.riskScore || a.daysToExpiry - b.daysToExpiry)
    .map((batch) => ({
      batchId: batch.id,
      batchNo: batch.batchNo,
      medicine: batch.medicine.name,
      supplier: batch.supplier.name,
      daysToExpiry: batch.daysToExpiry,
      left: batch.left,
      unit: batch.unit,
      riskScore: batch.riskScore,
      riskBand: batch.riskBand,
      expectedUnsold: batch.expectedUnsold,
      valueAtRisk: batch.valueAtRisk,
      factors: batch.factors,
      recommendation: batch.recommendation,
    }));

  return { data: paginate(rows, page, limit), meta: listMeta(page, limit, rows.length) };
};

const modelInfo = () => ({
  name: "Dead stock risk",
  kind: "logistic regression",
  version: MODEL_VERSION,
  question: "Will this batch fail to sell out before it expires?",
  features: [
    { name: "coverage", definition: "min(2, sellRate x daysToExpiry / unitsLeft)" },
    { name: "fractionRemaining", definition: "min(1, unitsLeft / quantityReceived)" },
    { name: "insideFinal30Days", definition: "1 when daysToExpiry is 30 or fewer" },
  ],
  sellRate: "(0.6 x unitsPerDay30 + 0.4 x unitsPerDay7) x (1 + discountPercent / 25)",
  weights: MODEL_WEIGHTS,
  bands: { high: 0.7, medium: 0.4 },
  evaluation: MODEL_METRICS,
  limitations: [
    "Seasonality is invisible: only the last 30 days of sales are read.",
    "A single wholesale sale makes a slow batch look fast for a month.",
    "Under 50 finished batches the weights are unreliable; the days-left rule is the fallback.",
    "Nothing outside the shop is known: competitor pricing, prescribing habits, supply shocks.",
  ],
});

const simulate = (input: {
  daysToExpiry: number;
  left: number;
  qtyIn: number;
  unitsPerDay: number;
}) => {
  const result = score(input.daysToExpiry, input.left, input.qtyIn, input.unitsPerDay);
  const sold = Math.min(input.left, Math.round(input.unitsPerDay * input.daysToExpiry));

  return {
    ...input,
    riskScore: Number(result.p.toFixed(4)),
    coverage: Number(result.cov.toFixed(4)),
    fractionRemaining: Number(result.frac.toFixed(4)),
    projectedSales: sold,
    expectedUnsold: input.left - sold,
  };
};

export const PredictionService = { deadStock, modelInfo, simulate };
