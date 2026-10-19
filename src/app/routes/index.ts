import { Router } from "express";
import { ActivityRoutes } from "../modules/activity/activity.routes";
import { ApprovalRoutes } from "../modules/approval/approval.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { BatchRoutes } from "../modules/batch/batch.routes";
import { MedicineRoutes } from "../modules/medicine/medicine.routes";
import { PredictionRoutes } from "../modules/prediction/prediction.routes";
import { ReportRoutes } from "../modules/report/report.routes";
import { SaleRoutes } from "../modules/sale/sale.routes";
import { SupplierRoutes } from "../modules/supplier/supplier.routes";

const router = Router();

const routes = [
  { path: "/auth", route: AuthRoutes },
  { path: "/medicines", route: MedicineRoutes },
  { path: "/suppliers", route: SupplierRoutes },
  { path: "/batches", route: BatchRoutes },
  { path: "/sales", route: SaleRoutes },
  { path: "/stock-actions", route: ApprovalRoutes },
  { path: "/reports", route: ReportRoutes },
  { path: "/predictions", route: PredictionRoutes },
  { path: "/activity", route: ActivityRoutes },
];

routes.forEach((entry) => router.use(entry.path, entry.route));

export default router;
