import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboard from "../components/admin/AdminDashboard";
import { authCookieName, getAuthenticatedUser } from "../../lib/server/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản trị | FitCraft", robots: { index: false, follow: false } };
export default async function AdminPage() {
  const user = await getAuthenticatedUser(cookies().get(authCookieName)?.value);
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  return <AdminDashboard user={{ id: user.id, name: user.name, email: user.email }} />;
}

