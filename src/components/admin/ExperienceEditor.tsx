"use client";

import type { Job, Tool } from "@/lib/content/schema";
import { ChipInput } from "./ChipInput";
import { Checkbox, IssueList, RestoreBanner, RichField, SaveBar, TextField } from "./fields";
import { ListField } from "./ListField";
import { useCollection } from "./useCollection";

const blankJob = (): Job => ({
  slug: "",
  company: "",
  role: "",
  period: "",
  year: String(new Date().getFullYear()),
  highlights: [""],
  stack: [],
  verified: false,
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function ExperienceEditor({ initial, tools }: { initial: Job[]; tools: Tool[] }) {
  const f = useCollection("experience", initial);
  const known = f.value.flatMap((_, i) => ["slug", "company", "role", "period", "year", "highlights", "stack"].map((k) => `[${i}].${k}`));

  return (
    <>
      {f.restorable ? <RestoreBanner at={f.restorable.at} onRestore={f.restore} onDrop={f.dropRestorable} /> : null}
      <IssueList issues={f.issues.filter((i) => !/\.highlights\[\d+\]$/.test(i.path))} shown={known} />
      <ListField
        label="Roles · newest first"
        items={f.value}
        onChange={f.setValue}
        blank={blankJob}
        addLabel="+ Add role"
        max={20}
        render={(job, update, i) => {
          const err = (k: string) => f.issueAt(`[${i}].${k}`);
          return (
            <div>
              <div className="grid grid--2" style={{ gap: "0 14px" }}>
                <TextField
                  label="Company"
                  value={job.company}
                  error={err("company")}
                  max={80}
                  onChange={(company) => update({ ...job, company, slug: job.slug && job.slug !== slugify(job.company) ? job.slug : slugify(company) })}
                />
                <TextField label="Role" value={job.role} onChange={(role) => update({ ...job, role })} error={err("role")} max={80} />
                <TextField
                  label="Period"
                  value={job.period}
                  onChange={(period) => update({ ...job, period })}
                  error={err("period")}
                  placeholder="Apr 2026 – May 2026"
                />
                <TextField label="Year" value={job.year} onChange={(year) => update({ ...job, year })} error={err("year")} hint="Shown in the role index" />
              </div>
              <TextField label="Slug" value={job.slug} mono onChange={(v) => update({ ...job, slug: slugify(v) })} error={err("slug")} hint="Used for the anchor link" />
              <ListField
                label="Highlights"
                items={job.highlights}
                onChange={(highlights) => update({ ...job, highlights })}
                blank={() => ""}
                addLabel="+ Add highlight"
                max={8}
                error={err("highlights")}
                render={(h, set, j) => (
                  <RichField label={`Highlight ${j + 1}`} value={h} onChange={set} error={err(`highlights[${j}]`)} rows={2} max={400} />
                )}
              />
              <ChipInput label="Stack" value={job.stack} onChange={(stack) => update({ ...job, stack })} suggestions={tools} error={err("stack")} />
              <Checkbox
                label="Verified"
                hint="Unverified roles stay in the draft and never appear on the site."
                checked={job.verified}
                onChange={(verified) => update({ ...job, verified })}
              />
            </div>
          );
        }}
      />
      <SaveBar dirty={f.dirty} saving={f.saving} onSave={() => f.save()} onReset={f.reset} />
    </>
  );
}
