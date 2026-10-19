import { Router } from "express";
import { staffAuth } from "../../middleware/auth";
import { noStore } from "../../middleware/publicCache";
import { validateRequest } from "../../middleware/validateRequest";
import { PredictionController } from "./prediction.controller";
import { simulateSchema } from "./prediction.validation";

const router = Router();

router.use(noStore, staffAuth);

router.get("/dead-stock", PredictionController.deadStock);
router.get("/model-info", PredictionController.modelInfo);
router.post("/simulate", validateRequest(simulateSchema), PredictionController.simulate);

export const PredictionRoutes = router;
