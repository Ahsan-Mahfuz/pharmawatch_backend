import { Request, Response } from "express";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import { PredictionService } from "./prediction.service";

const deadStock = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await PredictionService.deadStock(req.query);
  sendResponse(res, { message: "Dead stock risk loaded", data, meta });
});

const modelInfo = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, { message: "Model info loaded", data: PredictionService.modelInfo() });
});

const simulate = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    message: "Scored",
    data: PredictionService.simulate(req.body),
  });
});

export const PredictionController = { deadStock, modelInfo, simulate };
