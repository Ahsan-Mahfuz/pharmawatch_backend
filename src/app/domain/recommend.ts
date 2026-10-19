export type RecKind = "none" | "writeoff" | "return" | "discount" | "watch" | "keep";

export type Recommendation = {
  kind: RecKind;
  title: string;
  reason: string;
  action: string | null;
  discountPercent?: number;
};

export const discountTier = (p: number): number => {
  if (p >= 0.85) return 30;
  if (p >= 0.7) return 25;
  if (p >= 0.55) return 15;
  return 10;
};

export type RecInput = {
  d: number;
  c: number;
  p: number;
  left: number;
  unit: string;
  unsold: number;
  valueAtRisk: number;
  recoverable: number;
  discount: number;
  supplier: string;
  closed: boolean;
};

const money = (amount: number): string => `BDT ${Math.round(amount).toLocaleString("en-IN")}`;

export const recommend = (x: RecInput): Recommendation => {
  if (x.closed) {
    return {
      kind: "none",
      title: "Closed",
      reason: "This batch is off the shelf. There is nothing left to decide.",
      action: null,
    };
  }

  if (x.d < 0) {
    return {
      kind: "writeoff",
      title: "Write off",
      reason: `Expired ${-x.d} days ago and blocked at the counter. Request a write-off so the shelf count stays true.`,
      action: "WRITE_OFF",
    };
  }

  if (x.p >= 0.4 && x.d <= 120) {
    if (x.c >= 0) {
      return {
        kind: "return",
        title: "Return to supplier",
        reason: `${x.supplier} accepts returns for another ${x.c} days. Sending back all ${x.left} ${x.unit} recovers ${money(x.recoverable)} at cost.`,
        action: "RETURN_TO_SUPPLIER",
      };
    }

    const percent = discountTier(x.p);
    if (percent > x.discount) {
      return {
        kind: "discount",
        title: `${x.discount ? "Raise the discount to " : "Discount "}${percent}%`,
        reason: `About ${x.unsold} ${x.unit} (${money(x.valueAtRisk)}) would expire on the shelf. The return window has closed, so a price cut is the best recovery left.`,
        action: "APPLY_DISCOUNT",
        discountPercent: percent,
      };
    }

    return {
      kind: "watch",
      title: "Hold the discount",
      reason: `A ${x.discount}% discount is already live. Give it a week of sales before cutting further.`,
      action: null,
    };
  }

  if (x.p >= 0.4) {
    return {
      kind: "watch",
      title: "Watch",
      reason: `Selling slower than it should, but ${x.d} days remain. The score is checked again every night.`,
      action: null,
    };
  }

  return {
    kind: "keep",
    title: "Keep selling",
    reason: `On pace to clear ${x.left} ${x.unit} before expiry. No action needed.`,
    action: null,
  };
};
