import type { Metadata, Viewport } from "next";
import { Orbitron, Inter } from "next/font/google";
import "./globals.css";
import ParticlesBg from "@/components/hud/ParticlesBg";
import BottomNav from "@/components/BottomNav";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "700", "900"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LONGEVITY",
  description: "Personal longevity HUD - the Outlive framework, automated.",
};

export const viewport: Viewport = {
  themeColor: "#03070d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable}`}>
      <body className="antialiased pb-20">
        <ParticlesBg />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
