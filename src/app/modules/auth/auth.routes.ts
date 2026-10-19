import { Router } from "express";
import { ownerAuth, staffAuth } from "../../middleware/auth";
import { noStore } from "../../middleware/publicCache";
import {
  forgotLimiter,
  loginEmailLimiter,
  loginLimiter,
  registerLimiter,
  resetLimiter,
} from "../../middleware/rateLimit";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import {
  addStaffSchema,
  changePasswordSchema,
  forgotSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.validation";

const router = Router();

router.use(noStore);

router.post(
  "/register",
  registerLimiter,
  validateRequest(registerSchema),
  AuthController.register,
);
router.post(
  "/login",
  loginLimiter,
  validateRequest(loginSchema),
  loginEmailLimiter,
  AuthController.login,
);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);

router.post(
  "/forgot-password",
  validateRequest(forgotSchema),
  forgotLimiter,
  AuthController.forgotPassword,
);
router.post(
  "/reset-password",
  resetLimiter,
  validateRequest(resetPasswordSchema),
  AuthController.resetPassword,
);

router.get("/me", staffAuth, AuthController.me);
router.post(
  "/change-password",
  staffAuth,
  validateRequest(changePasswordSchema),
  AuthController.changePassword,
);

router.get("/staff", ownerAuth, AuthController.staff);
router.post(
  "/staff",
  ownerAuth,
  validateRequest(addStaffSchema),
  AuthController.addStaff,
);

export const AuthRoutes = router;
