import jwt, { SignOptions } from "jsonwebtoken";
import { Response } from "express";
import config from "../config";
import { TokenPayload } from "../modules/auth/auth.interface";

export const REFRESH_COOKIE = "pw_refresh";

const sign = (payload: TokenPayload, secret: string, expiresIn: string) =>
  jwt.sign(payload, secret, { expiresIn } as SignOptions);

export const signAccessToken = (payload: TokenPayload) =>
  sign(payload, config.jwt.access_secret, config.jwt.access_expires_in);

export const signRefreshToken = (payload: TokenPayload) =>
  sign(payload, config.jwt.refresh_secret, config.jwt.refresh_expires_in);

export const verifyAccessToken = (token: string): TokenPayload =>
  jwt.verify(token, config.jwt.access_secret) as TokenPayload;

export const verifyRefreshToken = (token: string): TokenPayload =>
  jwt.verify(token, config.jwt.refresh_secret) as TokenPayload;

export const setRefreshCookie = (res: Response, token: string, remember = false) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.is_production,
    sameSite: config.is_production ? "none" : "lax",
    path: "/api/v1/auth",
    ...(remember ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {}),
    ...(config.cookie_domain ? { domain: config.cookie_domain } : {}),
  });
};

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: config.is_production,
    sameSite: config.is_production ? "none" : "lax",
    path: "/api/v1/auth",
    ...(config.cookie_domain ? { domain: config.cookie_domain } : {}),
  });
};
