import type { Metadata } from "next";
import Link from "next/link";
import { ProjectList } from "@/components/admin/ProjectList";
import { LoadError, PageHead } from "@/components/admin/ui";
import { errorText, load } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  try {
    const { projects } = await load(["projects"]);
    return (
      <>
        <PageHead
          crumb={[{ label: "Content" }]}
          title="Projects"
          actions={
            <Link href="/admin/projects/new" className="btn btn--pri">
              + New project
            </Link>
          }
        >
          Drag to reorder. The order here is the order on the site.
        </PageHead>
        <ProjectList initial={projects} />
      </>
    );
  } catch (e) {
    return (
      <>
        <PageHead title="Projects" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
}
