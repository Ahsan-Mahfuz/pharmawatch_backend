import { Request, Response } from "express";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import { ReportService } from "./report.service";

const summary = catchAsync(async (_req: Request, res: Response) => {
  const data = await ReportService.summary();
  sendResponse(res, { message: "Dashboard loaded", data });
});

const expiryCalendar = catchAsync(async (req: Request, res: Response) => {
  const months = Math.min(24, Math.max(1, Number(req.query.months) || 6));
  const data = await ReportService.expiryCalendar(months);
  sendResponse(res, { message: "Expiry calendar loaded", data });
});

const lossSummary = catchAsync(async (req: Request, res: Response) => {
  const data = await ReportService.lossSummary(req.query);
  sendResponse(res, { message: "Report loaded", data });
});

const returnWindows = catchAsync(async (req: Request, res: Response) => {
  const withinDays = Math.min(365, Math.max(1, Number(req.query.withinDays) || 45));
  const data = await ReportService.returnWindows(withinDays);
  sendResponse(res, { message: "Return windows loaded", data });
});

export const ReportController = { summary, expiryCalendar, lossSummary, returnWindows };
