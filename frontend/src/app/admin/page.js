import Admin from "@/components/Admin";
import { requireAdmin } from "@/lib/auth";

export const metadata = {
  title: "Admin | FanAnalitic",
  description: "FanAnalitic admin panel",
};

export default async function AdminPage() {
  await requireAdmin();
  return <Admin />;
}
