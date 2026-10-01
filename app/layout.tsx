import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TRIPORA — Cinematic AI-Powered Travel Experiences",
  description:
    "Explore the world's most breathtaking destinations through immersive cinematic visuals and AI-powered experiences designed to inspire your next journey.",
  keywords: [
    "Tripora",
    "AI travel platform",
    "cinematic travel experiences",
    "luxury travel technology",
    "immersive destination discovery",
    "intelligent itinerary planning",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${outfit.variable} ${geistMono.variable} dark antialiased`}
    >
      <body className="min-h-screen bg-[#09080B] text-[#FFF8FC] font-sans selection:bg-[#F3A6C8] selection:text-[#09080B] overflow-x-clip">
        {children}
      </body>
    </html>
  );
}
