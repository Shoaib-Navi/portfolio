import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured } from "./env";
import { readSessionToken, SESSION_COOKIE } from "./session";

export class Unauthorized extends Error {}

export async function sessionUser(): Promise<string | null> {
  if (!authConfigured()) return null;
  return readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** For pages: sends signed-out visitors to the login screen. */
export async function requireAdminPage(): Promise<string> {
  const user = await sessionUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** For server actions: proxy.ts is only an optimistic check, so every action re-verifies. */
export async function requireAdmin(): Promise<string> {
  const user = await sessionUser();
  if (!user) throw new Unauthorized("Your session has expired. Sign in again.");
  return user;
}
