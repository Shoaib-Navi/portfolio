import type { Metadata } from "next";
import { AwardsEditor, EducationEditor } from "@/components/admin/EducationEditor";
import { LoadError, PageHead } from "@/components/admin/ui";
import { errorText, load } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Education & awards" };

export default async function EducationPage() {
  try {
    const { education, awards } = await load(["education", "awards"]);
    return (
      <>
        <PageHead crumb={[{ label: "Content" }]} title="Education & awards">
          The “The rest of it” section of the home page.
        </PageHead>
        <div className="grid grid--2" style={{ alignItems: "start" }}>
          <EducationEditor initial={education} />
          <AwardsEditor initial={awards} />
        </div>
      </>
    );
  } catch (e) {
    return (
      <>
        <PageHead title="Education & awards" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
}
