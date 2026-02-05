import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AdminNav />
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
