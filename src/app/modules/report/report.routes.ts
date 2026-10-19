import { Router } from "express";
import { staffAuth } from "../../middleware/auth";
import { noStore } from "../../middleware/publicCache";
import { ReportController } from "./report.controller";

const router = Router();

router.use(noStore, staffAuth);

router.get("/summary", ReportController.summary);
router.get("/expiry-calendar", ReportController.expiryCalendar);
router.get("/loss-summary", ReportController.lossSummary);
router.get("/return-windows", ReportController.returnWindows);

export const ReportRoutes = router;
