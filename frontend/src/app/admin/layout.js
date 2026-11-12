import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";

async function AuthenticatedAdmin({ children }) {
  await requireAdmin();
  return children;
}

export default function AdminLayout({ children }) {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-sm text-muted">Checking your session...</p>}>
      <AuthenticatedAdmin>{children}</AuthenticatedAdmin>
    </Suspense>
  );
}
