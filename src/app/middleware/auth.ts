import { NextFunction, Request, Response } from "express";
import AppError from "../error/appError";
import { verifyAccessToken } from "../utilities/token";
import { TokenPayload, TRole } from "../modules/auth/auth.interface";

export const auth =
  (...roles: TRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(new AppError(401, "Please sign in to continue"));
    }

    let payload: TokenPayload;
    try {
      payload = verifyAccessToken(header.slice(7));
    } catch {
      return next(new AppError(401, "Your session has expired. Please sign in again."));
    }

    if (roles.length && !roles.includes(payload.role)) {
      return next(new AppError(403, "You do not have access to this area"));
    }

    req.user = payload;
    next();
  };

export const staffAuth = auth("owner", "pharmacist");
export const ownerAuth = auth("owner");
