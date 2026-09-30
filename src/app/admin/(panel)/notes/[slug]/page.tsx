import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NoteEditor } from "@/components/admin/NoteEditor";
import { LoadError, PageHead } from "@/components/admin/ui";
import { errorText, load } from "@/lib/admin/data";
import { dayOf } from "@/lib/analytics";
import { notes as liveNotes } from "@/data/profile";
import type { Note } from "@/lib/content/schema";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug === "new" ? "New note" : `Edit ${slug}` };
}

export default async function NotePage({ params }: Params) {
  const { slug } = await params;
  let data;
  try {
    data = await load(["notes", "projects"]);
  } catch (e) {
    return (
      <>
        <PageHead title="Note" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
  const isNew = slug === "new";
  if (!isNew && !data.notes.some((n) => n.slug === slug)) notFound();
  const blank: Note = { slug: "", title: "", summary: "", date: dayOf(), tags: [], body: "", verified: false };
  return (
    <NoteEditor
      key={slug}
      notes={isNew ? [...data.notes, blank] : data.notes}
      slug={isNew ? null : slug}
      projects={data.projects.filter((p) => p.verified).map(({ slug, name }) => ({ slug, name }))}
      liveSlugs={liveNotes.filter((n) => n.verified).map((n) => n.slug)}
    />
  );
}
