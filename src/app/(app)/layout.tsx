import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={session.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar name={session.name} role={session.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
