import { ListResult, listMeta, pageOf } from "../../builder/listQuery";
import { Activity } from "./activity.model";

export type Tone = "muted" | "active" | "near" | "critical" | "expired";

const record = (entry: {
  actor: string;
  action: string;
  path: string;
  status: number;
  ip: string;
}) => {
  void Activity.create({ kind: "audit", ...entry }).catch(() => undefined);
};

const log = async (text: string, tone: Tone, actor = "") => {
  await Activity.create({ kind: "event", text, tone, actor });
};

const feed = async (query: Record<string, unknown>): Promise<ListResult<unknown>> => {
  const { page, limit, skip } = pageOf(query, 12);
  const filter = { kind: query.kind === "audit" ? "audit" : "event" };

  const [rows, total] = await Promise.all([
    Activity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Activity.countDocuments(filter),
  ]);

  return { data: rows, meta: listMeta(page, limit, total) };
};

export const ActivityService = { record, log, feed };
