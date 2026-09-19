import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";

export const alt = `${profile.name} — ${profile.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#F7F5EE",
        color: "#161616",
        padding: 72,
        fontFamily: "sans-serif",
        border: "12px solid #161616",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 30 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 68,
            height: 68,
            background: "#FACC00",
            border: "4px solid #161616",
            borderRadius: 18,
            fontWeight: 700,
          }}
        >
          {profile.initials}
        </div>
        <div style={{ display: "flex" }}>{profile.location}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            fontSize: 108,
            fontWeight: 700,
            letterSpacing: -4,
            display: "flex",
          }}
        >
          {profile.name}
        </div>
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 700,
              background: "#FACC00",
              border: "4px solid #161616",
              borderRadius: 12,
              padding: "6px 18px",
            }}
          >
            {profile.role}
          </div>
        </div>
        <div
          style={{ fontSize: 30, display: "flex", maxWidth: 940 }}
        >{`${profile.headline.emphasis} ${profile.headline.tail}`}</div>
      </div>

      <div style={{ fontSize: 26, display: "flex" }}>{profile.email}</div>
    </div>,
    size,
  );
}
