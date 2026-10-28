import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import Providers from "@/components/ui/Providers";
import CommandPalette from "@/components/ui/CommandPalette";
import PresenceHeartbeat from "@/components/ui/PresenceHeartbeat";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <Providers>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role={session.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar name={session.name} role={session.role} />
          <main className="min-w-0 flex-1 p-4 md:p-8">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette />
      <PresenceHeartbeat />
    </Providers>
  );
}
