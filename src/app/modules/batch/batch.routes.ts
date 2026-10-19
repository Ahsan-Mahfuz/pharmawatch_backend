import { Router } from "express";
import { staffAuth } from "../../middleware/auth";
import { noStore } from "../../middleware/publicCache";
import { writeLimiter } from "../../middleware/rateLimit";
import { validateRequest } from "../../middleware/validateRequest";
import { BatchController } from "./batch.controller";
import { createBatchSchema, discountSchema, updateBatchSchema } from "./batch.validation";

const router = Router();

router.use(noStore, staffAuth);

router.get("/", BatchController.getAll);
router.get("/:id", BatchController.getOne);
router.get("/:id/risk", BatchController.getRisk);

router.post("/", writeLimiter, validateRequest(createBatchSchema), BatchController.create);
router.patch("/:id", validateRequest(updateBatchSchema), BatchController.update);
router.post(
  "/:id/discount",
  validateRequest(discountSchema),
  BatchController.applyDiscount,
);

export const BatchRoutes = router;
