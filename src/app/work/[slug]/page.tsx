import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Bar from "@/components/Bar";
import DocFoot from "@/components/DocFoot";
import ProjectArticle from "@/components/ProjectArticle";
import ProjectHealth from "@/components/ProjectHealth";
import { profile, projects } from "@/data/profile";
import { statusTargets } from "@/lib/status";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) return {};
  const title = `${project.name} — ${project.tagline}`;
  return {
    title,
    description: project.lede,
    alternates: { canonical: `/work/${slug}` },
    openGraph: { title, description: project.lede },
  };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.name,
    headline: project.tagline,
    description: project.lede,
    author: { "@type": "Person", name: profile.name },
    keywords: project.stack.join(", "),
  };

  return (
    <div className="site">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Bar back={{ href: "/work", label: "All work" }} />

      <div className="doc">
        <main>
          <ProjectArticle
            project={project}
            side={statusTargets().some((t) => t.slug === project.slug) ? <ProjectHealth slug={project.slug} /> : undefined}
          />
        </main>
        <DocFoot back={{ href: "/work", label: "Back to all work" }} />
      </div>
    </div>
  );
}
