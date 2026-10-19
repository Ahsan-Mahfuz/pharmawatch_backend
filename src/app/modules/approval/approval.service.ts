import AppError from "../../error/appError";
import { listMeta, pageOf } from "../../builder/listQuery";
import { nextSequence } from "../../utilities/counter.model";
import { TokenPayload } from "../auth/auth.interface";
import { ActivityService } from "../activity/activity.service";
import { Batch } from "../batch/batch.model";
import { BatchService } from "../batch/batch.service";
import { StockAction } from "./approval.model";
import { RequestActionInput } from "./approval.validation";

const REQUEST_START = 314;

export const canDecide = (
  request: { requestedBy: unknown; status: string },
  user: TokenPayload,
): boolean =>
  user.role === "owner" &&
  request.status === "pending" &&
  String(request.requestedBy) !== user.userId;

const request = async (payload: RequestActionInput, user: TokenPayload) => {
  const view = await BatchService.findView(payload.batch);

  if (view.closed) throw new AppError(409, "This batch is already off the shelf");

  const pending = await StockAction.countDocuments({
    batch: payload.batch,
    status: "pending",
  });
  if (pending) throw new AppError(409, "This batch is already waiting on a decision");

  if (payload.type === "RETURN_TO_SUPPLIER" && view.daysToCutoff < 0) {
    throw new AppError(
      409,
      `The return window closed on ${view.cutoff}. A write-off is the remaining option.`,
    );
  }

  const seq = await nextSequence("stock-action", REQUEST_START);

  const doc = await StockAction.create({
    requestNo: `REQ-${seq}`,
    type: payload.type,
    batch: view.id,
    batchNo: view.batchNo,
    medicineName: view.medicine.name,
    qty: view.left,
    unit: view.unit,
    value: Math.round(view.left * view.cost),
    reason: payload.reason,
    requestedBy: user.userId,
    requestedByName: user.name,
  });

  const label = payload.type === "RETURN_TO_SUPPLIER" ? "return" : "write off";
  await ActivityService.log(
    `${user.name} asked to ${label} ${view.batchNo} · ${view.left} ${view.unit}`,
    payload.type === "RETURN_TO_SUPPLIER" ? "near" : "expired",
    user.email,
  );

  return doc.toObject();
};

const getAll = async (query: Record<string, unknown>, user: TokenPayload) => {
  const { page, limit, skip } = pageOf(query, 20);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.batchId) filter.batch = query.batchId;

  const [rows, total] = await Promise.all([
    StockAction.find(filter).sort({ status: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    StockAction.countDocuments(filter),
  ]);

  const data = rows.map((row) => ({
    ...row,
    canDecide: canDecide(row, user),
    blockedReason:
      row.status !== "pending"
        ? ""
        : user.role !== "owner"
          ? "Only the owner can decide this."
          : String(row.requestedBy) === user.userId
            ? "You raised this request, so someone else has to approve it."
            : "",
  }));

  return { data, meta: listMeta(page, limit, total) };
};

const decide = async (id: string, approve: boolean, user: TokenPayload) => {
  const doc = await StockAction.findById(id);
  if (!doc) throw new AppError(404, "That request was not found");

  if (doc.status !== "pending") {
    throw new AppError(409, "That request has already been decided");
  }
  if (String(doc.requestedBy) === user.userId) {
    throw new AppError(403, "You raised this request, so someone else has to approve it");
  }

  doc.status = approve ? "approved" : "rejected";
  doc.approvedBy = user.userId as never;
  doc.approvedByName = user.name;
  doc.resolvedAt = new Date();
  await doc.save();

  if (approve) {
    const batch = await Batch.findById(doc.batch);
    if (batch && batch.state === "open") {
      batch.closedQty = batch.left;
      batch.left = 0;
      batch.state = doc.type === "RETURN_TO_SUPPLIER" ? "returned" : "written-off";
      await batch.save();
    }
  }

  await ActivityService.log(
    `${user.name} ${approve ? "approved" : "rejected"} ${doc.requestNo} · ${doc.medicineName}`,
    approve ? "active" : "muted",
    user.email,
  );

  return doc.toObject();
};

export const ApprovalService = { request, getAll, decide, canDecide };
