"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteAsset } from "@/app/admin/actions";
import { adminSrc } from "@/lib/admin/paths";
import { useToast } from "./Toasts";

export type MediaItem = { path: string; usedBy: string[] };

export function MediaGrid({ items }: { items: MediaItem[] }) {
  const [busy, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  if (!items.length) return <p className="empty">No files.</p>;
  return (
    <div className="media-grid">
      {items.map((m) => (
        <div key={m.path} className="media">
          <a className="media__img" href={adminSrc(m.path)} target="_blank" rel="noopener">
            {m.path.endsWith(".pdf") ? <span style={{ fontSize: "1.75rem" }}>PDF</span> : <img src={adminSrc(m.path)} alt="" loading="lazy" />}
          </a>
          <div className="media__meta">
            <span>{m.path.split("/").pop()}</span>
            {m.usedBy.length ? (
              <span className="muted">Used in {m.usedBy.join(", ")}</span>
            ) : (
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <span className="pill pill--warn">Unused</span>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost btn--danger"
                  disabled={busy}
                  onClick={() =>
                    start(async () => {
                      const res = await deleteAsset(m.path);
                      if (!res.ok) return toast(res.error, "error");
                      toast("File removed in the draft");
                      router.refresh();
                    })
                  }
                >
                  Delete
                </button>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
