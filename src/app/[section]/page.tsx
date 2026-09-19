import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomeView from "@/components/HomeView";
import { SECTIONS, type SectionId } from "@/lib/sections";

type Params = { params: Promise<{ section: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section }));
}

const TITLES: Record<SectionId, string> = {
  about: "About",
  skills: "Toolbox",
  experience: "Experience",
  contact: "Contact",
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { section } = await params;
  if (!SECTIONS.includes(section as SectionId)) return {};
  // One page, several entry points: the home page stays the canonical URL.
  return { title: TITLES[section as SectionId], alternates: { canonical: "/" } };
}

export default async function SectionPage({ params }: Params) {
  const { section } = await params;
  if (!SECTIONS.includes(section as SectionId)) notFound();
  return <HomeView section={section as SectionId} />;
}
