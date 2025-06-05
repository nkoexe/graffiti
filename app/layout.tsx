import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { GraffitiProvider } from "./contexts/GraffitiContext";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Graphiti",
  description: "Community-driven Graffiti Database",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className}`}>
        <GraffitiProvider>
          {children}
        </GraffitiProvider>
      </body>
    </html>
  );
}
