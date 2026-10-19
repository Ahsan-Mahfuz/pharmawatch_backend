import { Router } from "express";
import { staffAuth } from "../../middleware/auth";
import { noStore } from "../../middleware/publicCache";
import { writeLimiter } from "../../middleware/rateLimit";
import { validateQuery, validateRequest } from "../../middleware/validateRequest";
import { SaleController } from "./sale.controller";
import { createSaleSchema, fefoQuerySchema } from "./sale.validation";

const router = Router();

router.use(noStore, staffAuth);

router.get("/fefo-suggestion", validateQuery(fefoQuerySchema), SaleController.fefo);
router.get("/", SaleController.getAll);
router.get("/:id", SaleController.getOne);
router.post("/", writeLimiter, validateRequest(createSaleSchema), SaleController.create);

export const SaleRoutes = router;
