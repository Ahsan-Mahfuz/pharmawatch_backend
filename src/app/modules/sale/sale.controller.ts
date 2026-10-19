import { Request, Response } from "express";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import { SaleService } from "./sale.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const data = await SaleService.create(req.body, req.user!);
  sendResponse(res, { statusCode: 201, message: "Sale recorded", data });
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await SaleService.getAll(req.query);
  sendResponse(res, { message: "Sales loaded", data, meta });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
  const data = await SaleService.findById(req.params.id);
  sendResponse(res, { message: "Sale loaded", data });
});

const fefo = catchAsync(async (req: Request, res: Response) => {
  const data = await SaleService.suggestion(
    String(req.query.medicineId),
    Number(req.query.quantity ?? 1),
  );
  sendResponse(res, { message: "Oldest stock first", data });
});

export const SaleController = { create, getAll, getOne, fefo };
