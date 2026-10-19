import config from "../config";

export type BatchState = "open" | "returned" | "written-off";
export type BatchStatus = "active" | "near" | "critical" | "expired" | "closed";

export type StatusInput = { state: BatchState; left: number };

export const isClosed = (batch: StatusInput): boolean =>
  batch.state !== "open" || batch.left <= 0;

export const statusOf = (batch: StatusInput, d: number): BatchStatus => {
  if (isClosed(batch)) return "closed";
  if (d < 0) return "expired";
  if (d <= config.thresholds.critical) return "critical";
  if (d <= config.thresholds.near) return "near";
  return "active";
};

export const closedLabel = (state: BatchState): string => {
  if (state === "returned") return "Returned";
  if (state === "written-off") return "Written off";
  return "Sold out";
};

const OPEN_LABELS: Record<Exclude<BatchStatus, "closed">, string> = {
  expired: "Expired",
  critical: "Critical",
  near: "Near expiry",
  active: "Active",
};

export const statusLabel = (status: BatchStatus, state: BatchState): string =>
  status === "closed" ? closedLabel(state) : OPEN_LABELS[status];

export const isSellable = (batch: StatusInput, d: number): boolean =>
  !isClosed(batch) && d >= 0;
