import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { GraffitiProvider } from "./contexts/GraffitiContext";
import { ThemeProvider } from "./contexts/ThemeContext";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Graffiti",
  description: "Community-driven Graffiti Database",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icon.png', sizes: '256x256', type: 'image/png' },
    ],
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className}`}>
        <ThemeProvider>
          <GraffitiProvider>
            {children}
          </GraffitiProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
