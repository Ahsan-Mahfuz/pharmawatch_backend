class AppError extends Error {
  public statusCode: number;
  public details?: { path: string; message: string }[];

  constructor(
    statusCode: number,
    message: string,
    details?: { path: string; message: string }[],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
