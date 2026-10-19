import { Request, Response } from "express";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import { SaleService } from "../sale/sale.service";
import { BatchService } from "./batch.service";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await BatchService.getAll(req.query);
  sendResponse(res, { message: "Batches loaded", data, meta });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
  const batch = await BatchService.findView(req.params.id);
  const movement = await SaleService.movementOf(req.params.id);
  sendResponse(res, { message: "Batch loaded", data: { ...batch, movement } });
});

const getRisk = catchAsync(async (req: Request, res: Response) => {
  const batch = await BatchService.findView(req.params.id);
  sendResponse(res, {
    message: "Risk loaded",
    data: {
      batchId: batch.id,
      batchNo: batch.batchNo,
      riskScore: batch.riskScore,
      riskBand: batch.riskBand,
      expectedUnsold: batch.expectedUnsold,
      valueAtRisk: batch.valueAtRisk,
      factors: batch.factors,
      recommendation: batch.recommendation,
    },
  });
});

const create = catchAsync(async (req: Request, res: Response) => {
  const data = await BatchService.create(req.body, req.user!.userId);
  sendResponse(res, { statusCode: 201, message: "Batch is on the shelf", data });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const data = await BatchService.update(req.params.id, req.body);
  sendResponse(res, { message: "Batch saved", data });
});

const applyDiscount = catchAsync(async (req: Request, res: Response) => {
  const data = await BatchService.applyDiscount(req.params.id, req.body);
  sendResponse(res, { message: `${req.body.percent}% off is live`, data });
});

export const BatchController = { getAll, getOne, getRisk, create, update, applyDiscount };
