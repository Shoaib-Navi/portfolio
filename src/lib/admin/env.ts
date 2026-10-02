/** Admin configuration, read from the environment on every call so tests can override it. */
export const adminEnv = {
  user: () => process.env.ADMIN_USER ?? "",
  passwordHash: () => process.env.ADMIN_PASSWORD_HASH ?? "",
  sessionSecret: () => process.env.SESSION_SECRET ?? "",
  githubToken: () => process.env.GITHUB_TOKEN ?? "",
  /** "owner/name" */
  githubRepo: () => process.env.GITHUB_REPO ?? "",
  githubBranch: () => process.env.GITHUB_BRANCH || "main",
};

/** Sign-in needs all three; without them /admin shows setup instructions instead of a form. */
export function authConfigured() {
  return Boolean(adminEnv.user() && adminEnv.passwordHash() && adminEnv.sessionSecret().length >= 32);
}

/** With a GitHub token edits become commits; without one (local dev) they are written to disk. */
export function storeMode(): "github" | "local" {
  return adminEnv.githubToken() && adminEnv.githubRepo() ? "github" : "local";
}
