import { NextFunction, Request, Response } from "express";
import { ActivityService } from "../modules/activity/activity.service";

const TRACKED = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const auditLog = (req: Request, res: Response, next: NextFunction) => {
  if (!TRACKED.has(req.method)) return next();

  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    ActivityService.record({
      actor: req.user?.email ?? "guest",
      action: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      ip: req.ip ?? "",
    });
  });

  next();
};

export default auditLog;
