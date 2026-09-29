"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  PERITO: "Perito",
  VISUALIZADOR: "Visualizador"
};

export default function Navbar({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("light", nextTheme === "light");
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("sherlock-theme", nextTheme);
    setTheme(nextTheme);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="hidden text-sm text-gray-500 lg:block">
        Central de organização, rastreabilidade e correlação de perícia digital
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Ativar tema ${theme === "dark" ? "claro" : "escuro"}`}
          title={`Ativar tema ${theme === "dark" ? "claro" : "escuro"}`}
        >
          <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
          <span className="hidden sm:inline">{theme === "dark" ? "Claro" : "Escuro"}</span>
        </button>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-800">{name}</div>
          <div className="text-xs text-gray-500">{ROLE_LABEL[role] ?? role}</div>
        </div>
        <button onClick={handleLogout} className="btn-secondary text-xs py-1.5">
          Sair
        </button>
      </div>
    </header>
  );
}
