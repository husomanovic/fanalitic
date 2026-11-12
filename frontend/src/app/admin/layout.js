import Admin from "@/components/Admin";

export const metadata = {
  title: "Admin | FanAnalitic",
  description: "FanAnalitic admin panel",
};

export default function AdminLayout({ children }) {
  return <Admin>{children}</Admin>;
}
