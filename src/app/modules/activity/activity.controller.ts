import { Request, Response } from "express";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import { ActivityService } from "./activity.service";

const feed = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await ActivityService.feed(req.query);
  sendResponse(res, { message: "Activity loaded", data, meta });
});

export const ActivityController = { feed };
