import express, { Request, Response } from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoose from "mongoose";
import config from "./app/config";
import auditLog from "./app/middleware/auditLog";
import errorMiddleware from "./app/middleware/globalErrorHandler";
import notFound from "./app/middleware/notFoundRoute";
import sanitize from "./app/middleware/sanitize";
import router from "./app/routes";

const app = express();

app.set("trust proxy", 1);
app.set("etag", "weak");
app.disable("x-powered-by");

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());

const allowed = new Set(config.cors_origins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowed.has(origin) || !config.is_production) {
        return callback(null, true);
      }
      callback(new Error("This origin is not allowed"));
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  }),
);

app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());
app.use(sanitize);
app.use(auditLog);

app.get("/", (_req: Request, res: Response) => {
  res.json({ name: "PharmaWatch API", status: "ok" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  res.json({
    status: mongoose.connection.readyState === 1 ? "ok" : "starting",
    uptime: Math.round(process.uptime()),
  });
});

app.use("/api/v1", router);

app.use(notFound);
app.use(errorMiddleware);

export default app;
