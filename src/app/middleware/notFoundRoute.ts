import { Request, Response } from "express";

const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `No route matches ${req.method} ${req.originalUrl}`,
  });
};

export default notFound;
