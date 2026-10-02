import type { Metadata } from "next";
import { ResumeManager } from "@/components/admin/ResumeManager";
import { Findings, LoadError, PageHead } from "@/components/admin/ui";
import { errorText, load } from "@/lib/admin/data";
import { adminSrc } from "@/lib/admin/paths";
import { consistency, extractPdfText, type Finding } from "@/lib/admin/resume";
import { getStore } from "@/lib/admin/store";

export const metadata: Metadata = { title: "Résumé" };

export default async function ResumePage() {
  const store = getStore();
  try {
    const data = await load(["resumes", "profile", "projects", "stats", "awards"], store);
    const pdf = await store.read("public/resume.pdf");
    let text = "";
    let findings: Finding[];
    if (!pdf) findings = [{ level: "error", text: "There is no /resume.pdf. Make a version live." }];
    else {
      try {
        text = (await extractPdfText(pdf)).text;
        findings = consistency(text, data);
      } catch {
        findings = [{ level: "error", text: "The live PDF could not be read" }];
      }
    }
    return (
      <>
        <PageHead
          crumb={[{ label: "Files" }]}
          title="Résumé"
          actions={
            <a className="btn" href={adminSrc("/resume.pdf")} target="_blank" rel="noopener">
              Open live PDF
            </a>
          }
        >
          Versions of your résumé, and checks on the one the site serves.
        </PageHead>
        <div className="grid grid--main">
          <ResumeManager resumes={data.resumes} />
          <div className="stack">
            <section className="card">
              <div className="card__head">
                <h2>Checks on the live résumé</h2>
                <p>Compared with the content on this site.</p>
              </div>
              <Findings items={findings.map(({ href: _href, ...f }) => f)} />
            </section>
            {text ? (
              <section className="card">
                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>What an ATS reads (extracted text)</summary>
                  <pre className="diff" style={{ marginTop: 12, maxHeight: 420, overflow: "auto" }}>
                    {text}
                  </pre>
                </details>
              </section>
            ) : null}
          </div>
        </div>
      </>
    );
  } catch (e) {
    return (
      <>
        <PageHead title="Résumé" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
}
