import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "saaspocalypse — can I build this myself?",
  description:
    "Paste any SaaS URL. We'll tell you if it's a weekend or a life sentence. Buildability score, stack receipt, time-to-clone, and a snarky one-liner.",
  metadataBase: new URL("https://saaspocalypse.com"),
  openGraph: {
    title: "saaspocalypse — can I build this myself?",
    description:
      "Paste any SaaS URL. We'll tell you if it's a weekend or a life sentence.",
    type: "website",
    siteName: "saaspocalypse",
  },
  twitter: {
    card: "summary_large_image",
    title: "saaspocalypse — can I build this myself?",
    description:
      "Paste any SaaS URL. We'll tell you if it's a weekend or a life sentence.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
