import type { Metadata } from "next";
import { ExperienceEditor } from "@/components/admin/ExperienceEditor";
import { LoadError, PageHead } from "@/components/admin/ui";
import { errorText, load } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Experience" };

export default async function ExperiencePage() {
  try {
    const { experience, skills } = await load(["experience", "skills"]);
    return (
      <>
        <PageHead crumb={[{ label: "Content" }]} title="Experience">
          Roles in the order they appear. Wrap a phrase in **double asterisks** to bold it.
        </PageHead>
        <section className="card">
          <ExperienceEditor initial={experience} tools={skills.flatMap((g) => g.tools)} />
        </section>
      </>
    );
  } catch (e) {
    return (
      <>
        <PageHead title="Experience" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
}
