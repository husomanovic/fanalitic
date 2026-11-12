import { Suspense } from "react";
import Admin from "@/components/Admin";
import { requireAdmin } from "@/lib/auth";

export const metadata = {
  title: "Admin | FanAnalitic",
  description: "FanAnalitic admin panel",
};

async function AuthenticatedAdmin({ children }) {
  await requireAdmin();
  return <Admin>{children}</Admin>;
}

export default function AdminLayout({ children }) {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-sm text-muted">Checking your session...</p>}>
      <AuthenticatedAdmin>{children}</AuthenticatedAdmin>
    </Suspense>
  );
}
