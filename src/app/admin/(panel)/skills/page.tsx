import type { Metadata } from "next";
import { SkillsEditor } from "@/components/admin/SkillsEditor";
import { LoadError, PageHead } from "@/components/admin/ui";
import { errorText, load } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Skills" };

export default async function SkillsPage() {
  try {
    const { skills } = await load(["skills"]);
    return (
      <>
        <PageHead crumb={[{ label: "Content" }]} title="Skills">
          The Toolbox section. Click a skill to edit it; skills without a logo show as plain chips.
        </PageHead>
        <SkillsEditor initial={skills} />
      </>
    );
  } catch (e) {
    return (
      <>
        <PageHead title="Skills" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
}
