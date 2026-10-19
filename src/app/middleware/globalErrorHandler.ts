import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import AppError from "../error/appError";
import config from "../config";

type Detail = { path: string; message: string };

const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = 500;
  let message = "Something went wrong";
  let details: Detail[] = [];

  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Please check the highlighted fields";
    details = error.errors.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Please check the highlighted fields";
    details = Object.values(error.errors).map((issue) => ({
      path: issue.path,
      message: issue.message,
    }));
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "That record id is not valid";
    details = [{ path: error.path, message: "Invalid id" }];
  } else if (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  ) {
    const field = Object.keys((error as { keyValue?: object }).keyValue ?? {})[0] ?? "value";
    statusCode = 409;
    message = `That ${field} is already in use`;
    details = [{ path: field, message: "Already in use" }];
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details ?? [];
  } else if (error instanceof Error) {
    message = config.is_production ? message : error.message;
  }

  if (statusCode >= 500) console.error(error);

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(details.length ? { errors: details } : {}),
  });
};

export default errorMiddleware;
