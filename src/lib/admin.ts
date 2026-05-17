import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";

/**
 * Shared-password admin gate.
 *
 * `ADMIN_PASSWORD` is set in env. On /admin/login submission we set a httpOnly
 * cookie containing the password (this is fine for low-stakes admin; rotate
 * by changing the env var). Every admin route calls requireAdmin().
 */

const COOKIE = "m0_admin";

function getPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

export async function isAdmin(): Promise<boolean> {
  const password = getPassword();
  if (!password) return false;
  const jar = await cookies();
  const v = jar.get(COOKIE)?.value;
  if (!v) return false;
  // Constant-time compare on equal-length buffers to keep things tidy.
  try {
    const a = Buffer.from(v);
    const b = Buffer.from(password);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function setAdminCookie(password: string) {
  const jar = await cookies();
  jar.set(COOKIE, password, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 days
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function checkPassword(input: string): boolean {
  const password = getPassword();
  if (!password) return false;
  try {
    const a = Buffer.from(input);
    const b = Buffer.from(password);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
