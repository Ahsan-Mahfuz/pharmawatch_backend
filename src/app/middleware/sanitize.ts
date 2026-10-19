import { NextFunction, Request, Response } from "express";

const clean = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(clean);
  if (value === null || typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    if (key.startsWith("$") || key.includes(".")) continue;
    result[key] = clean(inner);
  }
  return result;
};

const sanitize = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object") req.body = clean(req.body);
  if (req.query && typeof req.query === "object") {
    req.query = clean(req.query) as Request["query"];
  }
  next();
};

export default sanitize;
