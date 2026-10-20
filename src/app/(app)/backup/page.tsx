import BacklogScreens from "@/components/backlog/BacklogScreens";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function BackupPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");
  return <BacklogScreens section="backup" />;
}
