import { Request, Response, NextFunction } from "express";
import { createHmac } from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const TA_PASSWORD = process.env.TA_PASSWORD || "cohort2024";
const COOKIE_NAME = "ta_session";
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 8; // 8 hours

export function verifyTaPassword(password: string): boolean {
  return password === TA_PASSWORD;
}

function sign(value: string): string {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

export function createSessionCookie(res: Response, taName: string): void {
  const payload = JSON.stringify({ taName, iat: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = sign(encoded);
  const cookie = `${encoded}.${sig}`;

  res.cookie(COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME);
}

export function parseTaSession(req: Request): { taName: string } | null {
  const cookie = req.cookies?.[COOKIE_NAME];
  if (!cookie || typeof cookie !== "string") return null;

  const lastDot = cookie.lastIndexOf(".");
  if (lastDot === -1) return null;

  const encoded = cookie.slice(0, lastDot);
  const sig = cookie.slice(lastDot + 1);
  const expectedSig = sign(encoded);

  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (!payload.taName || typeof payload.taName !== "string") return null;
    return { taName: payload.taName };
  } catch {
    return null;
  }
}

export function requireTa(req: Request, res: Response, next: NextFunction): void {
  const session = parseTaSession(req);
  if (!session) {
    res.status(401).json({ error: "TA authentication required" });
    return;
  }
  (req as Request & { taName: string }).taName = session.taName;
  next();
}

// Extend express Request type
declare global {
  namespace Express {
    interface Request {
      taName?: string;
    }
  }
}
