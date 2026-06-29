import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_token";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

function secret() {
  return process.env.SESSION_SECRET || "troque-este-texto-secreto-tambem";
}

function makeToken() {
  return crypto.createHash("sha256").update(`${secret()}:admin`).digest("hex");
}

export function setAdminCookie() {
  cookies().set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearAdminCookie() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export function isAdminRequest() {
  const token = cookies().get(COOKIE_NAME)?.value;
  return Boolean(token) && token === makeToken();
}
