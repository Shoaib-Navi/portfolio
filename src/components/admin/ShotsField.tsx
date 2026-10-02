"use client";

import { useRef, useState, useTransition } from "react";
import { uploadShot } from "@/app/admin/actions";
import { adminSrc } from "@/lib/admin/paths";
import { formWith, kb, loadImage, toWebp } from "./image";
import { useToast } from "./Toasts";
import { move, removeAt } from "./useCollection";

const MAX_WIDTH = 1600;

/** Screenshot list: upload (converted to WebP in the browser), reorder, remove. */
export function ShotsField({ slug, shots, onChange }: { slug: string; shots: string[]; onChange: (s: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, start] = useTransition();
  const toast = useToast();

  const upload = (files: FileList | File[] | null) =>
    start(async () => {
      const list = Array.from(files ?? []);
      let next = shots;
      for (const file of list) {
        try {
          const img = await loadImage(file);
          const { blob, width, height } = await toWebp(img, { maxWidth: MAX_WIDTH });
          const res = await uploadShot(slug || "project", formWith(blob, "shot.webp"));
          if (!res.ok) {
            toast(res.error, "error");
            continue;
          }
          next = [...next, res.data];
          onChange(next);
          toast(`Screenshot added (${width}×${height}, ${kb(blob.size)}). Save the project to keep it.`);
        } catch (e) {
          toast((e as Error).message, "error");
        }
      }
      if (input.current) input.current.value = "";
    });

  return (
    <div className="field">
      <span className="field__label">Screenshots · carousel order</span>
      {shots.length ? (
        <div className="shots">
          {shots.map((s, i) => (
            <figure key={s} className="shot" style={{ margin: 0 }}>
              <img src={adminSrc(s)} alt={`Screenshot ${i + 1}`} />
              <figcaption className="shot__bar">
                <span className="muted">{i === 0 ? "Cover" : `#${i + 1}`}</span>
                <span className="order">
                  <button type="button" className="btn btn--icon btn--ghost" aria-label="Move left" disabled={i === 0} onClick={() => onChange(move(shots, i, i - 1))}>
                    ←
                  </button>
                  <button
                    type="button"
                    className="btn btn--icon btn--ghost"
                    aria-label="Move right"
                    disabled={i === shots.length - 1}
                    onClick={() => onChange(move(shots, i, i + 1))}
                  >
                    →
                  </button>
                  <button type="button" className="btn btn--icon btn--ghost btn--danger" aria-label="Remove screenshot" onClick={() => onChange(removeAt(shots, i))}>
                    ✕
                  </button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
      <button
        type="button"
        className="drop"
        data-over={over ? "1" : undefined}
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files);
        }}
      >
        {busy ? (
          <b>Uploading…</b>
        ) : (
          <>
            <b>Drop images here or click to choose</b>
            <span>PNG, JPG or WebP · converted to WebP, max {MAX_WIDTH}px wide · one image shows alone, several become a carousel</span>
          </>
        )}
      </button>
    </div>
  );
}
