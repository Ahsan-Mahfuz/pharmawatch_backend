import { Request, Response } from "express";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import { MedicineService } from "./medicine.service";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await MedicineService.getAll(req.query);
  sendResponse(res, { message: "Medicines loaded", data, meta });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
  const data = await MedicineService.findById(req.params.id);
  sendResponse(res, { message: "Medicine loaded", data });
});

const create = catchAsync(async (req: Request, res: Response) => {
  const data = await MedicineService.create(req.body);
  sendResponse(res, { statusCode: 201, message: "Medicine added", data });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const data = await MedicineService.update(req.params.id, req.body);
  sendResponse(res, { message: "Medicine saved", data });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const data = await MedicineService.remove(req.params.id);
  sendResponse(res, { message: "Medicine deleted", data });
});

export const MedicineController = { getAll, getOne, create, update, remove };
