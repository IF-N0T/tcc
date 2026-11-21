import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/prefs";

export const metadata: Metadata = {
  title: "Sherlock — Plataforma de Perícia Digital",
  description: "Organização, rastreabilidade e correlação para perícia forense digital.",
  robots: { index: false, follow: false, noarchive: true },
  icons: {
    icon: "/sherlock-holmes.png",
    shortcut: "/sherlock-holmes.png",
    apple: "/sherlock-holmes.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get("x-nonce") ?? undefined;
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
