"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin, sessionUser, Unauthorized } from "@/lib/admin/auth";
import { fetchDevicon, searchDevicon, type DeviconHit } from "@/lib/admin/devicon";
import { adminEnv, authConfigured } from "@/lib/admin/env";
import { checkSvg, expectKind, LIMITS, safeName, stamp, webpSize } from "@/lib/admin/files";
import { verifyPassword } from "@/lib/admin/password";
import { assetUsage } from "@/lib/admin/usage";
import { clearFailures, recordFailure, retryAfter } from "@/lib/admin/rate-limit";
import { extractPdfText, resumeChecks } from "@/lib/admin/resume";
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_S } from "@/lib/admin/session";
import { encodeCollection, getStore, readCollection, StoreError, type Change, type DeployState } from "@/lib/admin/store";
import { COLLECTIONS, collectionPath, isCollection, validate, type Issue, type ResumeVersion } from "@/lib/content/schema";

export type Result<T = null> = { ok: true; data: T } | { ok: false; error: string; issues?: Issue[] };

async function act<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    await requireAdmin();
    const data = await fn();
    revalidatePath("/admin", "layout");
    return { ok: true, data };
  } catch (e) {
    if (e instanceof StoreError || e instanceof Unauthorized) return { ok: false, error: e.message };
    console.error("[admin]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

const bytesOf = async (file: FormDataEntryValue | null) => {
  if (!(file instanceof File)) throw new StoreError("No file received");
  return new Uint8Array(await file.arrayBuffer());
};

/* -------------------------------- auth -------------------------------- */

export type LoginState = { error?: string; user?: string };

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!authConfigured()) return { error: "Admin sign-in is not configured on this deployment." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const user = String(form.get("user") ?? "").slice(0, 100);
  const wait = retryAfter(ip);
  if (wait) return { error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} min.`, user };

  const password = String(form.get("password") ?? "");
  // Always run the hash, even for a wrong user name, so timing reveals nothing.
  const passwordOk = await verifyPassword(password, adminEnv.passwordHash());
  if (!passwordOk || user !== adminEnv.user()) {
    recordFailure(ip);
    return { error: "Invalid user name or password.", user };
  }
  clearFailures(ip);
  (await cookies()).set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_S,
  });
  redirect("/admin");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/* ----------------------------- collections ----------------------------- */

export async function saveCollection(name: string, data: unknown): Promise<Result> {
  if (!(await sessionUser())) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!isCollection(name)) return { ok: false, error: `Unknown collection ${name}` };
  const parsed = validate(name, data);
  if (!parsed.ok) return { ok: false, error: "Some fields need attention", issues: parsed.issues };
  return act(async () => {
    await getStore().stage([{ path: collectionPath(name), content: encodeCollection(parsed.value) }], `update ${name}`);
    return null;
  });
}

/* -------------------------------- media -------------------------------- */

/** Project screenshot (already WebP from the browser). Returns its public path. */
export async function uploadShot(slug: string, form: FormData): Promise<Result<string>> {
  return act(async () => {
    const bytes = await bytesOf(form.get("file"));
    expectKind(bytes, ["webp"], LIMITS.image);
    const name = `${safeName(slug, "shot")}-${Date.now().toString(36)}.webp`;
    await getStore().stage([{ path: `public/shots/${name}`, content: bytes }], `add screenshot ${name}`);
    return `/shots/${name}`;
  });
}

/** Portrait: stages the image and points profile.photo at it in the same draft commit. */
export async function uploadPhoto(form: FormData): Promise<Result<string>> {
  return act(async () => {
    const bytes = await bytesOf(form.get("file"));
    expectKind(bytes, ["webp"], LIMITS.image);
    const size = webpSize(bytes);
    if (!size) throw new StoreError("Could not read the image size");
    const store = getStore();
    const profile = await readCollection(store, "profile");
    const name = `${safeName(profile.name, "portrait")}-${Date.now().toString(36)}.webp`;
    const next = { ...profile, photo: { src: `/pfp/${name}`, ...size } };
    const parsed = validate("profile", next);
    if (!parsed.ok) throw new StoreError(parsed.issues[0].message);
    await store.stage(
      [
        { path: `public/pfp/${name}`, content: bytes },
        { path: collectionPath("profile"), content: encodeCollection(parsed.value) },
      ],
      "replace portrait",
    );
    return next.photo.src;
  });
}

export async function searchLogos(query: string): Promise<Result<DeviconHit[]>> {
  return act(() => searchDevicon(query.slice(0, 40)));
}

async function stageLogo(bytes: Uint8Array, base: string) {
  const kind = expectKind(bytes, ["svg", "webp", "png"], LIMITS.logo);
  const content = kind === "svg" ? new TextEncoder().encode(checkSvg(bytes)) : bytes;
  const name = `${safeName(base, "logo")}.${kind}`;
  await getStore().stage([{ path: `public/logos/${name}`, content }], `add logo ${name}`);
  return `/logos/${name}`;
}

export async function addDeviconLogo(name: string, variant: string): Promise<Result<string>> {
  return act(async () => stageLogo(await fetchDevicon(name, variant), `${name}-${variant}`));
}

export async function uploadLogo(form: FormData): Promise<Result<string>> {
  return act(async () => {
    const file = form.get("file");
    return stageLogo(await bytesOf(file), file instanceof File ? file.name : "logo");
  });
}

export async function deleteAsset(publicPath: string): Promise<Result> {
  return act(async () => {
    if ((await assetUsage(getStore())).has(publicPath)) throw new StoreError(`${publicPath} is still in use`);
    await getStore().stage([{ path: `public${publicPath}`, content: null }], `delete ${publicPath}`);
    return null;
  });
}

/* ------------------------------- résumé ------------------------------- */

export async function uploadResume(form: FormData): Promise<Result<ResumeVersion>> {
  return act(async () => {
    const bytes = await bytesOf(form.get("file"));
    expectKind(bytes, ["pdf"], LIMITS.pdf);
    const label = String(form.get("label") ?? "").trim().slice(0, 60) || "Résumé";
    let checks;
    try {
      const { pages, text } = await extractPdfText(bytes);
      checks = resumeChecks(pages, text, bytes.byteLength);
    } catch {
      throw new StoreError("That PDF could not be read. Export it again and retry.");
    }
    const store = getStore();
    const resumes = await readCollection(store, "resumes");
    let id = `${stamp()}-${safeName(label, "resume")}`;
    for (let n = 2; resumes.versions.some((v) => v.id === id); n++) id = `${stamp()}-${safeName(label, "resume")}-${n}`;
    const version: ResumeVersion = { id, label, file: `/resumes/${id}.pdf`, uploadedAt: new Date().toISOString(), checks };
    const next = { ...resumes, versions: [version, ...resumes.versions] };
    await store.stage(
      [
        { path: `public${version.file}`, content: bytes },
        { path: collectionPath("resumes"), content: encodeCollection(next) },
      ],
      `add résumé ${label}`,
    );
    return version;
  });
}

/** Copies a version to /resume.pdf, the file the site's download button serves. */
export async function setLiveResume(id: string): Promise<Result> {
  return act(async () => {
    const store = getStore();
    const resumes = await readCollection(store, "resumes");
    const version = resumes.versions.find((v) => v.id === id);
    if (!version) throw new StoreError("That version no longer exists");
    const bytes = await store.read(`public${version.file}`);
    if (!bytes) throw new StoreError(`${version.file} is missing`);
    const changes: Change[] = [
      { path: "public/resume.pdf", content: bytes },
      { path: collectionPath("resumes"), content: encodeCollection({ ...resumes, live: id }) },
    ];
    await store.stage(changes, `make résumé ${version.label} live`);
    return null;
  });
}

export async function deleteResumeVersion(id: string): Promise<Result> {
  return act(async () => {
    const store = getStore();
    const resumes = await readCollection(store, "resumes");
    const version = resumes.versions.find((v) => v.id === id);
    if (!version) throw new StoreError("That version no longer exists");
    if (resumes.live === id) throw new StoreError("The live version can't be deleted. Make another one live first.");
    const next = { ...resumes, versions: resumes.versions.filter((v) => v.id !== id) };
    await store.stage(
      [
        { path: `public${version.file}`, content: null },
        { path: collectionPath("resumes"), content: encodeCollection(next) },
      ],
      `delete résumé ${version.label}`,
    );
    return null;
  });
}

/* ------------------------------- publish ------------------------------- */

export async function publishAction(message: string): Promise<Result<{ sha: string | null }>> {
  return act(async () => {
    const store = getStore();
    // Re-validate every collection in the draft; the build would fail on bad JSON anyway,
    // but refusing here keeps a broken commit off main.
    for (const name of COLLECTIONS) await readCollection(store, name);
    const text = message.trim().slice(0, 200) || "content: update via admin";
    return store.publish(text);
  });
}

export async function discardAction(): Promise<Result> {
  return act(async () => {
    await getStore().discard();
    return null;
  });
}

export async function rollbackAction(sha: string): Promise<Result<{ sha: string | null; skipped: string[] }>> {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) return { ok: false, error: "Invalid commit" };
  return act(() => getStore().rollback(sha));
}

export async function deployStatusAction(sha: string): Promise<Result<DeployState>> {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) return { ok: false, error: "Invalid commit" };
  try {
    await requireAdmin();
    return { ok: true, data: await getStore().deployState(sha) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Status unavailable" };
  }
}
