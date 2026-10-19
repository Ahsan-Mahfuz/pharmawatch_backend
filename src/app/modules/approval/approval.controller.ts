import { Request, Response } from "express";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import { ApprovalService } from "./approval.service";

const request = catchAsync(async (req: Request, res: Response) => {
  const data = await ApprovalService.request(req.body, req.user!);
  sendResponse(res, { statusCode: 201, message: "Request raised", data });
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await ApprovalService.getAll(req.query, req.user!);
  sendResponse(res, { message: "Requests loaded", data, meta });
});

const approve = catchAsync(async (req: Request, res: Response) => {
  const data = await ApprovalService.decide(req.params.id, true, req.user!);
  sendResponse(res, { message: "Request approved", data });
});

const reject = catchAsync(async (req: Request, res: Response) => {
  const data = await ApprovalService.decide(req.params.id, false, req.user!);
  sendResponse(res, { message: "Request rejected", data });
});

export const ApprovalController = { request, getAll, approve, reject };
