import { Router } from "express";
import { staffAuth } from "../../middleware/auth";
import { noStore } from "../../middleware/publicCache";
import { ActivityController } from "./activity.controller";

const router = Router();

router.use(noStore, staffAuth);

router.get("/", ActivityController.feed);

export const ActivityRoutes = router;
