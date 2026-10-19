import { Router } from "express";
import { ownerAuth, staffAuth } from "../../middleware/auth";
import { noStore } from "../../middleware/publicCache";
import { validateRequest } from "../../middleware/validateRequest";
import { MedicineController } from "./medicine.controller";
import { createMedicineSchema, updateMedicineSchema } from "./medicine.validation";

const router = Router();

router.use(noStore, staffAuth);

router.get("/", MedicineController.getAll);
router.get("/:id", MedicineController.getOne);
router.post("/", validateRequest(createMedicineSchema), MedicineController.create);
router.patch("/:id", validateRequest(updateMedicineSchema), MedicineController.update);
router.delete("/:id", ownerAuth, MedicineController.remove);

export const MedicineRoutes = router;
