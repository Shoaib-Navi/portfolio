import type { Metadata } from "next";
import { PhotoCard } from "@/components/admin/PhotoCard";
import { ProfileEditor, StatsEditor } from "@/components/admin/ProfileEditor";
import { LoadError, PageHead } from "@/components/admin/ui";
import { errorText, load } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Profile & hero" };

export default async function ProfilePage() {
  try {
    const { profile, stats } = await load(["profile", "stats"]);
    return (
      <>
        <PageHead crumb={[{ label: "Content" }]} title="Profile & hero">
          Name, headline, about text, links, stats and your photo.
        </PageHead>
        <div className="grid grid--main">
          <div className="stack">
            <ProfileEditor initial={profile} />
          </div>
          <div className="stack">
            <PhotoCard photo={profile.photo} />
            <StatsEditor initial={stats} />
          </div>
        </div>
      </>
    );
  } catch (e) {
    return (
      <>
        <PageHead title="Profile & hero" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
}
