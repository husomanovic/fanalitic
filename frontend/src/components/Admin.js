import AdminSidebar from "@/components/AdminSidebar";
import AdminFooter from "@/components/AdminFooter";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "./Admin.module.css";

export default function Admin({ children }) {
  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <div className={styles.workspace}>
        <div className={styles.toolbar}>
          <ThemeToggle />
        </div>
        <main id="admin-content" className={styles.content} aria-label="Admin content">
          {children}
        </main>
        <AdminFooter />
      </div>
    </div>
  );
}
