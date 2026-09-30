"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { uploadPhoto } from "@/app/admin/actions";
import { adminSrc } from "@/lib/admin/paths";
import { cropAround, formWith, kb, loadImage, toWebp } from "./image";
import { useToast } from "./Toasts";

// Must match `.site .portrait` in globals.css (aspect-ratio: 4 / 5, object-fit: cover).
const ASPECT = 4 / 5;
const WIDTH = 720;

/** Portrait: pick an image, click the face to set the focal point, save as a 4:5 WebP. */
export function PhotoCard({ photo }: { photo: { src: string; width: number; height: number } }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [focus, setFocus] = useState({ x: 0.5, y: 0.4 });
  const [busy, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (img) dialog.current?.showModal();
    else dialog.current?.close();
  }, [img]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImg(await loadImage(file));
      setFocus({ x: 0.5, y: 0.4 });
    } catch (e) {
      toast((e as Error).message, "error");
    }
    if (input.current) input.current.value = "";
  };

  const crop = img ? cropAround(img.naturalWidth, img.naturalHeight, ASPECT, focus.x, focus.y) : null;

  const save = () =>
    start(async () => {
      if (!img || !crop) return;
      try {
        const { blob, width, height } = await toWebp(img, { crop, maxWidth: WIDTH });
        const res = await uploadPhoto(formWith(blob, "portrait.webp"));
        if (!res.ok) return toast(res.error, "error");
        toast(`Portrait saved to the draft (${width}×${height}, ${kb(blob.size)})`);
        setImg(null);
        router.refresh();
      } catch (e) {
        toast((e as Error).message, "error");
      }
    });

  return (
    <section className="card">
      <div className="card__head">
        <h2>Photo</h2>
        <p>Exactly as the About section shows it: a 4:5 frame, about 386px wide on desktop.</p>
      </div>
      {/* The site's own markup and classes, so the frame, crop and shadow are identical. */}
      <div className="site photo-preview">
        <div className="portrait">
          <img src={adminSrc(photo.src)} alt="Current portrait" width={photo.width} height={photo.height} />
        </div>
      </div>
      <p className="muted" style={{ margin: "14px 0 10px" }}>
        {photo.src} · {photo.width}×{photo.height}
        {Math.abs(photo.width / photo.height - ASPECT) > 0.01 ? " · not 4:5, so the site trims the edges as shown" : ""}
      </p>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" className="btn" onClick={() => input.current?.click()}>
        Replace photo
      </button>

      <dialog ref={dialog} onClose={() => setImg(null)} aria-labelledby="crop-title">
        <h2 id="crop-title" style={{ fontSize: "1.125rem", marginBottom: 6 }}>
          Position the crop
        </h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Click where the face is; the 4:5 frame (the shape the site shows) centres on that point.
        </p>
        {img && crop ? (
          <div
            className="cropper"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setFocus({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
            }}
          >
            <img src={img.src} alt="New portrait" />
            <span
              className="cropper__frame"
              style={{
                left: `${(crop.x / img.naturalWidth) * 100}%`,
                top: `${(crop.y / img.naturalHeight) * 100}%`,
                width: `${(crop.w / img.naturalWidth) * 100}%`,
                height: `${(crop.h / img.naturalHeight) * 100}%`,
              }}
            />
          </div>
        ) : null}
        <div className="adm-actions" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btn btn--ghost" onClick={() => setImg(null)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--pri" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Use this crop"}
          </button>
        </div>
      </dialog>
    </section>
  );
}
