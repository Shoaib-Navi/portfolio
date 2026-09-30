import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectEditor } from "@/components/admin/ProjectEditor";
import { blankProject } from "@/lib/admin/blank";
import { LoadError, PageHead } from "@/components/admin/ui";
import { errorText, load } from "@/lib/admin/data";
import { projects as liveProjects } from "@/data/profile";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug === "new" ? "New project" : `Edit ${slug}` };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  let data;
  try {
    data = await load(["projects", "skills"]);
  } catch (e) {
    return (
      <>
        <PageHead title="Project" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
  const isNew = slug === "new";
  if (!isNew && !data.projects.some((p) => p.slug === slug)) notFound();
  return (
    <ProjectEditor
      key={slug}
      projects={isNew ? [...data.projects, blankProject()] : data.projects}
      slug={isNew ? null : slug}
      liveSlugs={liveProjects.map((p) => p.slug)}
      tools={data.skills.flatMap((g) => g.tools)}
    />
  );
}
