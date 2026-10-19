import { NextFunction, Request, Response } from "express";

export const publicCache =
  (maxAge: number, sharedMaxAge = maxAge * 5) =>
  (_req: Request, res: Response, next: NextFunction) => {
    res.set(
      "Cache-Control",
      `public, max-age=${maxAge}, s-maxage=${sharedMaxAge}, stale-while-revalidate=${sharedMaxAge * 2}`,
    );
    next();
  };

export const noStore = (_req: Request, res: Response, next: NextFunction) => {
  res.set("Cache-Control", "no-store");
  next();
};
