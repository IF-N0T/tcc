import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sherlock — Plataforma de Perícia Digital",
  description: "Organização, rastreabilidade e correlação para perícia forense digital."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try { if (localStorage.getItem("sherlock-theme") === "light") document.documentElement.className = "light"; } catch {}`
          }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
