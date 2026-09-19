import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import Cursor from "@/components/Cursor";
import SiteFX from "@/components/SiteFX";
import { profile } from "@/data/profile";
import { SITE_URL } from "@/lib/site";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const tagline = `${profile.headline.lead} ${profile.headline.emphasis} ${profile.headline.tail}`;
const title = `${profile.name} — ${profile.role}`;
const description = `${tagline} ${profile.about.lede}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: `%s — ${profile.name}` },
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, type: "profile" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5EE" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1B26" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={spaceGrotesk.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Cursor />
        <SiteFX />
      </body>
    </html>
  );
}
