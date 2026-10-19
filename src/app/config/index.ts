import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

const optional = (key: string, fallback = ""): string => process.env[key] ?? fallback;

const list = (key: string): string[] =>
  optional(key)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const node_env = optional("NODE_ENV", "development");

export default {
  node_env,
  is_production: node_env === "production",
  is_test: node_env === "test",
  port: Number(optional("PORT", "5000")),

  database_url: optional("DATABASE_URL", "mongodb://127.0.0.1:27017/pharmawatch"),

  cors_origins: list("CORS_ORIGINS"),
  cookie_domain: optional("COOKIE_DOMAIN"),

  jwt: {
    access_secret: optional("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
    access_expires_in: optional("JWT_ACCESS_EXPIRES_IN", "15m"),
    refresh_secret: optional("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
    refresh_expires_in: optional("JWT_REFRESH_EXPIRES_IN", "7d"),
  },

  pharmacy: optional("PHARMACY_NAME", "Shahjalal Pharmacy"),

  owner: {
    name: optional("OWNER_NAME", "Mahmuda Khatun"),
    email: optional("OWNER_EMAIL", "owner@pharmawatch.test").toLowerCase(),
    password: optional("OWNER_PASSWORD", "Pharma@2026"),
  },

  limits: {
    login: Number(optional("RATE_LIMIT_LOGIN", "5")),
    forgot: Number(optional("RATE_LIMIT_FORGOT", "3")),
    register: Number(optional("RATE_LIMIT_REGISTER", "3")),
    reset: Number(optional("RATE_LIMIT_RESET", "5")),
    write: Number(optional("RATE_LIMIT_WRITE", "120")),
  },

  thresholds: {
    near: Number(optional("NEAR_EXPIRY_DAYS", "90")),
    critical: Number(optional("CRITICAL_DAYS", "30")),
  },
};
