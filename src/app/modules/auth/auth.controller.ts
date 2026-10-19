import { Request, Response } from "express";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import { REFRESH_COOKIE, clearRefreshCookie, setRefreshCookie } from "../../utilities/token";
import { UserService } from "../user/user.service";
import { AuthService } from "./auth.service";

const register = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken, remember, ...rest } = await AuthService.register(req.body);
  setRefreshCookie(res, refreshToken, remember);
  sendResponse(res, { statusCode: 201, message: "Account created", data: rest });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken, remember, ...rest } = await AuthService.login(req.body);
  setRefreshCookie(res, refreshToken, remember);
  sendResponse(res, { message: "Signed in", data: rest });
});

const refresh = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken, remember, ...rest } = await AuthService.refresh(
    req.cookies?.[REFRESH_COOKIE],
  );
  setRefreshCookie(res, refreshToken, remember);
  sendResponse(res, { message: "Session refreshed", data: rest });
});

const logout = catchAsync(async (_req: Request, res: Response) => {
  clearRefreshCookie(res);
  sendResponse(res, { message: "Signed out", data: { success: true } });
});

const me = catchAsync(async (req: Request, res: Response) => {
  const data = await AuthService.me(req.user!.userId);
  sendResponse(res, { message: "Account loaded", data });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const data = await AuthService.forgotPassword(req.body);
  sendResponse(res, { message: data.message, data });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const data = await AuthService.resetPassword(req.body);
  clearRefreshCookie(res);
  sendResponse(res, { message: data.message, data });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken, remember, ...rest } = await AuthService.changePassword(
    req.user!.userId,
    req.body,
  );
  setRefreshCookie(res, refreshToken, remember);
  sendResponse(res, { message: "Password changed", data: rest });
});

const staff = catchAsync(async (_req: Request, res: Response) => {
  const data = await UserService.getAll();
  sendResponse(res, { message: "Staff loaded", data });
});

const addStaff = catchAsync(async (req: Request, res: Response) => {
  const account = await AuthService.me(req.user!.userId);
  const data = await AuthService.addStaff(account.pharmacy, req.body);
  sendResponse(res, { statusCode: 201, message: "Staff member added", data });
});

export const AuthController = {
  register,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
  staff,
  addStaff,
};
