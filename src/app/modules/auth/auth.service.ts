import config from "../../config";
import AppError from "../../error/appError";
import { RESET_TTL_MS, hashToken, randomToken } from "../../utilities/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utilities/token";
import { IUser } from "../user/user.interface";
import { User } from "../user/user.model";
import { UserService } from "../user/user.service";
import { Account, Session, TokenPayload } from "./auth.interface";
import {
  AddStaffInput,
  ChangePasswordInput,
  ForgotInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.validation";

const payloadOf = (doc: IUser): TokenPayload => ({
  userId: String(doc._id),
  role: doc.role,
  email: doc.email,
  name: doc.name,
  tokenVersion: doc.tokenVersion,
});

const sessionOf = (doc: IUser, remember = false): Session => {
  const payload = payloadOf(doc);
  return {
    account: UserService.format(doc),
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ ...payload, remember }),
    remember,
  };
};

const register = async (payload: RegisterInput): Promise<Session> => {
  const taken = await User.findOne({ email: payload.email }).lean();
  if (taken) throw new AppError(409, "An account already uses this email");

  const first = (await User.estimatedDocumentCount()) === 0;

  const doc = await User.create({
    name: payload.name,
    email: payload.email,
    password: payload.password,
    pharmacy: payload.pharmacy,
    role: first ? "owner" : "pharmacist",
    lastLoginAt: new Date(),
  });

  return sessionOf(doc);
};

const login = async (payload: LoginInput): Promise<Session> => {
  const doc = await User.findOne({ email: payload.email }).select("+password");

  if (!doc || !doc.isActive || !(await doc.matchPassword(payload.password))) {
    throw new AppError(401, "That email and password do not match");
  }

  doc.lastLoginAt = new Date();
  await doc.save();

  return sessionOf(doc, payload.remember === true);
};

const refresh = async (token?: string): Promise<Session> => {
  if (!token) throw new AppError(401, "Please sign in to continue");

  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, "Your session has expired. Please sign in again.");
  }

  const doc = await User.findById(payload.userId);
  if (!doc || !doc.isActive || doc.tokenVersion !== payload.tokenVersion) {
    throw new AppError(401, "Your session has expired. Please sign in again.");
  }

  return sessionOf(doc, payload.remember === true);
};

const me = async (userId: string): Promise<Account> =>
  UserService.format(await UserService.findById(userId));

const forgotPassword = async (payload: ForgotInput) => {
  const doc = await User.findOne({ email: payload.email }).select(
    "+resetTokenHash +resetExpiresAt",
  );

  let devToken: string | undefined;

  if (doc && doc.isActive) {
    const token = randomToken();
    doc.resetTokenHash = hashToken(token);
    doc.resetExpiresAt = new Date(Date.now() + RESET_TTL_MS);
    await doc.save();
    if (!config.is_production) devToken = token;
  }

  return {
    sent: true as const,
    message: "If that address has an account, a reset link is on its way.",
    ...(devToken ? { devToken } : {}),
  };
};

const resetPassword = async (payload: ResetPasswordInput) => {
  const doc = await User.findOne({
    resetTokenHash: hashToken(payload.token),
    resetExpiresAt: { $gt: new Date() },
  }).select("+password +resetTokenHash +resetExpiresAt");

  if (!doc) {
    throw new AppError(400, "That reset link has expired. Please ask for a new one.");
  }

  doc.password = payload.password;
  doc.resetTokenHash = null;
  doc.resetExpiresAt = null;
  doc.tokenVersion += 1;
  await doc.save();

  return { ok: true as const, message: "Your password has been changed" };
};

const changePassword = async (userId: string, payload: ChangePasswordInput) => {
  const doc = await User.findById(userId).select("+password");
  if (!doc) throw new AppError(404, "That account was not found");

  if (!(await doc.matchPassword(payload.currentPassword))) {
    throw new AppError(401, "Your current password is not right");
  }

  doc.password = payload.password;
  doc.tokenVersion += 1;
  await doc.save();

  return sessionOf(doc);
};

const addStaff = async (pharmacy: string, payload: AddStaffInput): Promise<Account> => {
  const taken = await User.findOne({ email: payload.email }).lean();
  if (taken) throw new AppError(409, "An account already uses this email");
  return UserService.addStaff(pharmacy, payload);
};

export const AuthService = {
  register,
  login,
  refresh,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
  addStaff,
};
