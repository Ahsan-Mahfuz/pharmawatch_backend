export type Band = "High" | "Medium" | "Low" | "No";

export type RateInput = { r30: number; r7: number; discount?: number };

export const sellRate = (batch: RateInput): number =>
  (0.6 * batch.r30 + 0.4 * batch.r7) * (1 + (batch.discount || 0) / 25);

export type Score = { p: number; cov: number; frac: number };

export const score = (d: number, left: number, qtyIn: number, rate: number): Score => {
  if (left <= 0) return { p: 0, cov: 0, frac: 0 };

  const frac = Math.min(1, left / qtyIn);
  const cov = Math.min(2, (rate * Math.max(d, 0)) / left);

  if (d < 0) return { p: 1, cov, frac };

  const z = 2.4 - 3.4 * cov + 1.1 * frac + (d <= 30 ? 0.7 : 0);
  return { p: 1 / (1 + Math.exp(-z)), cov, frac };
};

export const expectedUnsold = (d: number, left: number, rate: number): number => {
  if (left <= 0) return 0;
  if (d < 0) return left;
  return Math.max(0, Math.round(left - rate * Math.max(d, 0)));
};

export const bandOf = (p: number, closed: boolean): Band => {
  if (closed) return "No";
  if (p >= 0.7) return "High";
  if (p >= 0.4) return "Medium";
  return "Low";
};

export const MODEL_VERSION = 7;

export const MODEL_WEIGHTS = [
  { feature: "intercept", weight: 2.4 },
  { feature: "coverage", weight: -3.4 },
  { feature: "fractionRemaining", weight: 1.1 },
  { feature: "insideFinal30Days", weight: 0.7 },
];

export const MODEL_METRICS = {
  sampleSize: 214,
  split: "80/20 by time",
  model: { accuracy: 0.86, precision: 0.81, recall: 0.89, f1: 0.85 },
  baseline: { accuracy: 0.71, precision: 0.63, recall: 0.52, f1: 0.57 },
  baselineRule: "flag any batch with fewer than 30 days left",
};

export const riskFactors = (cov: number, frac: number, d: number) => {
  const inFinal30 = d >= 0 && d <= 30;
  return [
    { feature: "coverage", value: Number(cov.toFixed(3)), contribution: Number((-3.4 * cov).toFixed(3)) },
    { feature: "fractionRemaining", value: Number(frac.toFixed(3)), contribution: Number((1.1 * frac).toFixed(3)) },
    { feature: "insideFinal30Days", value: inFinal30 ? 1 : 0, contribution: inFinal30 ? 0.7 : 0 },
  ];
};
