import type { Metadata } from "next";
import { EngineeringEditor } from "@/components/admin/EngineeringEditor";
import { LoadError, PageHead } from "@/components/admin/ui";
import { errorText, load } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Engineering" };

export default async function EngineeringPage() {
  try {
    const { practices, projects } = await load(["practices", "projects"]);
    return (
      <>
        <PageHead crumb={[{ label: "Content" }]} title="Engineering">
          The “Engineering, with evidence” section on the home page. Evidence should be specific enough to check.
        </PageHead>
        <EngineeringEditor initial={practices} projects={projects.filter((p) => p.verified).map(({ slug, name }) => ({ slug, name }))} />
      </>
    );
  } catch (e) {
    return (
      <>
        <PageHead title="Engineering" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
}
