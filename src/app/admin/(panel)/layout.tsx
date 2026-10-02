import AdminNav from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/admin/Toasts";
import { requireAdminPage } from "@/lib/admin/auth";
import { errorText, load } from "@/lib/admin/data";
import { getStore } from "@/lib/admin/store";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  const store = getStore();

  let pending = 0;
  let counts = { projects: 0, experience: 0, skills: 0 };
  let initials = "A";
  let failure: string | null = null;
  try {
    const [changes, data] = await Promise.all([store.pending(), load(["profile", "projects", "experience", "skills"], store)]);
    pending = changes.length;
    initials = data.profile.initials;
    counts = {
      projects: data.projects.length,
      experience: data.experience.length,
      skills: data.skills.reduce((n, g) => n + g.tools.length, 0),
    };
  } catch (e) {
    failure = errorText(e);
  }

  return (
    <ToastProvider>
      <div className="adm-shell">
        <AdminNav initials={initials} user={user} mode={store.mode} pending={pending} counts={counts} />
        <main className="adm-main" id="main">
          {failure ? (
            <div className="banner banner--bad" role="alert">
              <span>
                <b>Couldn’t load content:</b> {failure}
              </span>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
