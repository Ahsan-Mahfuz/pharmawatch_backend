import { Router } from "express";
import { ownerAuth, staffAuth } from "../../middleware/auth";
import { noStore } from "../../middleware/publicCache";
import { validateRequest } from "../../middleware/validateRequest";
import { ApprovalController } from "./approval.controller";
import { decideSchema, requestActionSchema } from "./approval.validation";

const router = Router();

router.use(noStore, staffAuth);

router.get("/", ApprovalController.getAll);
router.post("/", validateRequest(requestActionSchema), ApprovalController.request);

router.patch(
  "/:id/approve",
  ownerAuth,
  validateRequest(decideSchema),
  ApprovalController.approve,
);
router.patch(
  "/:id/reject",
  ownerAuth,
  validateRequest(decideSchema),
  ApprovalController.reject,
);

export const ApprovalRoutes = router;
