export type TRole = "owner" | "pharmacist";

export type TokenPayload = {
  userId: string;
  role: TRole;
  email: string;
  name: string;
  tokenVersion: number;
  remember?: boolean;
};

export type Account = {
  id: string;
  name: string;
  email: string;
  role: TRole;
  pharmacy: string;
  isActive: boolean;
  lastLoginAt: Date | null;
};

export type Session = {
  account: Account;
  accessToken: string;
  refreshToken: string;
  remember: boolean;
};
