import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Analytics } from "@vercel/analytics/next";
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

const siteTitle = "saaspocalypse - SaaS moat scanner for indie hackers";
const siteDescription =
  "Paste any SaaS URL. Get a wedge score, moat map, stack receipt, and a blunt read on where a small builder can attack.";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  metadataBase: new URL("https://www.saaspocalypse.dev"),
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    siteName: "saaspocalypse",
    images: [
      {
        url: "/images/saaspocalypse-og.png",
        width: 1200,
        height: 630,
        alt: siteTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/images/saaspocalypse-og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Nav />
        {children}
      </body>
      <Analytics />
    </html>
  );
}
