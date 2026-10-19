import { NextFunction, Request, Response } from "express";
import config from "../config";
import AppError from "../error/appError";

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

setInterval(() => {
  const now = Date.now();
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}, 60_000).unref();

type Options = { windowMs: number; max: number; message?: string; byBody?: string };

export const rateLimit =
  ({ windowMs, max, message, byBody }: Options) =>
  (req: Request, res: Response, next: NextFunction) => {
    const subject = byBody ? String(req.body?.[byBody] ?? "").toLowerCase() : req.ip;
    const key = `${req.method}:${req.baseUrl}${req.path}:${subject}`;
    const now = Date.now();
    const window = windows.get(key);

    if (!window || window.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    window.count += 1;
    if (window.count > max) {
      res.set("Retry-After", String(Math.ceil((window.resetAt - now) / 1000)));
      return next(
        new AppError(429, message ?? "Too many requests. Please wait a moment and try again."),
      );
    }

    next();
  };

const TOO_MANY = "Too many attempts. Please try again in a few minutes.";

const { login, forgot, register, reset, write } = config.limits;

export const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: login, message: TOO_MANY });

export const loginEmailLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: login,
  message: TOO_MANY,
  byBody: "email",
});

export const forgotLimiter = rateLimit({
  windowMs: 60 * 60_000,
  max: forgot,
  message: TOO_MANY,
  byBody: "email",
});

export const resetLimiter = rateLimit({ windowMs: 60 * 60_000, max: reset, message: TOO_MANY });
export const registerLimiter = rateLimit({ windowMs: 60 * 60_000, max: register, message: TOO_MANY });
export const writeLimiter = rateLimit({ windowMs: 60_000, max: write });
