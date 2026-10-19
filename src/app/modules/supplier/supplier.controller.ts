import { Request, Response } from "express";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import { SupplierService } from "./supplier.service";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const data = await SupplierService.getAll(req.query);
  sendResponse(res, { message: "Suppliers loaded", data });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
  const data = await SupplierService.findById(req.params.id);
  sendResponse(res, { message: "Supplier loaded", data });
});

const create = catchAsync(async (req: Request, res: Response) => {
  const data = await SupplierService.create(req.body);
  sendResponse(res, { statusCode: 201, message: "Supplier added", data });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const data = await SupplierService.update(req.params.id, req.body);
  sendResponse(res, { message: "Supplier saved", data });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const data = await SupplierService.remove(req.params.id);
  sendResponse(res, { message: "Supplier deleted", data });
});

export const SupplierController = { getAll, getOne, create, update, remove };
