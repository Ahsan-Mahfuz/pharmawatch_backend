import { Response } from "express";

type Payload<T> = {
  statusCode?: number;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
};

const sendResponse = <T>(res: Response, payload: Payload<T>) => {
  const statusCode = payload.statusCode ?? 200;
  res.status(statusCode).json({
    success: true,
    statusCode,
    message: payload.message,
    ...(payload.meta ? { meta: payload.meta } : {}),
    data: payload.data,
  });
};

export default sendResponse;
