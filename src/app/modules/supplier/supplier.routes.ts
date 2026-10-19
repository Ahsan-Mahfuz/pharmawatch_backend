import { Router } from "express";
import { ownerAuth, staffAuth } from "../../middleware/auth";
import { noStore } from "../../middleware/publicCache";
import { validateRequest } from "../../middleware/validateRequest";
import { SupplierController } from "./supplier.controller";
import { createSupplierSchema, updateSupplierSchema } from "./supplier.validation";

const router = Router();

router.use(noStore, staffAuth);

router.get("/", SupplierController.getAll);
router.get("/:id", SupplierController.getOne);
router.post("/", ownerAuth, validateRequest(createSupplierSchema), SupplierController.create);
router.patch("/:id", ownerAuth, validateRequest(updateSupplierSchema), SupplierController.update);
router.delete("/:id", ownerAuth, SupplierController.remove);

export const SupplierRoutes = router;
